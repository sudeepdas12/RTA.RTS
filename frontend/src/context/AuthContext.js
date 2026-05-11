import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, getApiErrorMessage } from '../services/api';
import { toast } from 'react-toastify';
// Lightweight JWT decode helper (avoid bundler default/import issues)
const jwtDecode = (token) => {
  try {
    const payload = token.split('.')[1] || '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch (e) {
    return {};
  }
};

const AuthContext = createContext(null);

const ROLE_FALLBACK_PERMISSIONS = {
  admin: {
    all: ['read', 'create', 'update', 'delete', 'approve'],
  },
  'finance operator': {
    interest_payables: ['read', 'create', 'update'],
    dividend_payables: ['read', 'create', 'update'],
    reconciliation: ['read', 'create', 'update'],
    reports: ['read'],
    companies: ['read'],
    clients: ['read'],
    uploads: ['read', 'create'],
  },
  'reconciliation officer': {
    reconciliation: ['read', 'create', 'update'],
    reports: ['read'],
    companies: ['read'],
    clients: ['read'],
  },
  auditor: {
    audit: ['read'],
    reports: ['read'],
    companies: ['read'],
    clients: ['read'],
    interest_payables: ['read'],
    dividend_payables: ['read'],
    reconciliation: ['read'],
  },
  'report viewer': {
    reports: ['read'],
    companies: ['read'],
    clients: ['read'],
    interest_payables: ['read'],
    dividend_payables: ['read'],
    reconciliation: ['read'],
  },
};

const CORE_NAV_READ_RESOURCES = new Set([
  'interest_payables',
  'dividend_payables',
  'reconciliation',
  'companies',
  'clients',
  'reports',
  'audit',
  'users',
]);

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Run once on mount. We intentionally omit "logout" from deps since it would cause reruns.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Run once on mount. We intentionally omit "logout" from deps since it would cause reruns.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp > currentTime) {
          setUser(JSON.parse(storedUser));
        } else {
          // Token expired
          logout();
        }
      } catch (error) {
        logout();
      }
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      toast.success(`Welcome back, ${userData.full_name || userData.username}!`);
      navigate('/dashboard');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Login failed'));
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
      toast.info('Logged out successfully');
    }
  };

  const hasPermission = (resource, action = 'read') => {
    if (!user) return false;

    const roleName = (user.role || '').toString().trim().toLowerCase();
    if (roleName === 'admin') {
      return true;
    }

    const permissionsMap = user.permissions;
    if (permissionsMap && typeof permissionsMap === 'object') {
      const resourcePerms = permissionsMap[resource];
      if (Array.isArray(resourcePerms) && resourcePerms.includes(action)) {
        return true;
      }
    }

    const roleFallback = ROLE_FALLBACK_PERMISSIONS[roleName];
    if (!roleFallback) return false;

    if (Array.isArray(roleFallback.all) && roleFallback.all.includes(action)) {
      return true;
    }

    const fallbackPerms = roleFallback[resource];
    if (Array.isArray(fallbackPerms) && fallbackPerms.includes(action)) {
      return true;
    }

    if (action === 'read' && CORE_NAV_READ_RESOURCES.has(resource) && !!user.role) {
      return true;
    }

    return false;
  };

  const value = {
    user,
    login,
    logout,
    hasPermission,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
