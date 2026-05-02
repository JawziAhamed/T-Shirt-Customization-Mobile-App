import ReturnRequest from '../models/ReturnRequest.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Inventory from '../models/Inventory.js';
import { ROLES } from '../config/constants.js';
import { evaluateLowStockAlertState, notifyLowStockForRoles } from '../services/lowStockService.js';
import emailService from '../services/emailService.js';
import { createNotification, notifyRoles } from '../services/notificationService.js';
import { storeCustomizationImage } from '../services/imageUploadService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

const getOrderCode = (orderId) => String(orderId || '').slice(-8).toUpperCase();

// Reasons that require image proof
const IMAGE_REQUIRED_REASONS = ['damaged_product', 'wrong_item'];

export const createReturnRequest = asyncHandler(async (req, res) => {
  const { orderId, reasonType, reason, description } = req.body;

  if (!orderId) throw new ApiError(400, 'orderId is required');
  if (!reasonType) throw new ApiError(400, 'reasonType is required');

  const validReasonTypes = ['damaged_product', 'wrong_item', 'not_satisfied', 'other'];
  if (!validReasonTypes.includes(reasonType)) {
    throw new ApiError(400, `reasonType must be one of: ${validReasonTypes.join(', ')}`);
  }

  if (reasonType === 'other' && (!reason || reason.trim().length < 10)) {
    throw new ApiError(400, 'Please provide a reason of at least 10 characters when selecting "Other"');
  }

  if (IMAGE_REQUIRED_REASONS.includes(reasonType) && !req.file) {
    throw new ApiError(400, `Image proof is required for reason: ${reasonType.replace(/_/g, ' ')}`);
  }

  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  if (String(order.user) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only request returns for your own orders');
  }

  const existing = await ReturnRequest.findOne({
    order: order._id,
    user: req.user._id,
    status: { $in: ['pending', 'approved', 'picked_up'] },
  });
  if (existing) {
    throw new ApiError(409, 'An active return request already exists for this order');
  }

  // Upload image if provided
  let damagedImageUrl = '';
  if (req.file) {
    damagedImageUrl = await storeCustomizationImage(req.file, 'return');
  }

  // Parse items from body (JSON string array or individual fields)
  let items = [];
  try {
    const rawItems = req.body.items;
    if (rawItems) {
      items = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
    }
  } catch {
    items = [];
  }

  // If no items provided, default to all order items
  if (!items.length) {
    items = order.items.map((i) => ({
      product: i.product,
      productName: i.productName,
      quantity: i.quantity,
      size: i.size || '',
      color: i.color || '',
      unitPrice: i.unitPrice || 0,
    }));
  }

  const returnRequest = await ReturnRequest.create({
    order: order._id,
    user: req.user._id,
    items,
    reasonType,
    reason: reason || '',
    description: description || '',
    damagedImageUrl,
    refundAmount: order.total,
    statusHistory: [
      {
        status: 'pending',
        note: 'Return request submitted by customer',
        changedBy: req.user._id,
        changedAt: new Date(),
      },
    ],
  });

  const orderCode = getOrderCode(order._id);

  await createNotification({
    userId: req.user._id,
    title: `Return request submitted (#${orderCode})`,
    message: `Your return request for order #${orderCode} has been submitted and is pending review.`,
    type: 'return',
    link: '/dashboard/returns',
    metadata: { returnRequestId: String(returnRequest._id), orderId: String(order._id), status: 'pending' },
  });

  await notifyRoles({
    roles: [ROLES.ADMIN, ROLES.STAFF],
    title: `New return request (#${orderCode})`,
    message: `${req.user.name || 'A customer'} submitted a return request for order #${orderCode}.`,
    type: 'return',
    link: '/admin/returns-complaints',
    metadata: { returnRequestId: String(returnRequest._id), orderId: String(order._id), status: 'pending' },
  });

  await emailService.sendReturnConfirmationEmail(req.user, returnRequest, order);

  res.status(201).json({
    message: 'Return request submitted',
    returnRequest,
  });
});

export const getMyReturnRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [requests, total] = await Promise.all([
    ReturnRequest.find({ user: req.user._id })
      .populate('order', 'status total createdAt items')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ReturnRequest.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: requests }));
});

