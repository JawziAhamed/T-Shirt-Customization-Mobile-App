import { Router } from 'express';
import { body } from 'express-validator';

import { generateAiDesign } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/generate',
  protect,
  [body('prompt').isLength({ min: 3, max: 500 })],
  validateRequest,
  generateAiDesign
);

export default router;
