import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    newCustomersOnly: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    promotionalAlert: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

promoCodeSchema.methods.isValidNow = function isValidNow(orderValue, options = {}) {
  const { isNewCustomer = false } = options;
  const notExpired = !this.expiresAt || this.expiresAt > new Date();
  const underLimit = !this.usageLimit || this.usedCount < this.usageLimit;
  const meetsMinOrder = orderValue >= this.minOrderValue;
  const meetsCustomerCondition = !this.newCustomersOnly || isNewCustomer;

  return this.isActive && notExpired && underLimit && meetsMinOrder && meetsCustomerCondition;
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;
