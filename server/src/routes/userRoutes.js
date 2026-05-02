import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUserProfile,
  updateUserRole,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.get('/:id', [param('id').isMongoId()], validateRequest, getUserById);
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 80 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('role').optional().isIn(['admin', 'staff', 'customer']),
    body('phone').optional().isLength({ min: 0, max: 30 }),
    body('address').optional().isLength({ min: 0, max: 255 }),
  ],
  validateRequest,
  createUser
);
router.patch(
  '/:id/role',
  [param('id').isMongoId(), body('role').isIn(['admin', 'staff', 'customer'])],
  validateRequest,
  updateUserRole
);
router.patch(
  '/:id/profile',
  [
    param('id').isMongoId(),
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().isLength({ min: 2, max: 80 }),
    body('phone').optional().trim().isLength({ max: 30 }),
    body('address').optional().trim().isLength({ max: 255 }),
  ],
  validateRequest,
  updateUserProfile
);
router.delete('/:id', [param('id').isMongoId()], validateRequest, deleteUser);

export default router;
