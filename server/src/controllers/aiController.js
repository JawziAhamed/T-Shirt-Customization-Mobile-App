import { generateDesignImage } from '../services/aiService.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

export const generateAiDesign = asyncHandler(async (req, res) => {
  const prompt = String(req.body.prompt || '').trim();

  if (!prompt) {
    throw new ApiError(400, 'Prompt is required');
  }

  const image = await generateDesignImage(prompt);

  res.status(200).json({
    photo: image,
  });
});
