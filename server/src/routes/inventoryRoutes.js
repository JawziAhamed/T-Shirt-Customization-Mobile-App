import { Router } from 'express';
import { body, param } from 'express-validator';

import { adjustStock, getInventory, lowStockAlerts, updateInventoryItem } from '../controllers/inventoryController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect, authorize('admin', 'staff'));

router.get('/', getInventory);
router.get('/alerts/low-stock', lowStockAlerts);
router.patch(
  '/:id',
  [param('id').isMongoId(), body('stock').optional().isInt({ min: 0 }), body('lowStockThreshold').optional().isInt({ min: 0 }), body('restocked').optional().isBoolean()],
  validateRequest,
  updateInventoryItem
);
router.post(
  '/adjust',
  [body('productId').isMongoId(), body('changeBy').isInt()],
  validateRequest,
  adjustStock
);

export default router;
