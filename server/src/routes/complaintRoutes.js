import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  addComplaintMessage,
  createComplaint,
  getComplaints,
  getMyComplaints,
  respondToComplaint,
} from '../controllers/complaintController.js';
import { protect } from '../middleware/auth.js';
import authorize from '../middleware/authorize.js';
import { upload } from '../middleware/upload.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect);

router.post(
  '/',
  upload.single('attachment'),
  [
    body('orderId').optional().isMongoId(),
    body('subject').isLength({ min: 3, max: 200 }).withMessage('Subject must be 3-200 characters'),
    body('message').isLength({ min: 10, max: 2000 }).withMessage('Message must be 10-2000 characters'),
  ],
  validateRequest,
  createComplaint
);

router.get('/mine', getMyComplaints);

router.get(
  '/',
  authorize('admin', 'staff'),
  [
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validateRequest,
  getComplaints
);

// Add threaded message (customer follow-up or admin/staff reply)
router.post(
  '/:id/messages',
  [
    param('id').isMongoId(),
    body('message').isLength({ min: 2, max: 2000 }).withMessage('Message must be 2-2000 characters'),
  ],
  validateRequest,
  addComplaintMessage
);

// Admin/staff: update status, respond, assign
router.patch(
  '/:id',
  authorize('admin', 'staff'),
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    body('adminResponse').optional().isLength({ max: 2000 }),
    body('assignedTo').optional().isMongoId(),
  ],
  validateRequest,
  respondToComplaint
);

export default router;
