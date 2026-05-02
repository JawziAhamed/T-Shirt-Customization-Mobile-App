import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';

const parseArrayInput = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const tab = String(req.query.tab || 'all').trim().toLowerCase();
  const types = parseArrayInput(req.query.type).map((type) => type.toLowerCase());

  const filter = { user: req.user._id };

  if (tab === 'unread') {
    filter.isRead = false;
  } else if (tab === 'read') {
    filter.isRead = true;
  }

  if (types.length > 0 && !types.includes('all')) {
    filter.type = { $in: types };
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    ...buildPaginationResponse({ page, limit, total, data: notifications }),
    unreadCount,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.status(200).json({ unreadCount });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  res.status(200).json({
    message: 'Notification marked as read',
    notification,
  });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json({
    message: 'All notifications marked as read',
    updated: result.modifiedCount || 0,
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  await notification.deleteOne();

  res.status(200).json({
    message: 'Notification deleted',
  });
});

export const clearNotifications = asyncHandler(async (req, res) => {
  const tab = String(req.query.tab || 'all').trim().toLowerCase();
  const types = parseArrayInput(req.query.type).map((type) => type.toLowerCase());

  const filter = { user: req.user._id };

  if (tab === 'unread') {
    filter.isRead = false;
  } else if (tab === 'read') {
    filter.isRead = true;
  }

  if (types.length > 0 && !types.includes('all')) {
    filter.type = { $in: types };
  }

  const result = await Notification.deleteMany(filter);

  res.status(200).json({
    message: 'Notifications cleared',
    deleted: result.deletedCount || 0,
  });
});
