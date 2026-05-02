import User from '../models/User.js';
import Notification from '../models/Notification.js';

const normalizeUserIds = (userIds = []) =>
  [...new Set(userIds.map((userId) => String(userId || '').trim()).filter(Boolean))];

const sanitizePayload = ({
  title,
  message,
  type = 'system',
  link = '',
  metadata = null,
}) => ({
  title: String(title || '').trim(),
  message: String(message || '').trim(),
  type,
  link: String(link || '').trim(),
  metadata,
});

export const createNotification = async ({ userId, ...payload }) => {
  if (!userId) return null;
  const normalized = sanitizePayload(payload);

  if (!normalized.title || !normalized.message) return null;

  return Notification.create({
    user: userId,
    ...normalized,
  });
};

export const createNotificationsForUsers = async (userIds = [], payload = {}) => {
  const normalizedIds = normalizeUserIds(userIds);
  if (!normalizedIds.length) return [];

  const normalizedPayload = sanitizePayload(payload);
  if (!normalizedPayload.title || !normalizedPayload.message) return [];

  const docs = normalizedIds.map((userId) => ({
    user: userId,
    ...normalizedPayload,
  }));

  return Notification.insertMany(docs);
};

export const notifyRoles = async ({
  roles = [],
  excludeUserIds = [],
  ...payload
}) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const excluded = normalizeUserIds(excludeUserIds);
  const users = await User.find({ role: { $in: roles } }, '_id');

  const targetUserIds = users
    .map((user) => String(user._id))
    .filter((userId) => !excluded.includes(userId));

  return createNotificationsForUsers(targetUserIds, payload);
};

export const getUnreadNotificationCount = async (userId) => {
  if (!userId) return 0;
  return Notification.countDocuments({ user: userId, isRead: false });
};
