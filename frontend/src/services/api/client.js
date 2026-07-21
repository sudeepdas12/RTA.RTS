import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const normalizeApiError = (error) => {
  const data = error?.response?.data;
  if (!data) {
    return { detail: error?.message || 'Request failed' };
  }
  return data;
};

export const getApiErrorMessage = (error) => {
  const data = normalizeApiError(error);
  if (typeof data === 'string') return data;
  return data.detail || data.error || data.message || 'Request failed';
};

export default api;
