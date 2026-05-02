import apiClient from './apiClient';

export const aiService = {
  generateDesign: (payload) => apiClient.post('/ai/generate', payload),
};
