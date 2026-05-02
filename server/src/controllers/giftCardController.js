import { matchedData } from 'express-validator';

import GiftCard from '../models/GiftCard.js';
import GiftCardTransaction from '../models/GiftCardTransaction.js';
import {
  calculateGiftCardApplication,
  generateGiftCardCode,
  normalizeGiftCardCode,
  serializeGiftCard,
} from '../services/giftCardService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildGiftCardPayload = async ({ initial_balance, expiry_date, status, session = null }) => {
  const code = await generateGiftCardCode(session);

  return {
    code,
    initial_balance: Number(initial_balance),
    current_balance: Number(initial_balance),
    status: status || 'active',
    expiry_date: expiry_date ? new Date(expiry_date) : null,
  };
};

export const getGiftCards = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status && ['active', 'inactive'].includes(String(req.query.status).toLowerCase())) {
    filter.status = String(req.query.status).toLowerCase();
  }

  if (req.query.code) {
    filter.code = new RegExp(escapeRegex(String(req.query.code).trim()), 'i');
  }

  const [giftCards, total] = await Promise.all([
    GiftCard.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit),
    GiftCard.countDocuments(filter),
  ]);

  res.status(200).json(
    buildPaginationResponse({
      page,
      limit,
      total,
      data: giftCards.map(serializeGiftCard),
    })
  );
});

export const createGiftCards = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });
  const quantity = Math.min(Math.max(Number(payload.quantity || 1), 1), 100);
  const createdCards = [];
  const codeSet = new Set();

  while (createdCards.length < quantity) {
    const giftCardPayload = await buildGiftCardPayload({
      initial_balance: payload.initial_balance,
      expiry_date: payload.expiry_date,
      status: payload.status,
    });

    if (codeSet.has(giftCardPayload.code)) {
      continue;
    }

    codeSet.add(giftCardPayload.code);
    createdCards.push(giftCardPayload);
  }

  const inserted = await GiftCard.insertMany(createdCards);

  res.status(201).json({
    message: quantity === 1 ? 'Gift card created' : 'Gift cards created',
    count: inserted.length,
    giftCards: inserted.map(serializeGiftCard),
  });
});

export const updateGiftCardStatus = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });
  const giftCard = await GiftCard.findById(req.params.id);

  if (!giftCard) {
    throw new ApiError(404, 'Gift card not found');
  }

  if (!payload.status) {
    throw new ApiError(400, 'Status is required');
  }

  giftCard.status = payload.status;
  await giftCard.save();

  res.status(200).json({
    message: 'Gift card updated',
    giftCard: serializeGiftCard(giftCard),
  });
});

export const deleteGiftCard = asyncHandler(async (req, res) => {
  const giftCard = await GiftCard.findById(req.params.id);

  if (!giftCard) {
    throw new ApiError(404, 'Gift card not found');
  }

  await GiftCardTransaction.deleteMany({ gift_card_id: giftCard._id });
  await giftCard.deleteOne();

  res.status(200).json({
    message: 'Gift card deleted',
  });
});

export const validateGiftCard = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });
  const normalizedCode = normalizeGiftCardCode(payload.code);
  const giftCard = await GiftCard.findOne({ code: normalizedCode });

  if (!giftCard) {
    throw new ApiError(404, 'Gift card not found');
  }

  if (giftCard.status !== 'active') {
    throw new ApiError(400, 'Gift card is inactive');
  }

  if (giftCard.isExpired()) {
    throw new ApiError(400, 'Gift card has expired');
  }

  if (Number(giftCard.current_balance || 0) <= 0) {
    throw new ApiError(400, 'Gift card has no available balance');
  }

  res.status(200).json({
    message: 'Gift card is valid',
    giftCard: serializeGiftCard(giftCard),
  });
});

export const applyGiftCard = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });
  const { giftCard, usedAmount, remainingPayable } = await calculateGiftCardApplication({
    code: payload.code,
    amount: payload.amount,
  });

  res.status(200).json({
    message: 'Gift card applied',
    giftCard: serializeGiftCard(giftCard),
    usedAmount,
    remainingPayable,
  });
});
