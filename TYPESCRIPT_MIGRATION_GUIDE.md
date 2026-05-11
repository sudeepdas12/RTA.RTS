# TypeScript Migration Guide for RTA/RTS Frontend

## Overview

This guide outlines the gradual migration of the React application from JavaScript to TypeScript. The goal is to maintain functionality while improving type safety, maintainability, and developer experience.

---

## Phase 1: Foundation (Weeks 1-2)

### ✅ Completed Setup
- [x] TypeScript installed (`npm install typescript`)
- [x] Type definitions installed (`@types/react`, `@types/react-dom`, etc.)
- [x] `tsconfig.json` configured
- [x] Jest configured for TypeScript support

### Next Steps
1. **Update webpack/build configuration** (if needed)
2. **Start with shared utilities** (bottom-up approach)
3. **Add type annotations to existing JavaScript**

---

## Migration Strategy: Bottom-Up Approach

### Order of Migration (Lowest Risk → Highest Risk)

```
1. Utilities & Helpers
   └─ src/utils/** (formatters, validators, helpers)

2. Services Layer
   ├─ src/services/api.js
   └─ src/services/operationsServices.js

3. Context & Hooks
   └─ src/context/AuthContext.js

4. Components
   ├─ Small/Presentational components first
   └─ Complex container components last

5. Pages
   └─ Route components using migrated components
```

---

## Step-by-Step Migration Examples

### Step 1: Migrate a Utility Function

**Before (JavaScript):**
```javascript
// src/utils/formatters.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};
```

**After (TypeScript):**
```typescript
// src/utils/formatters.ts
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString();
};
```

---

### Step 2: Create Type Definitions

Create a `types.ts` file in the root of `src/`:

```typescript
// src/types/index.ts

// User & Auth
export interface User {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive';
  permissions: Record<string, string[]>;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (resource: string, action: string) => boolean;
}

// Company & Client
export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  sector_type: 'private' | 'public' | 'tax-exempted' | 'institution';
  status: 'active' | 'inactive';
}

export interface Client {
  id: number;
  company_id: number;
  client_code: string;
  client_name: string;
  boid: string;
  holder_type: 'public' | 'promoter' | 'institution' | 'tax-exempted';
  status: 'active' | 'inactive';
}

// Payables
export interface InterestPayable {
  id: number;
  company: number | Company;
  client: number | Client;
  gross_interest: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'pending' | 'paid' | 'partial';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface DividendPayable {
  id: number;
  company: number | Company;
  client: number | Client;
  gross_dividend: number;
  tax_amount: number;
  net_payable: number;
  payment_status: 'pending' | 'paid' | 'partial';
  created_at: string;
  updated_at: string;
}

// API Responses
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API Errors
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
```

---

### Step 3: Migrate API Service

**Before:**
```javascript
// src/services/api/authService.js
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login/', {
      username,
      password,
    });
    return response.data;
  },
  
  logout: async () => {
    await api.post('/auth/logout/');
  },
};
```

**After:**
```typescript
// src/services/api/authService.ts
import { User, ApiResponse } from '@/types';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export const authService = {
  login: async (
    username: string,
    password: string
  ): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login/', {
      username,
      password,
    });
    return response.data;
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout/');
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },
};
```

---

### Step 4: Migrate Auth Context

**Before:**
```javascript
// src/context/AuthContext.js
import React, { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in
  }, []);
  
  const login = async (username, password) => {
    // Login logic
  };
  
  const logout = () => {
    // Logout logic
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**After:**
```typescript
// src/context/AuthContext.tsx
import React, { 
  createContext, 
  useEffect, 
  useState,
  ReactNode,
  FC 
} from 'react';
import { User, AuthContextType } from '@/types';
import { authService } from '@/services/api/authService';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('access_token');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = async (username: string, password: string): Promise<void> => {
    const response = await authService.login(username, password);
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    setUser(response.user);
  };
  
  const logout = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };
  
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user?.permissions) return false;
    const resourcePerms = user.permissions[resource];
    return resourcePerms?.includes(action) ?? false;
  };
  
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    hasPermission,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### Step 5: Migrate Components

**Before:**
```javascript
// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch dashboard data
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Dashboard for {user?.username}</h1>
      {/* Content */}
    </div>
  );
}

export default Dashboard;
```

