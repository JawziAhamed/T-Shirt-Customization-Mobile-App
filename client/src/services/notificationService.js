import apiClient from './apiClient';

export const notificationService = {
  getNotifications: () => apiClient.get('/notifications'),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  clear: () => apiClient.delete('/notifications/clear'),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
};
