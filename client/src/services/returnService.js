import apiClient from './apiClient';

export const returnService = {
  createReturn: (formData) =>
    apiClient.post('/returns', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyReturns: () => apiClient.get('/returns/mine'),
  getAllReturns: (params) => apiClient.get('/returns', { params }),
  updateReturn: (id, payload) => apiClient.patch(`/returns/${id}`, payload),
};
