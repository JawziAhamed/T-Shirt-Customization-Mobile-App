import mongoose from 'mongoose';

import GiftCardTransaction from '../models/GiftCardTransaction.js';
import Inventory from '../models/Inventory.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import PromoCode from '../models/PromoCode.js';
import { ROLES } from '../config/constants.js';
import { buildInstallmentPlan } from '../services/paymentService.js';
import { calculateDeliveryFee } from '../services/deliveryService.js';
import emailService from '../services/emailService.js';
import { storeCustomizationImage } from '../services/imageUploadService.js';
import { evaluateLowStockAlertState, notifyLowStockForRoles } from '../services/lowStockService.js';
import { createNotification, notifyRoles } from '../services/notificationService.js';
import { calculateGiftCardApplication, normalizeGiftCardCode, reserveGiftCardBalance } from '../services/giftCardService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

const calculateItemPrice = (product, sizeLabel = '') => {
  const size = product.sizes.find(
    (entry) => String(entry.size).toLowerCase() === String(sizeLabel).toLowerCase()
  );

  const modifier = size ? Number(size.priceModifier || 0) : 0;
  return Number(product.basePrice) + modifier;
};

const getOrderCode = (orderId) => String(orderId || '').slice(-8).toUpperCase();

const getStatusLabel = (status = '') => {
  const value = String(status).toLowerCase();
  if (value === 'processing') return 'processing/printing';
  return value || 'updated';
};

const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const SUPPORTED_IMAGE_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};
const MAX_CUSTOM_IMAGE_BYTES = 5 * 1024 * 1024;

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSafeString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
};

const isRemoteOrLocalUrl = (value = '') =>
  /^https?:\/\//i.test(value) || value.startsWith('/uploads/');

const toHexColor = (value, fallback = '#FFFFFF') => {
  const input = toSafeString(value, fallback);
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(input) ? input : fallback;
};

const sanitizeLogoPlacement = (placement) => {
  const source = placement && typeof placement === 'object' ? placement : {};

  return {
    x: Math.max(-0.5, Math.min(0.5, toSafeNumber(source.x, 0))),
    y: Math.max(-0.2, Math.min(0.35, toSafeNumber(source.y, 0.04))),
    scale: Math.max(0.05, Math.min(0.5, toSafeNumber(source.scale, 0.15))),
    rotation: Math.max(-180, Math.min(180, toSafeNumber(source.rotation, 0))),
  };
};

const toUploadFileFromDataUrl = (dataUrl, prefix) => {
  if (typeof dataUrl !== 'string') return null;
  const trimmed = dataUrl.trim();
  const match = trimmed.match(DATA_URL_REGEX);
  if (!match) return null;

  const mimeType = String(match[1] || '').toLowerCase();
  if (!SUPPORTED_IMAGE_EXTENSIONS[mimeType]) {
    throw new ApiError(400, `Unsupported customization image type: ${mimeType}`);
  }

  let buffer;
  try {
    buffer = Buffer.from(match[2], 'base64');
  } catch (error) {
    throw new ApiError(400, 'Invalid customization image encoding');
  }

  if (!buffer?.length) {
    throw new ApiError(400, 'Customization image is empty');
  }

  if (buffer.length > MAX_CUSTOM_IMAGE_BYTES) {
    throw new ApiError(413, 'Customization image exceeds 5MB size limit');
  }

  const extension = SUPPORTED_IMAGE_EXTENSIONS[mimeType];

  return {
    buffer,
    mimetype: mimeType,
    originalname: `${prefix}-${Date.now()}.${extension}`,
    size: buffer.length,
  };
};

const persistCustomizationImageField = async (value, prefix) => {
  const input = toSafeString(value, '');
  if (!input) return '';

  if (isRemoteOrLocalUrl(input)) {
    return input;
  }

  const file = toUploadFileFromDataUrl(input, prefix);
  if (!file) return '';

  return storeCustomizationImage(file, prefix);
};

const prepareCustomizationForOrderItem = async ({
  customization,
  productImageUrl,
  fallbackArtworkUrl,
}) => {
  const source = customization && typeof customization === 'object' ? customization : {};
  const [logoDecal, fullDecal, customArtworkUrl, customPreviewImage] = await Promise.all([
    persistCustomizationImageField(source.logoDecal, 'logo'),
    persistCustomizationImageField(source.fullDecal, 'full'),
    persistCustomizationImageField(source.customArtworkUrl, 'artwork'),
    persistCustomizationImageField(source.customPreviewImage, 'preview'),
  ]);

  const baseProductImage = toSafeString(source.baseProductImage || productImageUrl, '');
  const note = toSafeString(source.note, '').slice(0, 700);
  const logoPlacement = sanitizeLogoPlacement(source.logoPlacement);

  return {
    shirtColor: toHexColor(source.shirtColor, '#FFFFFF'),
    logoDecal,
    fullDecal,
    customArtworkUrl: customArtworkUrl || toSafeString(fallbackArtworkUrl, ''),
    baseProductImage,
    customPreviewImage,
    logoPlacement,
    note,
  };
};

