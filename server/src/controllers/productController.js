import Product from '../models/Product.js';
import Category, { slugify } from '../models/Category.js';
import Inventory from '../models/Inventory.js';
import { storeProductImage } from '../services/imageUploadService.js';
import { evaluateLowStockAlertState, notifyLowStockForRoles } from '../services/lowStockService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;
const DEFAULT_CATEGORY_SLUG = 'regular-products';
const DEFAULT_CATEGORY_NAME = 'Regular Products';

const parseArrayInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseSizesInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    return [];
  }

  return [];
};

const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';

  return defaultValue;
};

const normalizePath = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

const isMongoId = (value) => MONGO_ID_REGEX.test(String(value));

const toCategoryName = (value = '') =>
  String(value)
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const createCategoryWithRetry = async (name, slug) => {
  try {
    return await Category.create({ name, slug });
  } catch (error) {
    if (error?.code === 11000) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return existingCategory;
      }
    }

    throw error;
  }
};

const ensureDefaultCategory = async () => {
  let category = await Category.findOne({ slug: DEFAULT_CATEGORY_SLUG });

  if (!category) {
    category = await createCategoryWithRetry(DEFAULT_CATEGORY_NAME, DEFAULT_CATEGORY_SLUG);
  }

  return category;
};

const resolveCategoryDocs = async (rawValues = []) => {
  const values = [...new Set(rawValues.map((value) => String(value).trim()).filter(Boolean))];
  if (!values.length) return [];

  const categoryIds = values.filter(isMongoId);
  const categoryTokens = values.filter((value) => !isMongoId(value));

  const resolvedMap = new Map();

  if (categoryIds.length) {
    const categoriesById = await Category.find({ _id: { $in: categoryIds } });

    if (categoriesById.length !== categoryIds.length) {
      throw new ApiError(422, 'One or more selected categories are invalid');
    }

    categoriesById.forEach((category) => {
      resolvedMap.set(String(category._id), category);
    });
  }

  if (categoryTokens.length) {
    const tokenSlugs = [...new Set(categoryTokens.map((token) => slugify(token)).filter(Boolean))];
    const existingCategories = tokenSlugs.length
      ? await Category.find({
          slug: { $in: tokenSlugs },
        })
      : [];

    const existingBySlug = new Map(existingCategories.map((category) => [category.slug, category]));

    for (const token of categoryTokens) {
      const tokenSlug = slugify(token);
      if (!tokenSlug) continue;

      let category = existingBySlug.get(tokenSlug);
      if (!category) {
        category = await createCategoryWithRetry(toCategoryName(token), tokenSlug);
        existingBySlug.set(tokenSlug, category);
      }

      resolvedMap.set(String(category._id), category);
    }
  }

  return [...resolvedMap.values()];
};

const resolveProductCategories = async (payload, { fallbackToDefault = false } = {}) => {
  const rawCategoryValues = [
    ...parseArrayInput(payload.categories),
    ...(payload.category !== undefined ? [payload.category] : []),
  ];

  let categoryDocs = await resolveCategoryDocs(rawCategoryValues);
  if (!categoryDocs.length && fallbackToDefault) {
    categoryDocs = [await ensureDefaultCategory()];
  }

  if (!categoryDocs.length) {
    return {
      category: 'custom-tshirt',
      categories: [],
    };
  }

  return {
    category: categoryDocs[0].slug,
    categories: categoryDocs.map((category) => category._id),
  };
};

const applyCategoryFilter = async (filter, categoryQuery) => {
  const values = parseArrayInput(categoryQuery).map((value) => String(value).trim()).filter(Boolean);
  if (!values.length) return;

  const ids = values.filter(isMongoId);
  const slugs = [...new Set(values.map((value) => slugify(value)).filter(Boolean))];
  const categoryLookupFilters = [
    ...(ids.length ? [{ _id: { $in: ids } }] : []),
    ...(slugs.length ? [{ slug: { $in: slugs } }] : []),
  ];

  const matchedCategories = categoryLookupFilters.length
    ? await Category.find({ $or: categoryLookupFilters }).select('_id slug')
    : [];

  const matchedIds = [...new Set(matchedCategories.map((category) => String(category._id)))];
  const matchedSlugs = [...new Set(matchedCategories.map((category) => category.slug))];

  if (!matchedIds.length && !matchedSlugs.length) {
    filter.category = { $in: slugs.length ? slugs : values };
    return;
  }

  const categoryFilters = [];
  if (matchedIds.length) {
    categoryFilters.push({ categories: { $in: matchedIds } });
  }
  if (matchedSlugs.length) {
    categoryFilters.push({ category: { $in: matchedSlugs } });
  }

  filter.$or = categoryFilters;
};

