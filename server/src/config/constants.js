export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
};

export const ORDER_STATUS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export const RETURN_STATUS = ['pending', 'approved', 'rejected', 'picked_up', 'refunded'];

export const RETURN_REASON_TYPES = ['damaged_product', 'wrong_item', 'not_satisfied', 'other'];

export const REFUND_METHODS = ['wallet', 'manual_cash', 'bank_transfer'];

export const COMPLAINT_STATUS = ['open', 'in_progress', 'resolved', 'closed'];

export const PAYMENT_METHODS = ['cod', 'installment', 'gift_card'];
export const GIFT_CARD_STATUSES = ['active', 'inactive'];

export const FAILED_LOGIN_LIMIT = 5;
export const ACCOUNT_LOCK_MINUTES = 15;
