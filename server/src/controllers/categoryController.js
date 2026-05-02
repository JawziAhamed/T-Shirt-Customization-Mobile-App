import { matchedData } from 'express-validator';

import Category, { slugify } from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getCategories = asyncHandler(async (req, res) => {
  const active = req.query.active;
  const search = (req.query.search || '').trim();

  const filter = {};
  if (active === 'true') filter.isActive = true;
  if (active === 'false') filter.isActive = false;

  if (search) {
    const safePattern = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ name: safePattern }, { slug: safePattern }];
  }

  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 });

  res.status(200).json({
    data: categories,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const finalSlug = slugify(payload.slug || payload.name);
  if (!finalSlug) {
    throw new ApiError(422, 'Category slug could not be generated');
  }

  const existing = await Category.findOne({ slug: finalSlug });
  if (existing) {
    throw new ApiError(409, 'Category already exists');
  }

  const category = await Category.create({
    name: payload.name,
    slug: finalSlug,
    description: payload.description || '',
    sortOrder: payload.sortOrder ?? 0,
    isActive: payload.isActive ?? true,
  });

  res.status(201).json({
    message: 'Category created',
    category,
  });
});