export const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = (req.query.search || '').trim();
  const category = (req.query.category || '').trim();
  const color = (req.query.color || '').trim();
  const activeOnly = req.query.active !== 'false';

  const filter = {};
  if (activeOnly) {
    filter.isActive = true;
  }
  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    await applyCategoryFilter(filter, category);
  }
  if (color) {
    filter.colors = { $in: [color] };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: products }));
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('categories', 'name slug');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const inventory = await Inventory.findOne({ product: product._id });

  res.status(200).json({
    product,
    inventory,
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = req.body;

  const imageUrl = req.file ? await storeProductImage(req.file) : normalizePath(payload.imageUrl);
  const categoryPayload = await resolveProductCategories(payload, { fallbackToDefault: true });

  const product = await Product.create({
    name: payload.name,
    description: payload.description,
    category: categoryPayload.category,
    categories: categoryPayload.categories,
    basePrice: Number(payload.basePrice),
    colors: parseArrayInput(payload.colors),
    sizes: parseSizesInput(payload.sizes),
    defaultTemplates: parseArrayInput(payload.defaultTemplates),
    gallery: parseArrayInput(payload.gallery),
    customArtworkAllowed: parseBoolean(payload.customArtworkAllowed, true),
    imageUrl: normalizePath(imageUrl),
    tags: parseArrayInput(payload.tags),
    isActive: parseBoolean(payload.isActive, true),
  });

  const initialStock = Number(payload.stock || 0);
  const initialThreshold = Number(payload.lowStockThreshold || 10);
  const isLowAtCreation = initialStock <= initialThreshold;

  const inventory = await Inventory.create({
    product: product._id,
    stock: initialStock,
    lowStockThreshold: initialThreshold,
    lowStockAlertActive: isLowAtCreation,
    lastLowStockAlertAt: isLowAtCreation ? new Date() : null,
  });

  if (isLowAtCreation) {
    await notifyLowStockForRoles({
      productName: product.name,
      stock: inventory.stock,
      threshold: inventory.lowStockThreshold,
      productId: product._id,
      inventoryId: inventory._id,
    });
  }

  const populatedProduct = await Product.findById(product._id).populate('categories', 'name slug');

  res.status(201).json({
    message: 'Product created',
    product: populatedProduct,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const payload = req.body;

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  if (payload.name !== undefined) product.name = payload.name;
  if (payload.description !== undefined) product.description = payload.description;
  if (payload.basePrice !== undefined) product.basePrice = Number(payload.basePrice);
  if (payload.colors !== undefined) product.colors = parseArrayInput(payload.colors);
  if (payload.sizes !== undefined) product.sizes = parseSizesInput(payload.sizes);
  if (payload.defaultTemplates !== undefined) {
    product.defaultTemplates = parseArrayInput(payload.defaultTemplates);
  }
  if (payload.gallery !== undefined) product.gallery = parseArrayInput(payload.gallery);
  if (payload.customArtworkAllowed !== undefined) {
    product.customArtworkAllowed = parseBoolean(payload.customArtworkAllowed, product.customArtworkAllowed);
  }
  if (payload.tags !== undefined) product.tags = parseArrayInput(payload.tags);
  if (payload.isActive !== undefined) {
    product.isActive = parseBoolean(payload.isActive, product.isActive);
  }
  if (payload.category !== undefined || payload.categories !== undefined) {
    const resolvedCategories = await resolveProductCategories(payload, { fallbackToDefault: false });
    product.category = resolvedCategories.category;
    product.categories = resolvedCategories.categories;
  }

  if (req.file) {
    product.imageUrl = normalizePath(await storeProductImage(req.file));
  } else if (payload.imageUrl !== undefined) {
    product.imageUrl = normalizePath(payload.imageUrl);
  }

  await product.save();

  const inventory = await Inventory.findOne({ product: product._id });
  if (inventory) {
    if (payload.stock !== undefined) inventory.stock = Number(payload.stock);
    if (payload.lowStockThreshold !== undefined) {
      inventory.lowStockThreshold = Number(payload.lowStockThreshold);
    }

    const lowStockState = evaluateLowStockAlertState(inventory);
    await inventory.save();

    if (lowStockState.shouldNotify) {
      await notifyLowStockForRoles({
        productName: product.name,
        stock: inventory.stock,
        threshold: inventory.lowStockThreshold,
        productId: product._id,
        inventoryId: inventory._id,
      });
    }
  }

  const populatedProduct = await Product.findById(product._id).populate('categories', 'name slug');

  res.status(200).json({
    message: 'Product updated',
    product: populatedProduct,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await Promise.all([
    Product.deleteOne({ _id: product._id }),
    Inventory.deleteOne({ product: product._id }),
  ]);

  res.status(200).json({
    message: 'Product deleted',
  });
});
