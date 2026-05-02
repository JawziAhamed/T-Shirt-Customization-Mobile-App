import mongoose from 'mongoose';

import { ORDER_STATUS, PAYMENT_METHODS } from '../config/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    size: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '',
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    baseProductImage: {
      type: String,
      default: '',
    },
    customPreviewImage: {
      type: String,
      default: '',
    },
    customization: {
      shirtColor: {
        type: String,
        default: '#FFFFFF',
      },
      logoDecal: {
        type: String,
        default: '',
      },
      fullDecal: {
        type: String,
        default: '',
      },
      customArtworkUrl: {
        type: String,
        default: '',
      },
      baseProductImage: {
        type: String,
        default: '',
      },
      customPreviewImage: {
        type: String,
        default: '',
      },
      logoPlacement: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0.04 },
        scale: { type: Number, default: 0.15 },
        rotation: { type: Number, default: 0 },
      },
      note: {
        type: String,
        default: '',
      },
    },
  },
  { _id: false }
);

const installmentSchema = new mongoose.Schema(
  {
    installmentNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    promoCode: {
      type: String,
      default: '',
    },
    promoDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    giftCardCode: {
      type: String,
      default: '',
    },
    giftCardAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ORDER_STATUS,
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'refunded'],
      default: 'pending',
    },
    installmentPlan: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      firstPaymentAmount: {
        type: Number,
        default: 0,
      },
      installments: {
        type: [installmentSchema],
        default: [],
      },
    },
    refundedToWallet: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
