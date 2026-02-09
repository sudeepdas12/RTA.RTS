import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API Services
export const authService = {
  login: (credentials) => api.post('/users/login/', credentials),
  logout: (refreshToken) => api.post('/users/logout/', { refresh: refreshToken }),
  getProfile: () => api.get('/users/profile/'),
  changePassword: (data) => api.post('/users/change_password/', data),
};

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
