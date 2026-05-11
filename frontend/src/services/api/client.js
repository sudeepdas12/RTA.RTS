import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
const API_TIMEOUT_MS = Number(process.env.REACT_APP_API_TIMEOUT_MS || 30000);

let refreshPromise = null;

const clearSessionAndRedirect = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

export const normalizeApiError = (error) => {
  const responseData = error?.response?.data;
  const requestId =
    error?.response?.headers?.['x-request-id'] ||
    responseData?.request_id ||
    null;

  const message =
    responseData?.message ||
    responseData?.error ||
    responseData?.detail ||
    error?.message ||
    'Request failed';

  return {
    ...error,
    friendlyMessage: message,
    requestId,
    statusCode: error?.response?.status,
  };
};

export const getApiErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.friendlyMessage ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.detail ||
  error?.message ||
  fallback;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const isRefreshRequest = config?.url?.includes('/auth/refresh/');
    const isLoginRequest = config?.url?.includes('/users/login/') || config?.url?.includes('/auth/login/');

    if (isRefreshRequest || isLoginRequest) {
      return config;
    }

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh/');
    const isLoginRequest = originalRequest?.url?.includes('/users/login/') || originalRequest?.url?.includes('/auth/login/');

    if (error?.response?.status === 401 && !originalRequest._retry && !isRefreshRequest && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          clearSessionAndRedirect();
          return Promise.reject(normalizeApiError(error));
        }

        if (!refreshPromise) {
          refreshPromise = axios
            .post(
              `${API_BASE_URL}/auth/refresh/`,
              { refresh: refreshToken },
              {
                timeout: API_TIMEOUT_MS,
                headers: { 'Content-Type': 'application/json' },
              }
            )
            .then((response) => {
              const { access } = response.data || {};
              if (!access) {
                throw new Error('Unable to refresh access token');
              }
              localStorage.setItem('access_token', access);
              return access;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const access = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearSessionAndRedirect();
        return Promise.reject(normalizeApiError(refreshError));
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

export default api;
