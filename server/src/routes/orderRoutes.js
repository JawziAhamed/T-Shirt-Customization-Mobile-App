import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createOrder,
  getMyOrders,
  getMyPayments,
  getOrderById,
  getOrderQuote,
  getOrders,
  payInstallment,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect);

router.post('/quote', getOrderQuote);
router.post(
  '/',
  upload.single('designFile'),
  [
    body('items').isArray({ min: 1 }),
    body('deliveryAddress').isObject(),
    body('paymentMethod').isIn(['cod', 'installment', 'gift_card']),
  ],
  validateRequest,
  createOrder
);
router.get('/mine', getMyOrders);
router.get('/payments/mine', getMyPayments);
router.get('/:id', [param('id').isMongoId()], validateRequest, getOrderById);
router.patch(
  '/:id/status',
  authorize('admin', 'staff'),
  [param('id').isMongoId(), body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])],
  validateRequest,
  updateOrderStatus
);
router.post('/:id/installment-pay', [param('id').isMongoId()], validateRequest, payInstallment);
router.get('/', authorize('admin', 'staff'), getOrders);

export default router;
