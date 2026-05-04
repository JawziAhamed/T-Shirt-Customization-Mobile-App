export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
};

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

export const RETURN_STATUSES = ['pending', 'approved', 'rejected', 'picked_up', 'refunded'];

export const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export const GIFT_CARD_STATUSES = ['active', 'inactive', 'blocked'];

export const PAYMENT_METHODS = [
  { label: 'Cash on Delivery', value: 'cod' },
  { label: '3-Month Installment', value: 'installment' },
  { label: 'Gift Card', value: 'gift_card' },
];

export const DISTRICTS = [
  { name: 'Colombo', province: 'Western', fee: 250 },
  { name: 'Gampaha', province: 'Western', fee: 300 },
  { name: 'Kalutara', province: 'Western', fee: 350 },
  { name: 'Ratnapura', province: 'Sabaragamuwa', fee: 350 },
  { name: 'Kegalle', province: 'Sabaragamuwa', fee: 375 },
  { name: 'Kurunegala', province: 'North Western', fee: 400 },
  { name: 'Puttalam', province: 'North Western', fee: 450 },
  { name: 'Kandy', province: 'Central', fee: 450 },
  { name: 'Matale', province: 'Central', fee: 500 },
  { name: 'Nuwara Eliya', province: 'Central', fee: 525 },
  { name: 'Galle', province: 'Southern', fee: 475 },
  { name: 'Matara', province: 'Southern', fee: 525 },
  { name: 'Hambantota', province: 'Southern', fee: 575 },
  { name: 'Anuradhapura', province: 'North Central', fee: 575 },
  { name: 'Polonnaruwa', province: 'North Central', fee: 575 },
  { name: 'Trincomalee', province: 'Eastern', fee: 600 },
  { name: 'Ampara', province: 'Eastern', fee: 625 },
  { name: 'Batticaloa', province: 'Eastern', fee: 650 },
  { name: 'Badulla', province: 'Uva', fee: 575 },
  { name: 'Moneragala', province: 'Uva', fee: 625 },
  { name: 'Vavuniya', province: 'Northern', fee: 650 },
  { name: 'Mannar', province: 'Northern', fee: 675 },
  { name: 'Kilinochchi', province: 'Northern', fee: 700 },
  { name: 'Jaffna', province: 'Northern', fee: 700 },
  { name: 'Mullaitivu', province: 'Northern', fee: 725 },
];
