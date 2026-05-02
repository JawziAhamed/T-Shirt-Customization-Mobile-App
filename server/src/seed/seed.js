import dotenv from 'dotenv';

import { connectDB } from '../config/db.js';
import Category from '../models/Category.js';
import Complaint from '../models/Complaint.js';
import GiftCard from '../models/GiftCard.js';
import GiftCardTransaction from '../models/GiftCardTransaction.js';
import Inventory from '../models/Inventory.js';
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import PromoCode from '../models/PromoCode.js';
import ReturnRequest from '../models/ReturnRequest.js';
import User from '../models/User.js';

dotenv.config();

const unsplashImages = {
  classicCotton: 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=80',
  urbanStreetwear: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
  sportsPerformance: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80',
  ecoRecycled: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
  premiumPolo: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
};

const seed = async () => {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    ReturnRequest.deleteMany({}),
    Complaint.deleteMany({}),
    Notification.deleteMany({}),
    PromoCode.deleteMany({}),
    GiftCard.deleteMany({}),
    GiftCardTransaction.deleteMany({}),
  ]);

  const [admin, staff, customer] = await Promise.all([
    User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
      role: 'admin',
      phone: '+1-555-1000',
      address: '1 Admin Plaza, NY',
    }),
    User.create({
      name: 'Operations Staff',
      email: 'staff@example.com',
      password: process.env.SEED_STAFF_PASSWORD || 'Staff@12345',
      role: 'staff',
      phone: '+1-555-2000',
      address: '200 Warehouse Ave, CA',
    }),
    User.create({
      name: 'Demo Customer',
      email: 'customer@example.com',
      password: process.env.SEED_CUSTOMER_PASSWORD || 'Customer@12345',
      role: 'customer',
      phone: '+1-555-3000',
      address: '45 Customer Street, TX',
      walletBalance: 25,
    }),
  ]);

  const categorySeeds = [
    {
      name: 'New Arrivals',
      slug: 'new-arrivals',
      description: 'Recently released t-shirt collections',
      sortOrder: 10,
    },
    {
      name: 'Giveaways',
      slug: 'giveaways',
      description: 'T-shirts suitable for gifting and campaigns',
      sortOrder: 20,
    },
    {
      name: 'Promotional Offers',
      slug: 'promotional-offers',
      description: 'Discounted and promotional t-shirt products',
      sortOrder: 30,
    },
    {
      name: 'Regular Products',
      slug: 'regular-products',
      description: 'Everyday catalog products',
      sortOrder: 40,
    },
    {
      name: 'Best Sellers',
      slug: 'best-sellers',
      description: 'Most popular customer picks',
      sortOrder: 50,
    },
  ];

  const createdCategories = await Category.insertMany(categorySeeds);
  const categoriesBySlug = new Map(createdCategories.map((category) => [category.slug, category]));
  const productsByName = new Map();

  const productSeeds = [
    {
      name: 'Classic Cotton Tee',
      description: 'Premium 180 GSM cotton t-shirt suitable for everyday wear.',
      categorySlugs: ['regular-products', 'best-sellers'],
      basePrice: 19.99,
      sizes: [
        { size: 'S', priceModifier: 0 },
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 2 },
        { size: 'XL', priceModifier: 3 },
      ],
      colors: ['#000000', '#FFFFFF', '#EF4444', '#3B82F6'],
      customArtworkAllowed: true,
      defaultTemplates: ['/uploads/template-1.png', '/uploads/template-2.png'],
      imageUrl: unsplashImages.classicCotton,
      gallery: [unsplashImages.classicCotton, unsplashImages.premiumPolo],
      tags: ['cotton', 'classic'],
      stock: 120,
      lowStockThreshold: 20,
    },
    {
      name: 'Urban Streetwear Tee',
      description: 'Oversized fit with high quality cotton blend.',
      categorySlugs: ['new-arrivals', 'best-sellers'],
      basePrice: 24.5,
      sizes: [
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 1.5 },
        { size: 'XL', priceModifier: 2.5 },
      ],
      colors: ['#111827', '#1F2937', '#F59E0B'],
      customArtworkAllowed: true,
      defaultTemplates: ['/uploads/template-3.png'],
      imageUrl: unsplashImages.urbanStreetwear,
      gallery: [unsplashImages.urbanStreetwear, unsplashImages.classicCotton],
      tags: ['street', 'oversized'],
      stock: 80,
      lowStockThreshold: 15,
    },
    {
      name: 'Sports Performance Tee',
      description: 'Breathable and lightweight performance t-shirt.',
      categorySlugs: ['promotional-offers', 'regular-products'],
      basePrice: 29.99,
      sizes: [
        { size: 'S', priceModifier: 0 },
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 1 },
      ],
      colors: ['#0EA5E9', '#22C55E', '#F97316'],
      customArtworkAllowed: true,
      defaultTemplates: ['/uploads/template-4.png'],
      imageUrl: unsplashImages.sportsPerformance,
      gallery: [unsplashImages.sportsPerformance, unsplashImages.urbanStreetwear],
      tags: ['sports', 'performance'],
      stock: 60,
      lowStockThreshold: 12,
    },
    {
      name: 'Eco Recycled Tee',
      description: 'Eco-friendly recycled fabric with soft finish.',
      categorySlugs: ['giveaways', 'regular-products'],
      basePrice: 27.0,
      sizes: [
        { size: 'S', priceModifier: 0 },
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 1 },
        { size: 'XL', priceModifier: 2 },
      ],
      colors: ['#14532D', '#4D7C0F', '#F3F4F6'],
      customArtworkAllowed: true,
      defaultTemplates: ['/uploads/template-5.png'],
      imageUrl: unsplashImages.ecoRecycled,
      gallery: [unsplashImages.ecoRecycled, unsplashImages.classicCotton],
      tags: ['eco', 'recycled'],
      stock: 8,
      lowStockThreshold: 18,
    },
    {
      name: 'Premium Polo Tee',
      description: 'Semi-formal polo tee for business casual needs.',
      categorySlugs: ['regular-products'],
      basePrice: 34.99,
      sizes: [
        { size: 'M', priceModifier: 0 },
        { size: 'L', priceModifier: 1.5 },
        { size: 'XL', priceModifier: 2.5 },
      ],
      colors: ['#1E3A8A', '#374151', '#991B1B'],
      customArtworkAllowed: true,
      defaultTemplates: ['/uploads/template-6.png'],
      imageUrl: unsplashImages.premiumPolo,
      gallery: [unsplashImages.premiumPolo, unsplashImages.urbanStreetwear],
      tags: ['polo', 'premium'],
      stock: 70,
      lowStockThreshold: 14,
    },
  ];

  for (const seedProduct of productSeeds) {
    const { stock, lowStockThreshold, categorySlugs = [], ...productData } = seedProduct;
    const matchedCategoryIds = categorySlugs
      .map((slug) => categoriesBySlug.get(slug)?._id)
      .filter(Boolean);

    const defaultCategory = categoriesBySlug.get('regular-products');
    const productCategoryIds = matchedCategoryIds.length
      ? matchedCategoryIds
      : defaultCategory
        ? [defaultCategory._id]
        : [];

    const primaryCategory = matchedCategoryIds.length
      ? categoriesBySlug.get(categorySlugs[0])
      : defaultCategory;

    const product = await Product.create({
      ...productData,
      categories: productCategoryIds,
      category: primaryCategory?.slug || 'custom-tshirt',
    });

    productsByName.set(product.name, product);

    await Inventory.create({
      product: product._id,
      stock,
      lowStockThreshold,
    });
  }

  await PromoCode.insertMany([
    {
      code: 'WELCOME10',
      description: '10% off for new customers',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 30,
      maxDiscount: 20,
      usageLimit: 500,
      isActive: true,
      newCustomersOnly: true,
      promotionalAlert: 'Welcome offer: Save 10% using WELCOME10',
    },
    {
      code: 'SAVE15',
      description: 'Flat 15 off orders over 100',
      discountType: 'fixed',
      discountValue: 15,
      minOrderValue: 100,
      usageLimit: 300,
      isActive: true,
      promotionalAlert: 'Limited-time deal: SAVE15 for flat discount',
    },
  ]);

  const giftCards = await GiftCard.insertMany([
    {
      code: 'GC-AB12-CD34',
      initial_balance: 100,
      current_balance: 100,
      status: 'active',
      expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
    {
      code: 'GC-ZX90-PL45',
      initial_balance: 50,
      current_balance: 50,
      status: 'inactive',
      expiry_date: null,
    },
  ]);

  const productLookup = (name) => productsByName.get(name);
  const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  };
  const monthsAgo = (months) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date;
  };
  const buildOrderItem = (product, quantity, overrides = {}) => {
    const size = overrides.size || product?.sizes?.[0]?.size || '';
    const color = overrides.color || product?.colors?.[0] || '';
    const unitPrice = Number(overrides.unitPrice ?? product?.basePrice ?? 0);

    return {
      product: product._id,
      productName: product.name,
      quantity,
      size,
      color,
      unitPrice,
      totalPrice: Number((unitPrice * quantity).toFixed(2)),
      baseProductImage: product.imageUrl || '',
      customPreviewImage: overrides.customPreviewImage || product.imageUrl || '',
      customization: {
        shirtColor: color || '#FFFFFF',
        logoDecal: overrides.logoDecal || '',
        fullDecal: overrides.fullDecal || '',
        customArtworkUrl: overrides.customArtworkUrl || '',
        baseProductImage: product.imageUrl || '',
        customPreviewImage: overrides.customPreviewImage || product.imageUrl || '',
        note: overrides.note || '',
      },
    };
  };

  const classicCotton = productLookup('Classic Cotton Tee');
  const urbanStreetwear = productLookup('Urban Streetwear Tee');
  const sportsPerformance = productLookup('Sports Performance Tee');
  const ecoRecycled = productLookup('Eco Recycled Tee');
  const premiumPolo = productLookup('Premium Polo Tee');

  const deliveredOrder = await Order.create({
    user: customer._id,
    items: [buildOrderItem(classicCotton, 2, { size: 'M', color: '#FFFFFF' })],
    deliveryAddress: {
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: '45 Customer Street',
      addressLine2: 'Apt 2',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postalCode: '73301',
    },
    subtotal: 39.98,
    promoCode: '',
    promoDiscount: 0,
    giftCardCode: '',
    giftCardAmount: 0,
    deliveryFee: 5,
    total: 44.98,
    status: 'delivered',
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    adminNotes: 'Delivered on time.',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(5),
  });

  const processingOrder = await Order.create({
    user: customer._id,
    items: [
      buildOrderItem(urbanStreetwear, 1, { size: 'L', color: '#111827' }),
      buildOrderItem(premiumPolo, 1, { size: 'M', color: '#1E3A8A' }),
    ],
    deliveryAddress: {
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: '45 Customer Street',
      addressLine2: '',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postalCode: '73301',
    },
    subtotal: 59.49,
    promoCode: 'WELCOME10',
    promoDiscount: 5.95,
    giftCardCode: '',
    giftCardAmount: 0,
    deliveryFee: 5,
    total: 58.54,
    status: 'processing',
    paymentMethod: 'installment',
    paymentStatus: 'partially_paid',
    installmentPlan: {
      isEnabled: true,
      firstPaymentAmount: 20,
      installments: [
        {
          installmentNumber: 1,
          amount: 20,
          dueDate: daysAgo(-7),
          status: 'paid',
          paidAt: daysAgo(2),
        },
        {
          installmentNumber: 2,
          amount: 19.27,
          dueDate: daysAgo(23),
          status: 'pending',
          paidAt: null,
        },
        {
          installmentNumber: 3,
          amount: 19.27,
          dueDate: daysAgo(53),
          status: 'pending',
          paidAt: null,
        },
      ],
    },
    adminNotes: 'Awaiting final installment.',
    createdAt: daysAgo(18),
    updatedAt: daysAgo(4),
  });

  const shippedOrder = await Order.create({
    user: customer._id,
    items: [buildOrderItem(sportsPerformance, 3, { size: 'L', color: '#0EA5E9' })],
    deliveryAddress: {
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: '45 Customer Street',
      addressLine2: '',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postalCode: '73301',
    },
    subtotal: 89.97,
    promoCode: 'SAVE15',
    promoDiscount: 15,
    giftCardCode: 'GC-AB12-CD34',
    giftCardAmount: 25,
    deliveryFee: 0,
    total: 49.97,
    status: 'shipped',
    paymentMethod: 'gift_card',
    paymentStatus: 'paid',
    adminNotes: 'Gift card applied at checkout.',
    createdAt: monthsAgo(1),
    updatedAt: daysAgo(10),
  });

  const returnedOrder = await Order.create({
    user: customer._id,
    items: [buildOrderItem(ecoRecycled, 2, { size: 'S', color: '#14532D' })],
    deliveryAddress: {
      fullName: customer.name,
      phone: customer.phone,
      addressLine1: '45 Customer Street',
      addressLine2: '',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postalCode: '73301',
    },
    subtotal: 54,
    promoCode: '',
    promoDiscount: 0,
    giftCardCode: '',
    giftCardAmount: 0,
    deliveryFee: 5,
    total: 59,
    status: 'returned',
    paymentMethod: 'cod',
    paymentStatus: 'refunded',
    refundedToWallet: 20,
    adminNotes: 'Returned after fit issue resolved through wallet refund.',
    createdAt: monthsAgo(2),
    updatedAt: monthsAgo(1),
  });

  await Payment.insertMany([
    {
      order: deliveredOrder._id,
      user: customer._id,
      method: 'cod',
      amount: 44.98,
      status: 'paid',
      transactionRef: 'COD-ORDER-1001',
      notes: 'Collected on delivery.',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      order: processingOrder._id,
      user: customer._id,
      method: 'installment',
      amount: 20,
      status: 'paid',
      transactionRef: 'INST-ORDER-1002',
      notes: 'First installment received.',
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      order: shippedOrder._id,
      user: customer._id,
      method: 'gift_card',
      amount: 49.97,
      status: 'paid',
      transactionRef: 'GIFT-ORDER-1003',
      notes: 'Gift card applied successfully.',
      createdAt: monthsAgo(1),
      updatedAt: monthsAgo(1),
    },
    {
      order: returnedOrder._id,
      user: customer._id,
      method: 'cod',
      amount: 59,
      status: 'refunded',
      transactionRef: 'REF-ORDER-1004',
      notes: 'Refund issued to wallet after return.',
      createdAt: monthsAgo(1),
      updatedAt: monthsAgo(1),
    },
  ]);

  await GiftCardTransaction.insertMany([
    {
      gift_card_id: giftCards[0]._id,
      order_id: shippedOrder._id,
      used_amount: 25,
    },
  ]);

  await ReturnRequest.create({
    order: deliveredOrder._id,
    user: customer._id,
    items: [
      {
        product: classicCotton._id,
        productName: classicCotton.name,
        quantity: 1,
        size: 'M',
        color: '#FFFFFF',
        unitPrice: 19.99,
      },
    ],
    reasonType: 'damaged_product',
    reason: 'The print placement was slightly off on delivery.',
    description: 'Customer shared a photo of the seam and requested a wallet refund.',
    damagedImageUrl: unsplashImages.classicCotton,
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        note: 'Return request submitted.',
        changedBy: customer._id,
        changedAt: daysAgo(2),
      },
    ],
    refundAmount: 0,
    refundMethod: 'wallet',
  });

  await ReturnRequest.create({
    order: returnedOrder._id,
    user: customer._id,
    items: [
      {
        product: ecoRecycled._id,
        productName: ecoRecycled.name,
        quantity: 1,
        size: 'S',
        color: '#14532D',
        unitPrice: 27,
      },
    ],
    reasonType: 'not_satisfied',
    reason: 'Color appeared darker than expected.',
    description: 'The customer preferred a lighter shade and requested a refund to wallet.',
    status: 'approved',
    statusHistory: [
      {
        status: 'pending',
        note: 'Submitted for review.',
        changedBy: customer._id,
        changedAt: monthsAgo(1),
      },
      {
        status: 'approved',
        note: 'Approved by staff for wallet refund.',
        changedBy: staff._id,
        changedAt: daysAgo(20),
      },
    ],
    refundAmount: 20,
    refundMethod: 'wallet',
    refundedAt: daysAgo(20),
  });

  await ReturnRequest.create({
    order: processingOrder._id,
    user: customer._id,
    items: [
      {
        product: premiumPolo._id,
        productName: premiumPolo.name,
        quantity: 1,
        size: 'M',
        color: '#1E3A8A',
        unitPrice: 34.99,
      },
    ],
    reasonType: 'wrong_item',
    reason: 'Received the wrong collar style in the package.',
    description: 'The customer uploaded evidence and the case was rejected after review.',
    damagedImageUrl: unsplashImages.premiumPolo,
    status: 'rejected',
    statusHistory: [
      {
        status: 'pending',
        note: 'Initial complaint logged.',
        changedBy: customer._id,
        changedAt: daysAgo(12),
      },
      {
        status: 'rejected',
        note: 'No fulfillment mismatch found during warehouse check.',
        changedBy: admin._id,
        changedAt: daysAgo(10),
      },
    ],
    refundAmount: 0,
    refundMethod: 'bank_transfer',
  });

  await Complaint.create({
    user: customer._id,
    order: deliveredOrder._id,
    subject: 'Shipping update took too long',
    message: 'I wanted a clearer ETA after checkout and the tracking update came late.',
    status: 'open',
    messages: [
      {
        sender: customer._id,
        senderRole: 'customer',
        senderName: customer.name,
        message: 'I wanted a clearer ETA after checkout and the tracking update came late.',
        createdAt: daysAgo(5),
      },
    ],
    adminResponse: '',
    assignedTo: staff._id,
  });

  await Complaint.create({
    user: customer._id,
    order: returnedOrder._id,
    subject: 'Color mismatch on eco tee',
    message: 'The shirt shade looked darker than the product photos.',
    status: 'in_progress',
    messages: [
      {
        sender: customer._id,
        senderRole: 'customer',
        senderName: customer.name,
        message: 'The shirt shade looked darker than the product photos.',
        createdAt: monthsAgo(1),
      },
      {
        sender: staff._id,
        senderRole: 'staff',
        senderName: staff.name,
        message: 'We are checking the order photos and will update you shortly.',
        createdAt: daysAgo(25),
      },
    ],
    adminResponse: 'We are reviewing the shade variance with the print team.',
    assignedTo: staff._id,
  });

  await Complaint.create({
    user: customer._id,
    order: processingOrder._id,
    subject: 'Packaging issue resolved',
    message: 'The packaging arrived slightly damaged but the shirts were fine.',
    status: 'resolved',
    messages: [
      {
        sender: customer._id,
        senderRole: 'customer',
        senderName: customer.name,
        message: 'The packaging arrived slightly damaged but the shirts were fine.',
        createdAt: monthsAgo(2),
      },
      {
        sender: admin._id,
        senderRole: 'admin',
        senderName: admin.name,
        message: 'Thanks for the update. We will use your feedback to improve packaging.',
        createdAt: monthsAgo(2),
      },
    ],
    adminResponse: 'Resolved with a shipping credit for future orders.',
    assignedTo: admin._id,
    resolvedAt: monthsAgo(2),
  });

  await Notification.insertMany([
    {
      user: customer._id,
      title: 'Order delivered successfully',
      message: 'Your classic cotton tee order has been delivered.',
      type: 'order',
      link: '/dashboard/orders',
      metadata: { orderId: String(deliveredOrder._id), status: 'delivered' },
      isRead: false,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      user: customer._id,
      title: 'Installment reminder',
      message: 'Your next installment payment is coming up soon.',
      type: 'payment',
      link: '/dashboard/orders',
      metadata: { orderId: String(processingOrder._id) },
      isRead: false,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      user: customer._id,
      title: 'Return approved',
      message: 'Your eco tee return has been approved and a wallet refund was issued.',
      type: 'return',
      link: '/dashboard/returns',
      metadata: { orderId: String(returnedOrder._id) },
      isRead: true,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      user: admin._id,
      title: 'Low stock alert',
      message: 'Eco Recycled Tee stock is below the configured threshold.',
      type: 'inventory',
      link: '/admin/inventory',
      metadata: { productId: String(ecoRecycled._id), stock: 8 },
      isRead: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      user: staff._id,
      title: 'Promotion ready',
      message: 'WELCOME10 promo is live and ready for campaigns.',
      type: 'promotion',
      link: '/admin/promos',
      metadata: { code: 'WELCOME10' },
      isRead: true,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      user: admin._id,
      title: 'System seed completed',
      message: 'Demo content is available across orders, complaints, returns, and notifications.',
      type: 'system',
      link: '/admin/dashboard',
      metadata: { seeded: true },
      isRead: true,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  console.log('Seed completed successfully');
  console.log('Admin: admin@example.com / Admin@12345');
  console.log('Staff: staff@example.com / Staff@12345');
  console.log('Customer: customer@example.com / Customer@12345');

  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
