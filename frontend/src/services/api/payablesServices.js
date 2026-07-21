import api from './client';

const createCrudService = (endpoint) => ({
  getAll: (params = {}) => api.get(`${endpoint}/`, { params }),
  getById: (id) => api.get(`${endpoint}/${id}/`),
  create: (data) => api.post(`${endpoint}/`, data),
  update: (id, data) => api.put(`${endpoint}/${id}/`, data),
  patch: (id, data) => api.patch(`${endpoint}/${id}/`, data),
  delete: (id) => api.delete(`${endpoint}/${id}/`),
});

export const interestService = createCrudService('/payables/interest');
export const dividendService = createCrudService('/payables/dividend');
