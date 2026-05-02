import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  createReturnRequest,
  getMyReturnRequests,
  getReturnRequests,
  updateReturnRequest,
} from '../controllers/returnController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect);

router.post(
  '/',
  upload.single('damagedImage'),
  [
    body('orderId').isMongoId().withMessage('Valid orderId is required'),
    body('reasonType')
      .isIn(['damaged_product', 'wrong_item', 'not_satisfied', 'other'])
      .withMessage('Invalid reasonType'),
    body('reason').optional().isLength({ max: 1000 }),
    body('description').optional().isLength({ max: 2000 }),
  ],
  validateRequest,
  createReturnRequest
);

router.get('/mine', getMyReturnRequests);

router.get(
  '/',
  authorize('admin', 'staff'),
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'picked_up', 'refunded']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validateRequest,
  getReturnRequests
);

router.patch(
  '/:id',
  authorize('admin', 'staff'),
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['pending', 'approved', 'rejected', 'picked_up', 'refunded']),
    body('refundAmount').optional().isFloat({ min: 0 }),
    body('refundMethod').optional().isIn(['wallet', 'manual_cash', 'bank_transfer']),
    body('refundTransactionRef').optional().isLength({ max: 200 }),
    body('adminResponse').optional().isLength({ max: 2000 }),
    body('internalNotes').optional().isLength({ max: 2000 }),
    body('statusNote').optional().isLength({ max: 500 }),
  ],
  validateRequest,
  updateReturnRequest
);

export default router;
