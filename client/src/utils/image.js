import { ASSET_URL } from '../config/env';

const PRODUCT_IMAGE_FALLBACKS = [
  {
    match: ['classic cotton tee', 'classic', 'cotton'],
    url: 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: ['urban streetwear tee', 'urban', 'streetwear'],
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: ['sports performance tee', 'sports', 'performance'],
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: ['eco recycled tee', 'eco', 'recycled'],
    url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    match: ['premium polo tee', 'premium', 'polo'],
    url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80',
  },
];

export const resolveProductImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';

  const trimmed = imageUrl.trim();
  if (!trimmed) return '';

  if (/^data:image\//i.test(trimmed) || /^file:\/\//i.test(trimmed) || /^content:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${ASSET_URL}${normalizedPath}`;
};

export const resolveProductDisplayImageUrl = (product = {}) => {
  const candidates = [product?.imageUrl, product?.image, ...(Array.isArray(product?.gallery) ? product.gallery : [])];

  for (const candidate of candidates) {
    const resolved = resolveProductImageUrl(candidate);
    if (resolved) return resolved;
  }

  const haystack = `${product?.name || ''} ${product?.description || ''} ${(product?.tags || []).join(' ')}`.toLowerCase();
  const fallbackMatch = PRODUCT_IMAGE_FALLBACKS.find((fallback) => fallback.match.some((token) => haystack.includes(token)));
  return fallbackMatch?.url || 'https://images.unsplash.com/photo-1618354691438-25bc04584c23?auto=format&fit=crop&w=1200&q=80';
};