**After:**
```typescript
// src/pages/Dashboard.tsx
import React, { useEffect, useState, FC } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DividendPayable, InterestPayable } from '@/types';
import { reportService } from '@/services/api/reportService';

interface DashboardData {
  interest_total: number;
  interest_paid: number;
  dividend_total: number;
  dividend_paid: number;
}

const Dashboard: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchDashboard = async (): Promise<void> => {
      try {
        const response = await reportService.getDashboard();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading && user) {
      fetchDashboard();
    }
  }, [authLoading, user]);
  
  if (loading || authLoading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  
  return (
    <div className="dashboard">
      <h1>Dashboard for {user?.username}</h1>
      
      {data && (
        <div className="cards">
          <div className="card">
            <h5>Interest Payables</h5>
            <p className="amount">{data.interest_total}</p>
            <p className="paid">Paid: {data.interest_paid}</p>
          </div>
          
          <div className="card">
            <h5>Dividend Payables</h5>
            <p className="amount">{data.dividend_total}</p>
            <p className="paid">Paid: {data.dividend_paid}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```

---

## File Structure After Migration

```
frontend/src/
├── types/
│   └── index.ts (all TypeScript interfaces)
├── services/
│   └── api/
│       ├── authService.ts
│       ├── payablesServices.ts
│       ├── reportService.ts
│       └── ...
├── context/
│   └── AuthContext.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   └── ...
├── components/
│   ├── NavigationBar.tsx
│   ├── DateRangeFilter.tsx
│   └── ...
├── utils/
│   ├── formatters.ts
│   ├── validators.ts
│   └── ...
└── App.tsx
```

---

## Converting File by File

### Checklist for Each File Conversion

- [ ] Rename `*.js` → `*.tsx` (or `*.ts` for non-React)
- [ ] Add type annotations to function parameters
- [ ] Add return type annotations
- [ ] Import types from `@/types`
- [ ] Replace `PropTypes` with TypeScript interfaces
- [ ] Update imports to use `tsx/ts` extensions
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Run tests: `npm test`
- [ ] Verify in browser

---

## Gradual Conversion Timeline

### Week 1
- [x] Setup TypeScript config
- [ ] Migrate utils/ (20 files estimated)
- [ ] Migrate services/ (6 files estimated)

### Week 2
- [ ] Migrate context/AuthContext.js
- [ ] Convert top-10 most-used components

### Week 3
- [ ] Convert remaining components
- [ ] Convert pages

### Week 4
- [ ] Full type coverage
- [ ] Remove `// @ts-ignore` comments
- [ ] Enable stricter tsconfig options

---

## Helpful Commands

```bash
# Check for TypeScript errors without compiling
npx tsc --noEmit

# Check specific file
npx tsc --noEmit src/pages/Dashboard.tsx

# Generate tsconfig
npx tsc --init

# Watch mode
npx tsc --watch

# Strict mode check
npx tsc --noEmit --strict
```

---

## Common TypeScript Patterns for React

### Functional Component with Props

```typescript
interface ComponentProps {
  title: string;
  count: number;
  onClick?: (id: number) => void;
}

const Component: FC<ComponentProps> = ({ title, count, onClick }) => {
  return <button onClick={() => onClick?.(1)}>{title}: {count}</button>;
};
```

### With State

```typescript
const [items, setItems] = useState<Item[]>([]);
const [count, setCount] = useState<number>(0);
const [loading, setLoading] = useState<boolean>(false);
```

### With Context

```typescript
const { user, login } = useAuth();
// user is fully typed as User | null
```

### With Async Functions

```typescript
const fetchData = async (): Promise<void> => {
  try {
    const data: DashboardData = await api.get('/dashboard/');
    setData(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
};
```

---

## Testing TypeScript Components

```typescript
// src/pages/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

describe('Dashboard', () => {
  it('renders dashboard', () => {
    render(<Dashboard />);
    expect(screen.queryByText(/dashboard/i)).toBeInTheDocument();
  });
});
```

---

## Resources

- [TypeScript React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## Troubleshooting

### "Cannot find module" errors
- Run `npm install @types/package-name`
- Add paths mapping in `tsconfig.json`

### Type errors in existing libraries
- Use `skipLibCheck: true` in tsconfig
- Or create type declarations in `src/types/`

### JSX issues
- Ensure `jsx: "react-jsx"` in tsconfig
- Use `.tsx` extension for React components

### Build errors
- Run `npx tsc --noEmit` to see all errors
- Check `strictNullChecks` setting
- Enable one strict option at a time

---

## Summary

✅ **Completed**:
- TypeScript installed and configured
- Type definitions created
- Migration examples provided
- Timeline and checklist created

⏭️ **Next**: Start migrating utilities and services files
