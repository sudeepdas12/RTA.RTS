import api from './client';

export const companyService = {
  getAll: (params) => api.get('/companies/', { params }),
  getOne: (id) => api.get(`/companies/${id}/`),
  create: (data) => api.post('/companies/', data),
  update: (id, data) => api.put(`/companies/${id}/`, data),
  delete: (id) => api.delete(`/companies/${id}/`),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/companies/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => api.get('/companies/export_template/', { responseType: 'blob' }),
};

export const clientService = {
  getAll: (params) => api.get('/clients/', { params }),
  getOne: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.put(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/clients/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: () => api.get('/clients/export_template/', { responseType: 'blob' }),
};
