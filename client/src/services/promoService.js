import apiClient from './apiClient';

export const promoService = {
  getPromos: () => apiClient.get('/promos'),
  createPromo: (payload) => apiClient.post('/promos', payload),
  updatePromo: (id, payload) => apiClient.patch(`/promos/${id}`, payload),
  deletePromo: (id) => apiClient.delete(`/promos/${id}`),
  broadcast: (payload) => apiClient.post('/promos/broadcast', payload),
};
