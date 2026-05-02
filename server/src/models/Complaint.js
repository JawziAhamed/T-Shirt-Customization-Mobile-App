import mongoose from 'mongoose';

import { COMPLAINT_STATUS } from '../config/constants.js';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'staff', 'admin'],
      required: true,
    },
    senderName: { type: String, default: '' },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const complaintSchema = new mongoose.Schema(
  {
    // Auto-generated human-readable ID e.g. COMP-00123
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    subject: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    // Optional file attachment
    attachmentUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: COMPLAINT_STATUS,
      default: 'open',
    },
    // Threaded messages between customer and admin/staff
    messages: {
      type: [messageSchema],
      default: [],
    },
    // Legacy single admin response kept for backward compat
    adminResponse: {
      type: String,
      default: '',
    },
    // Staff member assigned to handle this complaint
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate complaintId before saving
complaintSchema.pre('save', async function (next) {
  if (!this.complaintId) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `COMP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
