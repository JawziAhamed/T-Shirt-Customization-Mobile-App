import mongoose from 'mongoose';

import { REFUND_METHODS, RETURN_REASON_TYPES, RETURN_STATUS } from '../config/constants.js';

const returnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: '' },
    color: { type: String, default: '' },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Selected items to return (subset of order items)
    items: {
      type: [returnItemSchema],
      default: [],
    },
    // Structured reason type
    reasonType: {
      type: String,
      enum: RETURN_REASON_TYPES,
      required: true,
    },
    // Free-text reason for 'other' or additional context
    reason: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    // Optional extra description/comments
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    // Image proof (required for damaged_product and wrong_item)
    damagedImageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: RETURN_STATUS,
      default: 'pending',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    // Admin internal notes (not shown to customer)
    internalNotes: {
      type: String,
      default: '',
    },
    // Admin response visible to customer
    adminResponse: {
      type: String,
      default: '',
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundMethod: {
      type: String,
      enum: REFUND_METHODS,
      default: 'wallet',
    },
    refundTransactionRef: {
      type: String,
      default: '',
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);

export default ReturnRequest;
