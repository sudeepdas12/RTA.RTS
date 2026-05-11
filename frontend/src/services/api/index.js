// Minimal in-src API shims so CRA builds don't import files outside `src`.
// Tests will continue to mock these modules as needed.

const resolved = (v = {}) => Promise.resolve(v);

export const reportService = {
  getDashboard: () => resolved({}),
};

// Backwards-compat alias used by some tests/components
export const reports = reportService;

export const authService = {
  // Accept either (username, password) or a credentials object
  login: (a, b) => {
    if (typeof a === 'object') return resolved({ access: null, refresh: null, user: {} });
    return resolved({ access: null, refresh: null, user: {} });
  },
};

export const pendingService = {
  getAll: () => resolved({ data: { results: [], count: 0 } }),
};

export const settingsService = { get: () => resolved({}) };
export const companyService = { list: () => resolved([]) };
export const interestService = { list: () => resolved([]) };
export const dividendService = { list: () => resolved([]) };
export const clientService = { list: () => resolved([]) };

export function getApiErrorMessage(err) {
  if (!err) return 'Unknown API error';
  if (err.response && err.response.data) return err.response.data.error || JSON.stringify(err.response.data);
  return err.message || String(err);
}

const api = {
  reportService,
  reports,
  authService,
  pendingService,
  settingsService,
  companyService,
  interestService,
  dividendService,
  clientService,
  getApiErrorMessage,
};

export default api;
// end of in-src shim
