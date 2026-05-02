import { matchedData } from 'express-validator';

import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildPaginationResponse, getPagination } from '../utils/pagination.js';
import { ROLES } from '../config/constants.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = (req.query.search || '').trim();

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { role: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json(buildPaginationResponse({ page, limit, total, data: users }));
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.status(200).json({ user });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const payload = matchedData(req);
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!Object.values(ROLES).includes(payload.role)) {
    throw new ApiError(400, 'Invalid role');
  }

  user.role = payload.role;
  await user.save();

  res.status(200).json({
    message: 'User role updated',
    user,
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });

  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  const role = payload.role && Object.values(ROLES).includes(payload.role) ? payload.role : ROLES.CUSTOMER;

  const user = await User.create({
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role,
    phone: payload.phone || '',
    address: payload.address || '',
  });

  res.status(201).json({
    message: 'User created',
    user,
  });
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const payload = matchedData(req, { includeOptionals: true });
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (payload.email !== undefined && payload.email !== user.email) {
    const existing = await User.findOne({ email: payload.email, _id: { $ne: user._id } });
    if (existing) {
      throw new ApiError(409, 'Email already in use');
    }
    user.email = payload.email;
  }

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.address !== undefined) user.address = payload.address;

  await user.save();

  res.status(200).json({
    message: 'User profile updated',
    user,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await user.deleteOne();

  res.status(200).json({
    message: 'User deleted',
  });
});
