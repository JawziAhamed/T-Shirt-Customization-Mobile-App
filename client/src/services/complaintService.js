import apiClient from './apiClient';

export const complaintService = {
  createComplaint: (formData) =>
    apiClient.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMyComplaints: () => apiClient.get('/complaints/mine'),
  getAllComplaints: (params) => apiClient.get('/complaints', { params }),
  addMessage: (id, payload) => apiClient.post(`/complaints/${id}/messages`, payload),
  updateComplaint: (id, payload) => apiClient.patch(`/complaints/${id}`, payload),
};
