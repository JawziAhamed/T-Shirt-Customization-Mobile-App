import { matchedData } from 'express-validator';

import PromoCode from '../models/PromoCode.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import { createNotificationsForUsers } from '../services/notificationService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

export const getPromoCodes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const active = req.query.active;

  const filter = {};
  if (active === 'true') filter.isActive = true;

  const [promos, total] = await Promise.all([
    PromoCode.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PromoCode.countDocuments(filter),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: promos }));
});

export const createPromoCode = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const exists = await PromoCode.findOne({ code: payload.code.toUpperCase() });
  if (exists) {
    throw new ApiError(409, 'Promo code already exists');
  }

  const promo = await PromoCode.create({
    code: payload.code,
    description: payload.description || '',
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    minOrderValue: payload.minOrderValue || 0,
    maxDiscount: payload.maxDiscount ?? null,
    usageLimit: payload.usageLimit ?? null,
    expiresAt: payload.expiresAt || null,
    isActive: payload.isActive ?? true,
    newCustomersOnly: payload.newCustomersOnly ?? false,
    promotionalAlert: payload.promotionalAlert || '',
  });

  res.status(201).json({
    message: 'Promo code created',
    promo,
  });
});

export const updatePromoCode = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const promo = await PromoCode.findById(req.params.id);
  if (!promo) {
    throw new ApiError(404, 'Promo code not found');
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      promo[key] = value;
    }
  });

  await promo.save();

  res.status(200).json({
    message: 'Promo code updated',
    promo,
  });
});

export const deletePromoCode = asyncHandler(async (req, res) => {
  const promo = await PromoCode.findById(req.params.id);
  if (!promo) {
    throw new ApiError(404, 'Promo code not found');
  }

  await promo.deleteOne();

  res.status(200).json({
    message: 'Promo code deleted',
  });
});

export const sendPromotionalAlert = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const users = await User.find({}, 'email name');
  await emailService.sendPromotionalAlert(users, payload.message);

  await createNotificationsForUsers(
    users.map((user) => user._id),
    {
      title: 'New promotional offer',
      message: payload.message,
      type: 'promotion',
      link: '/products',
    }
  );

  res.status(200).json({
    message: 'Promotional alerts sent',
    recipients: users.length,
  });
});
