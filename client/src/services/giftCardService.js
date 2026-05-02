import apiClient from './apiClient';

export const giftCardService = {
  validate: (payload) => apiClient.post('/gift-cards/validate', payload),
  apply: (payload) => apiClient.post('/gift-cards/apply', payload),
  getGiftCards: () => apiClient.get('/gift-cards'),
  createGiftCards: (payload) => apiClient.post('/gift-cards', payload),
  updateGiftCardStatus: (id, payload) => apiClient.patch(`/gift-cards/${id}`, payload),
  deleteGiftCard: (id) => apiClient.delete(`/gift-cards/${id}`),
};
