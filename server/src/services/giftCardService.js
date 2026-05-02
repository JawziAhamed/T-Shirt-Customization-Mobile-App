import crypto from 'crypto';

import GiftCard from '../models/GiftCard.js';
import ApiError from '../utils/ApiError.js';

export const normalizeGiftCardCode = (code) => String(code || '').trim().toUpperCase();

export const isGiftCardExpired = (giftCard, now = new Date()) =>
  Boolean(giftCard?.expiry_date && giftCard.expiry_date <= now);

export const serializeGiftCard = (giftCard) => {
  if (!giftCard) return null;

  return {
    _id: String(giftCard._id),
    id: String(giftCard._id),
    code: giftCard.code,
    initialBalance: Number(giftCard.initial_balance || 0),
    currentBalance: Number(giftCard.current_balance || 0),
    status: giftCard.status,
    expiryDate: giftCard.expiry_date || null,
    createdAt: giftCard.created_at || null,
    updatedAt: giftCard.updated_at || null,
  };
};

export const assertGiftCardUsable = (giftCard, amount = 0) => {
  if (!giftCard) {
    throw new ApiError(404, 'Gift card not found');
  }

  if (giftCard.status !== 'active') {
    throw new ApiError(400, 'Gift card is inactive');
  }

  if (isGiftCardExpired(giftCard)) {
    throw new ApiError(400, 'Gift card has expired');
  }

  const payableAmount = Number(amount);
  if (!Number.isFinite(payableAmount) || payableAmount < 0) {
    throw new ApiError(400, 'Valid amount is required');
  }

  if (Number(giftCard.current_balance || 0) <= 0) {
    throw new ApiError(400, 'Gift card has no available balance');
  }
};

export const generateGiftCardCode = async (session = null) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `GC-${token.slice(0, 4)}-${token.slice(4, 8)}`;
    const existsQuery = GiftCard.exists({ code });

    if (session) {
      existsQuery.session(session);
    }

    const exists = await existsQuery;
    if (!exists) {
      return code;
    }
  }

  throw new ApiError(500, 'Unable to generate a unique gift card code');
};

export const calculateGiftCardApplication = async ({ code, amount, session = null }) => {
  const normalizedCode = normalizeGiftCardCode(code);
  if (!normalizedCode) {
    throw new ApiError(400, 'Gift card code is required');
  }

  const payableAmount = Number(amount);
  if (!Number.isFinite(payableAmount) || payableAmount < 0) {
    throw new ApiError(400, 'Valid payable amount is required');
  }

  const giftCardQuery = GiftCard.findOne({ code: normalizedCode });
  if (session) {
    giftCardQuery.session(session);
  }

  const giftCard = await giftCardQuery;
  assertGiftCardUsable(giftCard, payableAmount);

  const usedAmount = Number(Math.min(payableAmount, Number(giftCard.current_balance || 0)).toFixed(2));
  if (payableAmount > 0 && usedAmount <= 0) {
    throw new ApiError(400, 'Gift card has no available balance');
  }

  const remainingPayable = Number(Math.max(payableAmount - usedAmount, 0).toFixed(2));

  return {
    giftCard,
    normalizedCode,
    usedAmount,
    remainingPayable,
  };
};

export const reserveGiftCardBalance = async ({ code, amount, session }) => {
  if (!session) {
    throw new ApiError(500, 'Gift card reservation requires an active session');
  }

  const { giftCard, normalizedCode, usedAmount, remainingPayable } = await calculateGiftCardApplication({
    code,
    amount,
    session,
  });

  const updatedGiftCard = await GiftCard.findOneAndUpdate(
    {
      _id: giftCard._id,
      code: normalizedCode,
      status: 'active',
      current_balance: { $gte: usedAmount },
    },
    { $inc: { current_balance: -usedAmount } },
    { new: true, session }
  );

  if (!updatedGiftCard) {
    throw new ApiError(409, 'Gift card balance changed. Please try again.');
  }

  return {
    giftCard: updatedGiftCard,
    usedAmount,
    remainingPayable,
  };
};
