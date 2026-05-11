import api from './client';

export const interestService = {
  getAll: (params) => api.get('/payables/interest/', { params }),
  getOne: (id) => api.get(`/payables/interest/${id}/`),
  create: (data) => api.post('/payables/interest/', data),
  update: (id, data) => api.put(`/payables/interest/${id}/`, data),
  delete: (id) => api.delete(`/payables/interest/${id}/`),
  getSummary: (params) => api.get('/payables/interest/summary/', { params }),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/payables/interest/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const dividendService = {
  getAll: (params) => api.get('/payables/dividend/', { params }),
  getOne: (id) => api.get(`/payables/dividend/${id}/`),
  create: (data) => api.post('/payables/dividend/', data),
  update: (id, data) => api.put(`/payables/dividend/${id}/`, data),
  delete: (id) => api.delete(`/payables/dividend/${id}/`),
  getSummary: (params) => api.get('/payables/dividend/summary/', { params }),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/payables/dividend/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
