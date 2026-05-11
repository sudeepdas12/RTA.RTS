import api from './client';

export const authService = {
  login: (credentials) => api.post('/users/login/', credentials),
  logout: (refreshToken) => api.post('/users/logout/', { refresh: refreshToken }),
  getProfile: () => api.get('/users/profile/'),
  changePassword: (data) => api.post('/users/change_password/', data),
};
