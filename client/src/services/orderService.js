import apiClient from './apiClient';

export const orderService = {
  quote: (payload) => apiClient.post('/orders/quote', payload),
  createOrder: (payload) => apiClient.post('/orders', payload),
  getMyOrders: (params) => apiClient.get('/orders/mine', { params }),
  getAllOrders: (params) => apiClient.get('/orders', { params }),
  getOrderById: (id) => apiClient.get(`/orders/${id}`),
  updateOrderStatus: (id, payload) => apiClient.patch(`/orders/${id}/status`, payload),
  payInstallment: (id) => apiClient.post(`/orders/${id}/installment-pay`),
  getMyPayments: () => apiClient.get('/orders/payments/mine'),
};
