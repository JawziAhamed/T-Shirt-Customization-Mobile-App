import { matchedData } from 'express-validator';

import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import { evaluateLowStockAlertState, notifyLowStockForRoles } from '../services/lowStockService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

export const getInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const lowStockOnly = req.query.lowStock === 'true';

  const [records, total] = await Promise.all([
    Inventory.find()
      .populate('product', 'name category imageUrl basePrice')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Inventory.countDocuments(),
  ]);

  const data = lowStockOnly
    ? records.filter((record) => record.stock <= record.lowStockThreshold)
    : records;

  res.status(200).json(buildPaginationResponse({ page, limit, total, data }));
});

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const inventory = await Inventory.findById(req.params.id).populate('product');

  if (!inventory) {
    throw new ApiError(404, 'Inventory record not found');
  }

  if (payload.stock !== undefined) {
    inventory.stock = Number(payload.stock);
  }

  if (payload.lowStockThreshold !== undefined) {
    inventory.lowStockThreshold = Number(payload.lowStockThreshold);
  }

  if (payload.restocked === true) {
    inventory.lastRestockedAt = new Date();
  }

  const lowStockState = evaluateLowStockAlertState(inventory);
  await inventory.save();

  if (lowStockState.shouldNotify) {
    await notifyLowStockForRoles({
      productName: inventory.product?.name,
      stock: inventory.stock,
      threshold: inventory.lowStockThreshold,
      productId: inventory.product?._id,
      inventoryId: inventory._id,
    });
  }

  res.status(200).json({
    message: 'Inventory updated',
    inventory,
  });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const product = await Product.findById(payload.productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  const inventory = await Inventory.findOne({ product: product._id });
  if (!inventory) {
    throw new ApiError(404, 'Inventory record not found');
  }

  inventory.stock = Math.max(inventory.stock + Number(payload.changeBy), 0);
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

  res.status(200).json({
    message: 'Stock adjusted',
    inventory,
  });
});

export const lowStockAlerts = asyncHandler(async (req, res) => {
  const lowStockItems = await Inventory.find({
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  }).populate('product', 'name category imageUrl');

  res.status(200).json({
    count: lowStockItems.length,
    data: lowStockItems,
  });
});
