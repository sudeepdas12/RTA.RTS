import api from './client';

const createCrudService = (endpoint) => ({
  getAll: (params = {}) => api.get(`${endpoint}/`, { params }),
  getById: (id) => api.get(`${endpoint}/${id}/`),
  create: (data) => api.post(`${endpoint}/`, data),
  update: (id, data) => api.put(`${endpoint}/${id}/`, data),
  patch: (id, data) => api.patch(`${endpoint}/${id}/`, data),
  delete: (id) => api.delete(`${endpoint}/${id}/`),
});

export const reconciliationService = createCrudService('/reconciliation');

export const reportService = {
  getDashboard: () => api.get('/reports/dashboard/'),
  exportInterest: (params = {}) => api.get('/reports/export/interest/', { params, responseType: 'blob' }),
  exportDividend: (params = {}) => api.get('/reports/export/dividend/', { params, responseType: 'blob' }),
  getInterestReco: (params = {}) => api.get('/reports/reco/interest/', { params }),
  exportInterestReco: (params = {}) => api.get('/reports/reco/interest/export/', { params, responseType: 'blob' }),
  getDividendReco: (params = {}) => api.get('/reports/reco/dividend/', { params }),
  exportDividendReco: (params = {}) => api.get('/reports/reco/dividend/export/', { params, responseType: 'blob' }),
};

export const userService = createCrudService('/users');
export const roleService = createCrudService('/users/roles');
export const auditService = createCrudService('/audit');

export const pendingService = {
  getAll: (params = {}) => api.get('/users/pending-changes/', { params }),
  getById: (id) => api.get(`/users/pending-changes/${id}/`),
  create: (data) => api.post('/users/pending-changes/', data),
  approve: (id) => api.post(`/users/pending-changes/${id}/approve/`),
  reject: (id, data = {}) => api.post(`/users/pending-changes/${id}/reject/`, data),
};

export const settingsService = {
  getAllFiscalYears: (params = {}) => api.get('/settings/fiscal-years/', { params }),
  getActiveFiscalYear: (params = {}) => api.get('/settings/fiscal-years/active/', { params }),
  getFiscalYear: (id) => api.get(`/settings/fiscal-years/${id}/`),
  createFiscalYear: (data) => api.post('/settings/fiscal-years/', data),
  updateFiscalYear: (id, data) => api.put(`/settings/fiscal-years/${id}/`, data),
  deleteFiscalYear: (id) => api.delete(`/settings/fiscal-years/${id}/`),
  setActiveFiscalYear: (id) => api.post(`/settings/fiscal-years/${id}/set_active/`, {}),
  bulkUploadFiscalYears: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/settings/fiscal-years/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
