import { ROLES } from '../config/constants.js';
import { notifyRoles } from './notificationService.js';

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toProductName = (value) => {
  const normalized = String(value || '').trim();
  return normalized || 'Product';
};

export const evaluateLowStockAlertState = (inventory) => {
  const stock = toNumber(inventory?.stock, 0);
  const threshold = toNumber(inventory?.lowStockThreshold, 0);
  const isLowStock = stock <= threshold;
  const alertActive = Boolean(inventory?.lowStockAlertActive);

  if (isLowStock && !alertActive) {
    inventory.lowStockAlertActive = true;
    inventory.lastLowStockAlertAt = new Date();

    return {
      isLowStock,
      shouldNotify: true,
      stock,
      threshold,
    };
  }

  if (!isLowStock && alertActive) {
    inventory.lowStockAlertActive = false;
  }

  return {
    isLowStock,
    shouldNotify: false,
    stock,
    threshold,
  };
};

export const notifyLowStockForRoles = async ({
  productName,
  stock,
  threshold,
  productId,
  inventoryId,
}) => {
  const safeProductName = toProductName(productName);
  const safeStock = toNumber(stock, 0);
  const safeThreshold = toNumber(threshold, 0);

  return notifyRoles({
    roles: [ROLES.ADMIN, ROLES.STAFF],
    title: `Low stock: ${safeProductName}`,
    message: `${safeProductName} stock is low. Current stock: ${safeStock}. Threshold: ${safeThreshold}.`,
    type: 'inventory',
    link: '/admin/inventory',
    metadata: {
      productId: productId ? String(productId) : '',
      inventoryId: inventoryId ? String(inventoryId) : '',
      productName: safeProductName,
      stock: safeStock,
      threshold: safeThreshold,
      alertType: 'low_stock',
    },
  });
};
