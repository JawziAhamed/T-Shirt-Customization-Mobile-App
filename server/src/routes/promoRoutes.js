import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createPromoCode,
  deletePromoCode,
  getPromoCodes,
  sendPromotionalAlert,
  updatePromoCode,
} from '../controllers/promoController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.get('/', getPromoCodes);

router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  [
    body('code').isLength({ min: 3, max: 30 }),
    body('discountType').isIn(['percent', 'fixed']),
    body('discountValue').isFloat({ min: 0 }),
    body('description').optional().isLength({ max: 300 }),
    body('minOrderValue').optional().isFloat({ min: 0 }),
    body('maxDiscount').optional().isFloat({ min: 0 }),
    body('usageLimit').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean(),
    body('newCustomersOnly').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
    body('promotionalAlert').optional().isLength({ max: 500 }),
  ],
  validateRequest,
  createPromoCode
);

router.patch(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  [
    param('id').isMongoId(),
    body('discountType').optional().isIn(['percent', 'fixed']),
    body('discountValue').optional().isFloat({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('newCustomersOnly').optional().isBoolean(),
    body('expiresAt').optional().isISO8601(),
  ],
  validateRequest,
  updatePromoCode
);

router.delete('/:id', protect, authorize('admin', 'staff'), [param('id').isMongoId()], validateRequest, deletePromoCode);

router.post(
  '/broadcast',
  protect,
  authorize('admin', 'staff'),
  [body('message').isLength({ min: 5, max: 1000 })],
  validateRequest,
  sendPromotionalAlert
);

export default router;
