import apiClient from './apiClient';

export const authService = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  forgotPassword: (payload) => apiClient.post('/auth/forgot-password', payload),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  me: () => apiClient.get('/auth/me'),
  updateProfile: (payload) =>
    apiClient.put('/auth/me', payload, payload instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' },
    } : undefined),
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
  getActivity: (params) => apiClient.get('/auth/activity', { params }),
  logout: () => apiClient.post('/auth/logout'),
};