const applyPromo = async (promoCode, subtotal, userId) => {
  if (!promoCode) {
    return { promoDiscount: 0, promoDoc: null };
  }

  const normalizedCode = String(promoCode).trim().toUpperCase();
  const promo = await PromoCode.findOne({ code: normalizedCode });
  if (!promo) {
    throw new ApiError(400, 'Promo code does not exist');
  }

  let isNewCustomer = true;
  if (promo?.newCustomersOnly) {
    const existingOrderCount = await Order.countDocuments({ user: userId });
    isNewCustomer = existingOrderCount === 0;
  }

  if (!promo.isActive) {
    throw new ApiError(400, 'Promo code is not active');
  }

  if (promo.expiresAt && promo.expiresAt <= new Date()) {
    throw new ApiError(400, 'Promo code has expired');
  }

  if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
    throw new ApiError(400, 'Promo code usage limit has been reached');
  }

  if (subtotal < promo.minOrderValue) {
    throw new ApiError(400, `Promo requires minimum order amount of ${promo.minOrderValue}`);
  }

  if (promo.newCustomersOnly && !isNewCustomer) {
    throw new ApiError(400, 'Promo is only available for new customers');
  }

  let discount = 0;
  if (promo.discountType === 'percent') {
    discount = (subtotal * promo.discountValue) / 100;
    if (promo.maxDiscount) {
      discount = Math.min(discount, promo.maxDiscount);
    }
  } else {
    discount = promo.discountValue;
  }

  discount = Number(Math.min(discount, subtotal).toFixed(2));

  return { promoDiscount: discount, promoDoc: promo };
};

const buildOrderBreakdown = async ({ userId, items, deliveryAddress, promoCode, session = null }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one order item is required');
  }

  const preparedItems = [];
  const inventoryUpdatesMap = new Map();

  let subtotal = 0;

  for (const item of items) {
    const productQuery = Product.findById(item.productId);
    if (session) {
      productQuery.session(session);
    }

    const product = await productQuery;
    if (!product || !product.isActive) {
      throw new ApiError(404, `Product unavailable: ${item.productId}`);
    }

    const inventoryQuery = Inventory.findOne({ product: product._id });
    if (session) {
      inventoryQuery.session(session);
    }

    const inventory = await inventoryQuery;
    const quantity = Number(item.quantity || 1);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, `Invalid quantity for ${product.name}`);
    }

    if (!inventory) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    const inventoryKey = String(inventory._id);
    const existingUpdate = inventoryUpdatesMap.get(inventoryKey);
    const requestedQuantity = quantity + Number(existingUpdate?.quantity || 0);

    if (inventory.stock < requestedQuantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    inventoryUpdatesMap.set(inventoryKey, {
      inventory: existingUpdate?.inventory || inventory,
      quantity: requestedQuantity,
      productId: product._id,
      productName: product.name,
    });

    const unitPrice = calculateItemPrice(product, item.size);
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    subtotal += totalPrice;

    preparedItems.push({
      product: product._id,
      productName: product.name,
      quantity,
      size: item.size || '',
      color: item.color || '',
      unitPrice,
      totalPrice,
      baseProductImage: product.imageUrl || '',
      customization: {
        shirtColor: item.customization?.shirtColor || item.color || '#FFFFFF',
        logoDecal: item.customization?.logoDecal || '',
        fullDecal: item.customization?.fullDecal || '',
        customArtworkUrl: item.customization?.customArtworkUrl || '',
        customPreviewImage: item.customization?.customPreviewImage || '',
        baseProductImage: item.customization?.baseProductImage || product.imageUrl || '',
        logoPlacement: item.customization?.logoPlacement || {
          x: 0,
          y: 0.04,
          scale: 0.15,
          rotation: 0,
        },
        note: item.customization?.note || '',
      },
    });

  }

  subtotal = Number(subtotal.toFixed(2));
  const deliveryFee = Number(calculateDeliveryFee(deliveryAddress, subtotal).toFixed(2));

  const { promoDiscount, promoDoc } = await applyPromo(promoCode, subtotal, userId);
  const payableAfterPromo = Number((subtotal - promoDiscount + deliveryFee).toFixed(2));

  return {
    preparedItems,
    inventoryUpdates: [...inventoryUpdatesMap.values()],
    subtotal,
    deliveryFee,
    promoDiscount,
    promoDoc,
    payableAfterPromo,
  };
};

