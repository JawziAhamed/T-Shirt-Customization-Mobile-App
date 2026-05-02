import axios from 'axios';

import { API_URL } from '../config/env';
import { authTokenStore } from './authToken';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = authTokenStore.getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Something went wrong';

    return Promise.reject({
      ...error,
      message,
    });
  }
);

export default apiClient;
