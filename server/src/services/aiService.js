import OpenAI from 'openai';

const createFallbackBase64 = (prompt) => {
  const safePrompt = prompt.substring(0, 40).replace(/</g, '').replace(/>/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100%" height="100%" fill="#0f172a"/><circle cx="512" cy="400" r="220" fill="#14b8a6" opacity="0.85"/><text x="50%" y="73%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-size="54" font-family="Arial">${safePrompt || 'CUSTOM TEE'}</text></svg>`;
  return Buffer.from(svg).toString('base64');
};

export const generateDesignImage = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createFallbackBase64(prompt);
  }

  const client = new OpenAI({ apiKey });

  const response = await client.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size: '1024x1024',
  });

  const imageData = response.data?.[0];

  if (imageData?.b64_json) {
    return imageData.b64_json;
  }

  if (imageData?.url) {
    const result = await fetch(imageData.url);
    const arrayBuffer = await result.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  }

  return createFallbackBase64(prompt);
};
