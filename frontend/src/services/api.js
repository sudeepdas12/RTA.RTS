import api, { getApiErrorMessage, normalizeApiError } from './api/client';
import { authService } from './api/authService';
import { companyService, clientService } from './api/masterDataServices';
import { interestService, dividendService } from './api/payablesServices';
import {
  reconciliationService,
  reportService,
  userService,
  roleService,
  auditService,
  pendingService,
  settingsService,
} from './api/operationsServices';

export default api;

export {
  getApiErrorMessage,
  normalizeApiError,
  authService,
  companyService,
  clientService,
  interestService,
  dividendService,
  reconciliationService,
  reportService,
  // Backwards-compat alias
  reportService as reports,
  userService,
  roleService,
  auditService,
  pendingService,
  settingsService,
};
