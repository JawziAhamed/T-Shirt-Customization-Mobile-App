import apiClient from './apiClient';

export const productService = {
  getProducts: (params) => apiClient.get('/products', { params }),
  getProductById: (id) => apiClient.get(`/products/${id}`),
  createProduct: (formData) =>
    apiClient.post('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProduct: (id, formData) =>
    apiClient.put(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`),
};
