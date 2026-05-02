import { matchedData } from 'express-validator';

import { ACCOUNT_LOCK_MINUTES, FAILED_LOGIN_LIMIT, ROLES } from '../config/constants.js';
import emailService from '../services/emailService.js';
import { storeUserAvatar } from '../services/imageUploadService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateToken from '../utils/generateToken.js';
import { createRandomToken, hashToken } from '../utils/token.js';
import User from '../models/User.js';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || '';
};

const getUserAgent = (req) => req.get('user-agent') || '';
const suspensionMessage =
  'Your account has been temporarily suspended for 15 minutes due to multiple incorrect password attempts. Please try again later.';

const recordActivity = (user, req, action, meta = null) => {
  if (!user || typeof user.pushActivity !== 'function') return;

  user.pushActivity({
    action,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    meta,
  });
};

const shouldApplySuspensionPolicy = (user) =>
  user?.role === ROLES.CUSTOMER || user?.role === ROLES.STAFF;

const buildSuspensionDetails = (lockUntil) => {
  const remainingMs = Math.max(new Date(lockUntil).getTime() - Date.now(), 0);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return {
    lockUntil: new Date(lockUntil).toISOString(),
    remainingSeconds,
    suspendedForMinutes: ACCOUNT_LOCK_MINUTES,
  };
};

export const register = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new ApiError(409, 'Email already in use');
  }

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: ROLES.CUSTOMER,
    phone: payload.phone || '',
    address: payload.address || '',
  });
  recordActivity(user, req, 'account_registered');
  await user.save();

  await emailService.sendRegistrationEmail(user);

  const token = generateToken(user);

  res.status(201).json({
    message: 'Registration successful',
    token,
    user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const user = await User.findOne({ email: payload.email }).select('+password +passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const shouldSuspend = shouldApplySuspensionPolicy(user);

  if (!shouldSuspend && (user.failedLoginAttempts || user.lockUntil)) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  if (shouldSuspend && user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(423, suspensionMessage, buildSuspensionDetails(user.lockUntil));
  }

  if (shouldSuspend && user.lockUntil && user.lockUntil <= Date.now()) {
    user.lockUntil = null;
    user.failedLoginAttempts = 0;
    await user.save();
  }

  const isPasswordValid = await user.comparePassword(payload.password);

  if (!isPasswordValid) {
    if (shouldSuspend) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= FAILED_LOGIN_LIMIT) {
        const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60 * 1000);
        user.lockUntil = lockUntil;
        user.failedLoginAttempts = 0;

        recordActivity(user, req, 'login_suspended_due_to_failed_attempts');
        await user.save();

        throw new ApiError(423, suspensionMessage, buildSuspensionDetails(lockUntil));
      }

      await user.save();
    }

    throw new ApiError(401, 'Invalid email or password');
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  recordActivity(user, req, 'login_success');
  await user.save();

  await emailService.sendLoginEmail(user);

  const token = generateToken(user);

  res.status(200).json({
    message: 'Login successful',
    token,
    user,
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const user = await User.findOne({ email: payload.email }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(404, 'No user found with this email');
  }

  const resetToken = createRandomToken(20);
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  recordActivity(user, req, 'password_reset_requested');
  await user.save();

  await emailService.sendPasswordResetEmail(user, resetToken);

  res.status(200).json({
    message: 'Password reset token generated and sent via email service',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const payload = matchedData(req);
  const hashedToken = hashToken(payload.token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Reset token is invalid or expired');
  }

  user.password = payload.newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  recordActivity(user, req, 'password_reset_completed');
  await user.save();

  res.status(200).json({
    message: 'Password reset successful',
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    user,
  });
});

export const updateCurrentUser = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const changedFields = [];

  if (payload.email !== undefined && payload.email !== user.email) {
    const existingUser = await User.findOne({ email: payload.email, _id: { $ne: user._id } });
    if (existingUser) {
      throw new ApiError(409, 'Email already in use');
    }

    user.email = payload.email;
    changedFields.push('email');
  }

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.name !== undefined) changedFields.push('name');

  if (payload.phone !== undefined) {
    user.phone = payload.phone;
    changedFields.push('phone');
  }

  if (payload.address !== undefined) {
    user.address = payload.address;
    changedFields.push('address');
  }

  if (req.file) {
    user.avatarUrl = await storeUserAvatar(req.file);
    changedFields.push('avatarUrl');
  }

  if (changedFields.length) {
    recordActivity(user, req, 'profile_updated', { fields: changedFields });
  }

  await user.save();

  res.status(200).json({
    message: 'Profile updated',
    user,
  });
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const payload = matchedData(req);

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isCurrentPasswordValid = await user.comparePassword(payload.currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  const isSamePassword = await user.comparePassword(payload.newPassword);
  if (isSamePassword) {
    throw new ApiError(400, 'New password must be different from current password');
  }

  user.password = payload.newPassword;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  recordActivity(user, req, 'password_changed');
  await user.save();

  res.status(200).json({
    message: 'Password changed successfully',
  });
});

export const getCurrentUserActivity = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit || 20);
  const safeLimit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
    : 20;

  const user = await User.findById(req.user._id).select('activityLogs lastLoginAt createdAt');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({
    activity: (user.activityLogs || []).slice(0, safeLimit),
    lastLoginAt: user.lastLoginAt,
    accountCreatedAt: user.createdAt,
  });
});

export const logout = asyncHandler(async (req, res) => {
  // Stateless JWT logout handled on client.
  res.status(200).json({ message: 'Logged out successfully' });
});
