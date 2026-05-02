import { Router } from 'express';
import { body } from 'express-validator';

import {
  changeCurrentPassword,
  forgotPassword,
  getCurrentUser,
  getCurrentUserActivity,
  login,
  logout,
  register,
  resetPassword,
  updateCurrentUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { upload } from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('phone').optional().isLength({ min: 7, max: 20 }),
    body('address').optional().isLength({ min: 5, max: 255 }),
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8 })],
  validateRequest,
  login
);

router.post('/forgot-password', authLimiter, [body('email').isEmail().normalizeEmail()], validateRequest, forgotPassword);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').notEmpty(), body('newPassword').isLength({ min: 8 })],
  validateRequest,
  resetPassword
);

router.get('/me', protect, getCurrentUser);
router.put(
  '/me',
  protect,
  upload.single('avatar'),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('address').optional().trim().isLength({ max: 255 }),
  ],
  validateRequest,
  updateCurrentUser
);
router.post(
  '/change-password',
  protect,
  [body('currentPassword').isLength({ min: 8 }), body('newPassword').isLength({ min: 8 })],
  validateRequest,
  changeCurrentPassword
);
router.get('/activity', protect, getCurrentUserActivity);
router.post('/logout', protect, logout);

export default router;
