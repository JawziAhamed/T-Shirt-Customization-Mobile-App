import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.get('/', getProducts);
router.get('/:id', [param('id').isMongoId()], validateRequest, getProductById);

router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  upload.single('image'),
  [
    body('name').trim().isLength({ min: 2, max: 150 }),
    body('description').trim().isLength({ min: 10, max: 1500 }),
    body('basePrice').isFloat({ min: 0 }),
    body('category').optional().trim().isLength({ min: 2, max: 100 }),
    body('categories').optional().custom((value) => typeof value === 'string' || Array.isArray(value)),
    body('stock').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('customArtworkAllowed').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  createProduct
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  upload.single('image'),
  [
    param('id').isMongoId(),
    body('name').optional().trim().isLength({ min: 2, max: 150 }),
    body('description').optional().trim().isLength({ min: 10, max: 1500 }),
    body('basePrice').optional().isFloat({ min: 0 }),
    body('category').optional().trim().isLength({ min: 2, max: 100 }),
    body('categories').optional().custom((value) => typeof value === 'string' || Array.isArray(value)),
    body('stock').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('customArtworkAllowed').optional().isBoolean(),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  updateProduct
);

router.delete('/:id', protect, authorize('admin', 'staff'), [param('id').isMongoId()], validateRequest, deleteProduct);

export default router;
