import api from './client';

export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: (refreshToken) => api.post('/users/logout/', { refresh: refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh/', { refresh: refreshToken }),
};
