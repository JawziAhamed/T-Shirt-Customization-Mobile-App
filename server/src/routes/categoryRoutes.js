import { Router } from 'express';
import { body } from 'express-validator';

import { createCategory, getCategories } from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.get('/', getCategories);

router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('slug').optional().trim().isLength({ min: 2, max: 90 }),
    body('description').optional().trim().isLength({ max: 300 }),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  validateRequest,
  createCategory
);

export default router;
