import apiClient from './apiClient';

export const userService = {
  getUsers: () => apiClient.get('/users'),
  getUserById: (id) => apiClient.get(`/users/${id}`),
  createUser: (payload) => apiClient.post('/users', payload),
  updateUserRole: (id, payload) => apiClient.patch(`/users/${id}/role`, payload),
  updateUserProfile: (id, payload) => apiClient.patch(`/users/${id}/profile`, payload),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};