export const getReturnRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, from, to } = req.query;

  const filter = {};
  if (status) filter.status = status;

  // Date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  let query = ReturnRequest.find(filter)
    .populate('order', 'status total')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  // Apply customer name search after populate
  const [allRequests, total] = await Promise.all([
    query.skip(skip).limit(limit),
    ReturnRequest.countDocuments(filter),
  ]);

  // Filter by customer name search (post-populate)
  let requests = allRequests;
  if (search) {
    const lower = search.toLowerCase();
    requests = allRequests.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(lower) ||
        r.user?.email?.toLowerCase().includes(lower) ||
        r._id.toString().includes(lower)
    );
  }

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: requests }));
});

export const updateReturnRequest = asyncHandler(async (req, res) => {
  const { status, adminResponse, internalNotes, refundAmount, refundMethod, refundTransactionRef } = req.body;

  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate('order')
    .populate('user');

  if (!returnRequest) throw new ApiError(404, 'Return request not found');

  const previousStatus = returnRequest.status;

  if (status && status !== previousStatus) {
    returnRequest.status = status;
    returnRequest.statusHistory.push({
      status,
      note: req.body.statusNote || '',
      changedBy: req.user._id,
      changedAt: new Date(),
    });
  }

  if (adminResponse !== undefined) returnRequest.adminResponse = adminResponse;
  if (internalNotes !== undefined) returnRequest.internalNotes = internalNotes;
  if (refundAmount !== undefined) returnRequest.refundAmount = Number(refundAmount);
  if (refundMethod !== undefined) returnRequest.refundMethod = refundMethod;
  if (refundTransactionRef !== undefined) returnRequest.refundTransactionRef = refundTransactionRef;

  // Status-specific logic
  if (status === 'approved' && previousStatus !== 'approved') {
    returnRequest.order.status = 'returned';
    await returnRequest.order.save();

    // Restock returned items
    for (const item of returnRequest.order.items) {
      const inventory = await Inventory.findOne({ product: item.product });
      if (inventory) {
        inventory.stock += Number(item.quantity || 0);
        const lowStockState = evaluateLowStockAlertState(inventory);
        await inventory.save();
        if (lowStockState.shouldNotify) {
          await notifyLowStockForRoles({
            productName: item.productName,
            stock: inventory.stock,
            threshold: inventory.lowStockThreshold,
            productId: item.product,
            inventoryId: inventory._id,
          });
        }
      }
    }
  }

  if (status === 'picked_up' && previousStatus !== 'picked_up') {
    returnRequest.pickedUpAt = new Date();
  }

  if (status === 'refunded' && previousStatus !== 'refunded') {
    returnRequest.refundedAt = new Date();
    const refund = Number(refundAmount ?? returnRequest.refundAmount ?? returnRequest.order.total);

    if (returnRequest.refundMethod === 'wallet' || !returnRequest.refundMethod) {
      const user = await User.findById(returnRequest.user._id);
      user.walletBalance = Number((user.walletBalance + refund).toFixed(2));
      await user.save();

      returnRequest.order.paymentStatus = 'refunded';
      returnRequest.order.refundedToWallet = Number(
        (returnRequest.order.refundedToWallet + refund).toFixed(2)
      );
      await returnRequest.order.save();
    }

    await Payment.create({
      order: returnRequest.order._id,
      user: returnRequest.user._id,
      method: 'wallet_refund',
      amount: refund,
      status: 'refunded',
      transactionRef: refundTransactionRef || `REF-${Date.now()}`,
      notes: `Refund processed via ${returnRequest.refundMethod || 'wallet'}`,
    });
  }

  await returnRequest.save();

  // Notify customer on status change
  if (status && status !== previousStatus) {
    const orderCode = getOrderCode(returnRequest.order._id);
    const statusMessages = {
      approved: `Your return request for order #${orderCode} has been approved.`,
      rejected: `Your return request for order #${orderCode} was rejected.`,
      picked_up: `Your return item for order #${orderCode} has been picked up.`,
      refunded: `Refund for order #${orderCode} has been processed (${returnRequest.refundMethod?.replace(/_/g, ' ') || 'wallet'}).`,
    };

    const notifMessage = statusMessages[status] || `Your return request for order #${orderCode} is now ${status.replace(/_/g, ' ')}.`;
    const notifType = status === 'refunded' ? 'refund' : 'return';

    await createNotification({
      userId: returnRequest.user._id,
      title: `Return update (#${orderCode})`,
      message: notifMessage,
      type: notifType,
      link: '/dashboard/returns',
      metadata: { returnRequestId: String(returnRequest._id), orderId: String(returnRequest.order._id), status },
    });
  }

  res.status(200).json({
    message: 'Return request updated',
    returnRequest,
  });
});
