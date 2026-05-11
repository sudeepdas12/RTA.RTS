/**
 * React Query Custom Hooks for Server State Management
 * 
 * These hooks replace manual axios state management with caching,
 * automatic refetching, and synchronization across components.
 * 
 * Install: npm install react-query
 * Usage in App.tsx: Wrap with <QueryClientProvider client={queryClient}>
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from 'react-query';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Add JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// INTEREST PAYABLES HOOKS
// ============================================================================

interface InterestPayable {
  id: number;
  fiscal_year: string;
  company_id: number;
  client_id: number;
  gross_interest: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

interface PayablesListResponse {
  count: number;
  next?: string;
  previous?: string;
  page_count: number;
  current_page: number;
  page_size: number;
  results: InterestPayable[];
}

/**
 * Fetch interest payables with pagination and filtering
 * @param page - Page number (default: 1)
 * @param pageSize - Results per page (default: 50)
 * @param filters - Optional filters: { status, fiscal_year, company_id, search }
 */
export const useInterestPayables = (
  page: number = 1,
  pageSize: number = 50,
  filters: Record<string, any> = {}
): UseQueryResult<PayablesListResponse, Error> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  // Add filters
  if (filters.status) queryParams.append('payment_status', filters.status);
  if (filters.fiscal_year) queryParams.append('fiscal_year', filters.fiscal_year);
  if (filters.company_id) queryParams.append('company_id', filters.company_id);
  if (filters.search) queryParams.append('search', filters.search);

  return useQuery<PayablesListResponse, Error>(
    ['interestPayables', page, pageSize, filters],
    async () => {
      const { data } = await apiClient.get(`/payables/interest/?${queryParams}`);
      return data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      keepPreviousData: true,
    }
  );
};

/**
 * Fetch single interest payable by ID
 */
export const useInterestPayable = (id: number): UseQueryResult<InterestPayable, Error> => {
  return useQuery<InterestPayable, Error>(
    ['interestPayable', id],
    async () => {
      const { data } = await apiClient.get(`/payables/interest/${id}/`);
      return data;
    },
    {
      staleTime: 5 * 60 * 1000,
      enabled: !!id,
    }
  );
};

/**
 * Create or update interest payable
 */
export const useMutateInterestPayable = () => {
  const queryClient = useQueryClient();

  return useMutation<InterestPayable, Error, Partial<InterestPayable>>(
    async (payload) => {
      if (payload.id) {
        const { data } = await apiClient.patch(`/payables/interest/${payload.id}/`, payload);
        return data;
      } else {
        const { data } = await apiClient.post('/payables/interest/', payload);
        return data;
      }
    },
    {
      onSuccess: (data) => {
        // Invalidate interest payables list
        queryClient.invalidateQueries('interestPayables');
        // Update single record cache
        queryClient.setQueryData(['interestPayable', data.id], data);
      },
      onError: (error) => {
        console.error('Error saving interest payable:', error);
      },
    }
  );
};

/**
 * Delete interest payable
 */
export const useDeleteInterestPayable = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>(
    async (id) => {
      await apiClient.delete(`/payables/interest/${id}/`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('interestPayables');
      },
    }
  );
};

// ============================================================================
// DIVIDEND PAYABLES HOOKS
// ============================================================================

interface DividendPayable {
  id: number;
  fiscal_year: string;
  company_id: number;
  client_id: number;
  gross_dividend: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'pending' | 'paid' | 'partial';
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch dividend payables with pagination and filtering
 */
export const useDividendPayables = (
  page: number = 1,
  pageSize: number = 50,
  filters: Record<string, any> = {}
): UseQueryResult<PayablesListResponse, Error> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (filters.status) queryParams.append('payment_status', filters.status);
  if (filters.fiscal_year) queryParams.append('fiscal_year', filters.fiscal_year);
  if (filters.company_id) queryParams.append('company_id', filters.company_id);
  if (filters.search) queryParams.append('search', filters.search);

  return useQuery<PayablesListResponse, Error>(
    ['dividendPayables', page, pageSize, filters],
    async () => {
      const { data } = await apiClient.get(`/payables/dividend/?${queryParams}`);
      return data;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 3,
      keepPreviousData: true,
    }
  );
};

/**
 * Fetch single dividend payable by ID
 */
