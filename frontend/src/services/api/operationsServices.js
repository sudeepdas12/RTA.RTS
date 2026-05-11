import api from './client';

export const reconciliationService = {
  getBankStatements: (params) => api.get('/reconciliation/bank-statements/', { params }),
  getBankTransactions: (params) => api.get('/reconciliation/bank-transactions/', { params }),
  getReconciliations: (params) => api.get('/reconciliation/', { params }),
  uploadBankStatement: (data, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_name', data.bank_name);
    formData.append('account_no', data.account_no);
    formData.append('statement_from', data.statement_from);
    formData.append('statement_to', data.statement_to);
    return api.post('/reconciliation/bank-statements/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  autoMatch: (bankStmtId) => api.post('/reconciliation/auto_match/', { bank_stmt_id: bankStmtId }),
  createReconciliation: (data) => api.post('/reconciliation/', data),
};

export const reportService = {
  getDashboard: () => api.get('/reports/dashboard/'),
  exportInterest: (params) => api.get('/reports/export/interest/', {
    params,
    responseType: 'blob'
  }),
  exportDividend: (params) => api.get('/reports/export/dividend/', {
    params,
    responseType: 'blob'
  }),
  getInterestReco: (params) => api.get('/reports/reco/interest/', { params }),
  exportInterestReco: (params) => api.get('/reports/reco/interest/export/', { params, responseType: 'blob' }),
  getDividendReco: (params) => api.get('/reports/reco/dividend/', { params }),
  exportDividendReco: (params) => api.get('/reports/reco/dividend/export/', { params, responseType: 'blob' }),
  exportCombinedReco: (params) => api.get('/reports/reco/combined/export/', { params, responseType: 'blob' }),
  getSectorSummary: (params) => api.get('/reports/sector-summary/', { params }),
  exportSectorSummary: (params) => api.get('/reports/export/sector-summary/', { params, responseType: 'blob' }),
};

export const userService = {
  getAll: (params) => api.get('/users/', { params }),
  getOne: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
};

export const roleService = {
  getAll: () => api.get('/users/roles/'),
  getOne: (id) => api.get(`/users/roles/${id}/`),
  create: (data) => api.post('/users/roles/', data),
  update: (id, data) => api.put(`/users/roles/${id}/`, data),
};

export const auditService = {
  getAll: (params) => api.get('/audit/', { params }),
};

export const pendingService = {
  getAll: (params) => api.get('/users/pending-changes/', { params }),
  create: (data) => api.post('/users/pending-changes/', data),
  approve: (id) => api.post(`/users/pending-changes/${id}/approve/`),
  reject: (id, data) => api.post(`/users/pending-changes/${id}/reject/`, data),
};

export const settingsService = {
  getAllFiscalYears: (params) => api.get('/settings/fiscal-years/', { params }),
  getActiveFiscalYear: (params) => api.get('/settings/fiscal-years/active/', { params }),
  getFiscalYear: (id) => api.get(`/settings/fiscal-years/${id}/`),
  createFiscalYear: (data) => api.post('/settings/fiscal-years/', data),
  updateFiscalYear: (id, data) => api.put(`/settings/fiscal-years/${id}/`, data),
  deleteFiscalYear: (id) => api.delete(`/settings/fiscal-years/${id}/`),
  setActiveFiscalYear: (id) => api.post(`/settings/fiscal-years/${id}/set_active/`),
  bulkUploadFiscalYears: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/settings/fiscal-years/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};
