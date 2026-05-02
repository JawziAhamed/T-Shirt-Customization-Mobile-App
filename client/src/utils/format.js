import { colors } from '../theme';

export const currency = (value) =>
  'Rs ' +
  new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const relativeTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  const format = (count, unit) => {
    const plural = Math.abs(count) === 1 ? unit : `${unit}s`;
    if (count === 0) return 'just now';
    return count < 0 ? `${Math.abs(count)} ${plural} ago` : `in ${count} ${plural}`;
  };

  const units = [
    { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
    { unit: 'day', ms: 1000 * 60 * 60 * 24 },
    { unit: 'hour', ms: 1000 * 60 * 60 },
    { unit: 'minute', ms: 1000 * 60 },
    { unit: 'second', ms: 1000 },
  ];

  for (const { unit, ms } of units) {
    if (absMs >= ms || unit === 'second') {
      const count = Math.round(diffMs / ms);
      return format(count, unit);
    }
  }

  return 'just now';
};

export const truncate = (value, length = 80) => {
  const text = String(value || '');
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
};

export const statusColor = (value = '') => {
  const status = String(value).toLowerCase();
  if (['paid', 'delivered', 'approved', 'resolved', 'active'].includes(status)) return colors.success;
  if (['cancelled', 'rejected', 'expired', 'blocked', 'failed'].includes(status)) return colors.danger;
  if (['pending', 'open', 'partially_paid'].includes(status)) return colors.warning;
  return colors.info;
};

export const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
