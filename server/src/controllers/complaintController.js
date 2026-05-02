import Complaint from '../models/Complaint.js';
import Order from '../models/Order.js';
import { storeCustomizationImage } from '../services/imageUploadService.js';
import { createNotification, notifyRoles } from '../services/notificationService.js';
import { ROLES } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

export const createComplaint = asyncHandler(async (req, res) => {
  const { orderId, subject, message } = req.body;

  if (!subject || !message) {
    throw new ApiError(400, 'subject and message are required');
  }

  let order = null;
  if (orderId) {
    order = await Order.findById(orderId);
    if (!order) throw new ApiError(404, 'Order not found');
    if (String(order.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Order does not belong to the current user');
    }
  }

  // Upload attachment if provided
  let attachmentUrl = '';
  if (req.file) {
    attachmentUrl = await storeCustomizationImage(req.file, 'complaint');
  }

  const complaint = await Complaint.create({
    user: req.user._id,
    order: order ? order._id : null,
    subject,
    message,
    attachmentUrl,
    messages: [
      {
        sender: req.user._id,
        senderRole: req.user.role || 'customer',
        senderName: req.user.name || '',
        message,
        createdAt: new Date(),
      },
    ],
  });

  // Notify admin/staff
  await notifyRoles({
    roles: [ROLES.ADMIN, ROLES.STAFF],
    title: `New complaint: ${subject}`,
    message: `${req.user.name || 'A customer'} submitted a complaint: ${subject}`,
    type: 'system',
    link: '/admin/returns-complaints',
    metadata: { complaintId: String(complaint._id) },
  });

  res.status(201).json({
    message: 'Complaint submitted',
    complaint,
  });
});

export const getMyComplaints = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [complaints, total] = await Promise.all([
    Complaint.find({ user: req.user._id })
      .populate('order', 'status total createdAt')
      .populate('messages.sender', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: complaints }));
});

export const getComplaints = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { status, search, from, to } = req.query;

  const filter = {};
  if (status) filter.status = status;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  const [allComplaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('user', 'name email')
      .populate('order', 'status total')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);

  let complaints = allComplaints;
  if (search) {
    const lower = search.toLowerCase();
    complaints = allComplaints.filter(
      (c) =>
        c.user?.name?.toLowerCase().includes(lower) ||
        c.user?.email?.toLowerCase().includes(lower) ||
        c.subject?.toLowerCase().includes(lower) ||
        c.complaintId?.toLowerCase().includes(lower)
    );
  }

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: complaints }));
});

export const addComplaintMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim().length < 2) {
    throw new ApiError(400, 'Message is required');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  // Customers can only reply to their own complaints
  const isOwner = String(complaint.user) === String(req.user._id);
  const isStaff = ['admin', 'staff'].includes(req.user.role);

  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'Access denied');
  }

  complaint.messages.push({
    sender: req.user._id,
    senderRole: req.user.role || 'customer',
    senderName: req.user.name || '',
    message: message.trim(),
    createdAt: new Date(),
  });

  // If admin/staff replies, update status to in_progress if still open
  if (isStaff && complaint.status === 'open') {
    complaint.status = 'in_progress';
    complaint.adminResponse = message.trim();
  }

  await complaint.save();

  // Notify the other party
  if (isStaff) {
    await createNotification({
      userId: complaint.user,
      title: `Reply to your complaint: ${complaint.subject}`,
      message: `Admin/staff responded to your complaint (${complaint.complaintId}).`,
      type: 'system',
      link: '/dashboard/complaints',
      metadata: { complaintId: String(complaint._id) },
    });
  } else {
    await notifyRoles({
      roles: [ROLES.ADMIN, ROLES.STAFF],
      title: `Customer replied to complaint ${complaint.complaintId}`,
      message: `A customer added a follow-up to complaint: ${complaint.subject}`,
      type: 'system',
      link: '/admin/returns-complaints',
      metadata: { complaintId: String(complaint._id) },
    });
  }

  res.status(200).json({
    message: 'Message added',
    complaint,
  });
});

export const respondToComplaint = asyncHandler(async (req, res) => {
  const { status, adminResponse, assignedTo } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new ApiError(404, 'Complaint not found');

  if (status) {
    complaint.status = status;
    if (status === 'resolved' || status === 'closed') {
      complaint.resolvedAt = new Date();
    }
  }

  if (adminResponse !== undefined) {
    complaint.adminResponse = adminResponse;
    // Also push as a message for consistency
    if (adminResponse.trim()) {
      complaint.messages.push({
        sender: req.user._id,
        senderRole: req.user.role || 'admin',
        senderName: req.user.name || '',
        message: adminResponse.trim(),
        createdAt: new Date(),
      });

      // Notify customer
      await createNotification({
        userId: complaint.user,
        title: `Update on your complaint: ${complaint.subject}`,
        message: `Admin responded to your complaint (${complaint.complaintId}).`,
        type: 'system',
        link: '/dashboard/complaints',
        metadata: { complaintId: String(complaint._id) },
      });
    }
  }

  if (assignedTo !== undefined) {
    complaint.assignedTo = assignedTo || null;
  }

  await complaint.save();

  res.status(200).json({
    message: 'Complaint updated',
    complaint,
  });
});