export const getOrderQuote = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, promoCode, giftCardCode } = req.body;

  const breakdown = await buildOrderBreakdown({
    userId: req.user._id,
    items,
    deliveryAddress,
    promoCode,
  });

  let giftCardAmount = 0;
  if (giftCardCode) {
    const application = await calculateGiftCardApplication({
      code: giftCardCode,
      amount: breakdown.payableAfterPromo,
    });
    giftCardAmount = application.usedAmount;
  }

  const total = Number(Math.max(breakdown.payableAfterPromo - giftCardAmount, 0).toFixed(2));

  res.status(200).json({
    summary: {
      subtotal: breakdown.subtotal,
      deliveryFee: breakdown.deliveryFee,
      promoDiscount: breakdown.promoDiscount,
      payableAmount: breakdown.payableAfterPromo,
      giftCardAmount,
      total,
    },
  });
});

export const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const lowStockNotificationQueue = [];

  try {
    const { items, deliveryAddress, paymentMethod, promoCode, giftCardCode } = req.body;

    if (!deliveryAddress) {
      throw new ApiError(400, 'Delivery address is required');
    }

    if (!['cod', 'installment', 'gift_card'].includes(paymentMethod)) {
      throw new ApiError(400, 'Invalid payment method');
    }

    const breakdown = await buildOrderBreakdown({
      userId: req.user._id,
      items,
      deliveryAddress,
      promoCode,
      session,
    });

    const normalizedGiftCardCode = normalizeGiftCardCode(giftCardCode);
    let giftCardAmount = 0;
    let reservedGiftCard = null;

    if (normalizedGiftCardCode && breakdown.payableAfterPromo > 0) {
      const giftCardApplication = await reserveGiftCardBalance({
        code: normalizedGiftCardCode,
        amount: breakdown.payableAfterPromo,
        session,
      });

      giftCardAmount = giftCardApplication.usedAmount;
      reservedGiftCard = giftCardApplication.giftCard;
    }

    const total = Number(Math.max(breakdown.payableAfterPromo - giftCardAmount, 0).toFixed(2));

    if (paymentMethod === 'gift_card' && total > 0) {
      throw new ApiError(400, 'Gift card payment requires full amount coverage');
    }

    const designFileUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const preparedItems = await Promise.all(
      breakdown.preparedItems.map(async (item) => {
        const customization = await prepareCustomizationForOrderItem({
          customization: item.customization,
          productImageUrl: item.baseProductImage,
          fallbackArtworkUrl: designFileUrl,
        });

        return {
          ...item,
          baseProductImage: customization.baseProductImage || item.baseProductImage || '',
          customPreviewImage: customization.customPreviewImage || '',
          customization,
        };
      })
    );

    const order = new Order({
      user: req.user._id,
      items: preparedItems,
      deliveryAddress,
      subtotal: breakdown.subtotal,
      promoCode: promoCode || '',
      promoDiscount: breakdown.promoDiscount,
      giftCardCode: normalizedGiftCardCode || '',
      giftCardAmount,
      deliveryFee: breakdown.deliveryFee,
      total,
      paymentMethod,
      paymentStatus: 'pending',
    });

    if (paymentMethod === 'installment') {
      const installmentPlan = buildInstallmentPlan(order.total);
      order.installmentPlan = {
        isEnabled: true,
        firstPaymentAmount: installmentPlan.firstPaymentAmount,
        installments: installmentPlan.installments,
      };
      order.paymentStatus = order.total > 0 ? 'partially_paid' : 'paid';
    } else if (paymentMethod === 'gift_card') {
      order.paymentStatus = 'paid';
    }

    if (paymentMethod === 'cod' && order.total === 0) {
      order.paymentStatus = 'paid';
    }

    await order.save({ session });

    for (const update of breakdown.inventoryUpdates) {
      update.inventory.stock = Math.max(update.inventory.stock - update.quantity, 0);
      const lowStockState = evaluateLowStockAlertState(update.inventory);
      await update.inventory.save({ session });

      if (lowStockState.shouldNotify) {
        lowStockNotificationQueue.push({
          productName: update.productName,
          stock: update.inventory.stock,
          threshold: update.inventory.lowStockThreshold,
          productId: update.productId,
          inventoryId: update.inventory._id,
        });
      }
    }

    if (breakdown.promoDoc) {
      breakdown.promoDoc.usedCount += 1;
      await breakdown.promoDoc.save({ session });
    }

    if (giftCardAmount > 0 && normalizedGiftCardCode) {
      await GiftCardTransaction.create(
        [
          {
            gift_card_id: reservedGiftCard._id,
            order_id: order._id,
            used_amount: giftCardAmount,
          },
        ],
        { session }
      );

      await Payment.create(
        [
          {
            order: order._id,
            user: req.user._id,
            method: 'gift_card',
            amount: giftCardAmount,
            status: 'paid',
            transactionRef: `GC-${Date.now()}`,
          },
        ],
        { session }
      );
    }

    if (paymentMethod === 'installment') {
      await Payment.create(
        [
          {
            order: order._id,
            user: req.user._id,
            method: 'installment',
            amount: order.installmentPlan.firstPaymentAmount,
            status: 'paid',
            transactionRef: `INS-1-${Date.now()}`,
            notes: 'Mandatory first installment collected',
          },
        ],
        { session }
      );
    } else if (paymentMethod === 'cod' && order.total > 0) {
      await Payment.create(
        [
          {
            order: order._id,
            user: req.user._id,
            method: 'cod',
            amount: order.total,
            status: 'pending',
            transactionRef: `COD-${Date.now()}`,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    await emailService.sendOrderConfirmationEmail(req.user, order);

    const orderCode = getOrderCode(order._id);
    const selfOrderLink =
      req.user.role === ROLES.ADMIN || req.user.role === ROLES.STAFF ? '/admin/orders' : '/dashboard/orders';

    await createNotification({
      userId: req.user._id,
      title: `Order #${orderCode} placed`,
      message: `Your order #${orderCode} has been placed successfully and is now pending confirmation.`,
      type: 'order',
      link: selfOrderLink,
      metadata: { orderId: String(order._id), status: order.status },
    });

    await notifyRoles({
      roles: [ROLES.ADMIN, ROLES.STAFF],
      excludeUserIds: [req.user._id],
      title: `New order #${orderCode}`,
      message: `${req.user.name || 'A customer'} placed order #${orderCode}.`,
      type: 'order',
      link: '/admin/orders',
      metadata: { orderId: String(order._id), status: order.status, customerId: String(req.user._id) },
    });

    if (lowStockNotificationQueue.length > 0) {
      for (const payload of lowStockNotificationQueue) {
        await notifyLowStockForRoles(payload);
      }
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [orders, total] = await Promise.all([
    Order.find({ user: req.user._id })
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: orders }));
});

export const getOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const status = (req.query.status || '').trim();
  const paymentStatus = (req.query.paymentStatus || '').trim();

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email role')
      .populate('items.product', 'name imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: orders }));
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name imageUrl');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const isOwner = String(order.user._id) === String(req.user._id);
  const isPrivileged = ['admin', 'staff'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, 'Not authorized to view this order');
  }

  const payments = await Payment.find({ order: order._id }).sort({ createdAt: -1 });

  res.status(200).json({ order, payments });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const previousStatus = order.status;

  if (status) {
    order.status = status;
  }

  if (adminNotes !== undefined) {
    order.adminNotes = adminNotes;
  }

  await order.save();

  if (status && status !== previousStatus) {
    const orderCode = getOrderCode(order._id);
    const statusLabel = getStatusLabel(status);

    await createNotification({
      userId: order.user,
      title: `Order #${orderCode} ${statusLabel}`,
      message: `Your order #${orderCode} is now ${statusLabel}.`,
      type: 'order',
      link: '/dashboard/orders',
      metadata: { orderId: String(order._id), status },
    });

    await notifyRoles({
      roles: [ROLES.ADMIN, ROLES.STAFF],
      excludeUserIds: [req.user._id],
      title: `Order #${orderCode} status updated`,
      message: `Order #${orderCode} moved from ${getStatusLabel(previousStatus)} to ${statusLabel}.`,
      type: 'order',
      link: '/admin/orders',
      metadata: { orderId: String(order._id), previousStatus, status },
    });
  }

  res.status(200).json({
    message: 'Order updated',
    order,
  });
});

export const payInstallment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const isOwner = String(order.user) === String(req.user._id);
  const isPrivileged = ['admin', 'staff'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, 'Not authorized');
  }

  if (!order.installmentPlan?.isEnabled) {
    throw new ApiError(400, 'This order is not on installment plan');
  }

  const pendingInstallment = order.installmentPlan.installments.find(
    (installment) => installment.status === 'pending'
  );

  if (!pendingInstallment) {
    throw new ApiError(400, 'No pending installment found');
  }

  pendingInstallment.status = 'paid';
  pendingInstallment.paidAt = new Date();

  const hasPending = order.installmentPlan.installments.some((i) => i.status === 'pending');
  order.paymentStatus = hasPending ? 'partially_paid' : 'paid';

  await order.save();

  await Payment.create({
    order: order._id,
    user: order.user,
    method: 'installment',
    amount: pendingInstallment.amount,
    status: 'paid',
    transactionRef: `INS-${pendingInstallment.installmentNumber}-${Date.now()}`,
  });

  res.status(200).json({
    message: 'Installment payment recorded',
    order,
  });
});

export const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .populate('order', 'status total createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({ payments });
});
