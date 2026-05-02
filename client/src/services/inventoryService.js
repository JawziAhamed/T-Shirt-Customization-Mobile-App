import apiClient from './apiClient';

export const inventoryService = {
  getInventory: () => apiClient.get('/inventory'),
  getLowStockAlerts: () => apiClient.get('/inventory/alerts/low-stock'),
  updateInventoryItem: (id, payload) => apiClient.patch(`/inventory/${id}`, payload),
  adjustStock: (payload) => apiClient.post('/inventory/adjust', payload),
};
