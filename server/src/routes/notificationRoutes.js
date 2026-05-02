import { Router } from 'express';
import { param } from 'express-validator';

import {
  clearNotifications,
  deleteNotification,
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', [param('id').isMongoId()], validateRequest, markNotificationAsRead);
router.delete('/clear', clearNotifications);
router.delete('/:id', [param('id').isMongoId()], validateRequest, deleteNotification);

export default router;
