import mongoose from 'mongoose';

import { GIFT_CARD_STATUSES } from '../config/constants.js';

const giftCardSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    initial_balance: {
      type: Number,
      required: true,
      min: 0,
    },
    current_balance: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: GIFT_CARD_STATUSES,
      default: 'active',
    },
    expiry_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

giftCardSchema.methods.isExpired = function isExpired(now = new Date()) {
  return Boolean(this.expiry_date && this.expiry_date <= now);
};

giftCardSchema.methods.isUsable = function isUsable(amount = 0) {
  const payableAmount = Number(amount);
  return (
    this.status === 'active' &&
    !this.isExpired() &&
    Number.isFinite(payableAmount) &&
    payableAmount > 0 &&
    Number(this.current_balance || 0) > 0
  );
};

giftCardSchema.index({ status: 1, expiry_date: 1, created_at: -1 });

const GiftCard = mongoose.model('GiftCard', giftCardSchema);

export default GiftCard;
