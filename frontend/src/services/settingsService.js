import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const settingsService = {
  // Fiscal Year Settings
  getAllFiscalYears: () => 
    axios.get(`${API_URL}/settings/fiscal-years/`, { headers: getAuthHeaders() }),
  
  getActiveFiscalYear: () => 
    axios.get(`${API_URL}/settings/fiscal-years/active/`, { headers: getAuthHeaders() }),
  
  getFiscalYear: (id) => 
    axios.get(`${API_URL}/settings/fiscal-years/${id}/`, { headers: getAuthHeaders() }),
  
  createFiscalYear: (data) => 
    axios.post(`${API_URL}/settings/fiscal-years/`, data, { headers: getAuthHeaders() }),
  
  updateFiscalYear: (id, data) => 
    axios.put(`${API_URL}/settings/fiscal-years/${id}/`, data, { headers: getAuthHeaders() }),
  
  deleteFiscalYear: (id) => 
    axios.delete(`${API_URL}/settings/fiscal-years/${id}/`, { headers: getAuthHeaders() }),
  
  setActiveFiscalYear: (id) => 
    axios.post(`${API_URL}/settings/fiscal-years/${id}/set_active/`, {}, { headers: getAuthHeaders() }),
};
