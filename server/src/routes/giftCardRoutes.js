import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  applyGiftCard,
  createGiftCards,
  deleteGiftCard,
  getGiftCards,
  updateGiftCardStatus,
  validateGiftCard,
} from '../controllers/giftCardController.js';
import { GIFT_CARD_STATUSES } from '../config/constants.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/validate',
  protect,
  [body('code').isString().trim().notEmpty()],
  validateRequest,
  validateGiftCard
);

router.post(
  '/apply',
  protect,
  [body('code').isString().trim().notEmpty(), body('amount').isFloat({ min: 0 })],
  validateRequest,
  applyGiftCard
);

router.get('/', protect, authorize('admin', 'staff'), getGiftCards);

router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  [
    body('initial_balance').isFloat({ min: 0.01 }),
    body('expiry_date').optional({ checkFalsy: true }).isISO8601(),
    body('status').optional().isIn(GIFT_CARD_STATUSES),
    body('quantity').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  createGiftCards
);

router.patch(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  [param('id').isMongoId(), body('status').isIn(GIFT_CARD_STATUSES)],
  validateRequest,
  updateGiftCardStatus
);

router.delete(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  [param('id').isMongoId()],
  validateRequest,
  deleteGiftCard
);

export default router;