export const useDividendPayable = (id: number): UseQueryResult<DividendPayable, Error> => {
  return useQuery<DividendPayable, Error>(
    ['dividendPayable', id],
    async () => {
      const { data } = await apiClient.get(`/payables/dividend/${id}/`);
      return data;
    },
    {
      staleTime: 5 * 60 * 1000,
      enabled: !!id,
    }
  );
};

/**
 * Create or update dividend payable
 */
export const useMutateDividendPayable = () => {
  const queryClient = useQueryClient();

  return useMutation<DividendPayable, Error, Partial<DividendPayable>>(
    async (payload) => {
      if (payload.id) {
        const { data } = await apiClient.patch(`/payables/dividend/${payload.id}/`, payload);
        return data;
      } else {
        const { data } = await apiClient.post('/payables/dividend/', payload);
        return data;
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('dividendPayables');
        queryClient.setQueryData(['dividendPayable', data.id], data);
      },
    }
  );
};

/**
 * Delete dividend payable
 */
export const useDeleteDividendPayable = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>(
    async (id) => {
      await apiClient.delete(`/payables/dividend/${id}/`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('dividendPayables');
      },
    }
  );
};

// ============================================================================
// MASTER DATA HOOKS
// ============================================================================

interface Company {
  id: number;
  company_code: string;
  company_name: string;
  sector_type: 'private' | 'public' | 'tax-exempted';
  status: 'active' | 'inactive';
  created_at: string;
}

/**
 * Fetch all companies (typically small dataset, no pagination)
 */
export const useCompanies = (): UseQueryResult<Company[], Error> => {
  return useQuery<Company[], Error>(
    ['companies'],
    async () => {
      const { data } = await apiClient.get('/master/companies/');
      return data;
    },
    {
      staleTime: 15 * 60 * 1000, // 15 minutes (master data changes infrequently)
      cacheTime: 30 * 60 * 1000,
      retry: 2,
    }
  );
};

export interface Client {
  id: number;
  client_code: string;
  boid: string;
  holder_type: 'public' | 'promoter' | 'institution' | 'tax-exempted';
  status: 'active' | 'inactive';
  created_at: string;
}

/**
 * Fetch clients with pagination
 */
export const useClients = (
  page: number = 1,
  pageSize: number = 50,
  search?: string
): UseQueryResult<PayablesListResponse, Error> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (search) queryParams.append('search', search);

  return useQuery<PayablesListResponse, Error>(
    ['clients', page, pageSize, search],
    async () => {
      const { data } = await apiClient.get(`/master/clients/?${queryParams}`);
      return data;
    },
    {
      staleTime: 5 * 60 * 1000,
      keepPreviousData: true,
    }
  );
};

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

interface DashboardStats {
  total_interest_pending: number;
  total_dividend_pending: number;
  total_interest_paid: number;
  total_dividend_paid: number;
  companies_count: number;
  clients_count: number;
  last_updated: string;
}

/**
 * Fetch dashboard statistics
 * Auto-refetches every 30 seconds
 */
export const useDashboardStats = (): UseQueryResult<DashboardStats, Error> => {
  return useQuery<DashboardStats, Error>(
    ['dashboardStats'],
    async () => {
      const { data } = await apiClient.get('/reports/dashboard/');
      return data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refetch every 60 seconds
      retry: 2,
    }
  );
};

// ============================================================================
// UPLOAD & EXPORT HOOKS
// ============================================================================

/**
 * Upload payables file
 */
export const useUploadPayables = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, FormData>(
    async (formData) => {
      const { data } = await apiClient.post('/payables/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('interestPayables');
        queryClient.invalidateQueries('dividendPayables');
      },
    }
  );
};

/**
 * Export payables to CSV
 */
export const useExportPayables = () => {
  return useMutation<Blob, Error, { type: 'interest' | 'dividend'; filters?: Record<string, any> }>(
    async ({ type, filters = {} }) => {
      const queryParams = new URLSearchParams(filters);
      const { data } = await apiClient.get(`/payables/${type}/export/?${queryParams}`, {
        responseType: 'blob',
      });
      return data;
    },
    {
      onSuccess: (data, variables) => {
        // Trigger download
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${variables.type}_payables_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
    }
  );
};

export default {
  useInterestPayables,
  useInterestPayable,
  useMutateInterestPayable,
  useDeleteInterestPayable,
  useDividendPayables,
  useDividendPayable,
  useMutateDividendPayable,
  useDeleteDividendPayable,
  useCompanies,
  useClients,
  useDashboardStats,
  useUploadPayables,
  useExportPayables,
};
