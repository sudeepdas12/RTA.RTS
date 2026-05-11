# Phase 2 Quick Start Guide (5-Minute Setup)

Get started with Phase 2 components immediately!

## Prerequisites

✅ Backend running: `python manage.py runserver`
✅ Frontend running: `npm start`
✅ Database populated with test data

## Step 1: Verify Installation (1 min)

```bash
# Check React Query installed
cd frontend
npm list react-query
# Output: react-query@3.39.3

npm list react-window
# Output: react-window@1.8.10

npm list @tanstack/react-table
# Output: @tanstack/react-table@8.13.2
```

## Step 2: Setup Query Client (2 min)

Update `frontend/src/index.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App';

// Create query client with custom defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

## Step 3: Create a Test Page (2 min)

Create `frontend/src/pages/TestPhase2.tsx`:

```tsx
import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import { useInterestPayables } from '../hooks/useQueries';
import type { ColumnDef } from '@tanstack/react-table';

// Simple test component
export function TestPhase2Page() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInterestPayables(page, 50);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'fiscal_year',
      header: 'Fiscal Year',
    },
    {
      accessorKey: 'net_payable',
      header: 'Amount',
      cell: (info) => `Rs. ${(info.getValue() as number).toLocaleString()}`,
    },
    {
      accessorKey: 'payment_status',
      header: 'Status',
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Phase 2 Test</h1>
      <DataTable
        data={data?.results || []}
        columns={columns}
        totalRows={data?.count || 0}
        onPaginationChange={(state) => setPage(state.pageIndex + 1)}
        pageSize={50}
        isLoading={isLoading}
      />
    </div>
  );
}
```

## Step 4: Add Route (1 min)

Update `frontend/src/App.tsx` (or your router):

```tsx
import { TestPhase2Page } from './pages/TestPhase2';

// In your routes:
<Route path="/test-phase2" element={<TestPhase2Page />} />
```

## Step 5: Test It (30 sec)

1. Open browser: `http://localhost:3000/test-phase2`
2. You should see:
   - ✅ Paginated data table
   - ✅ Pagination controls
   - ✅ Loading spinner
   - ✅ Search box
   - ✅ Column headers (clickable for sort)

## Common Issues & Quick Fixes

### Issue: "useInterestPayables is not a function"
**Fix:** Ensure `frontend/src/hooks/useQueries.ts` exists
```bash
ls frontend/src/hooks/useQueries.ts
```

### Issue: "QueryClientProvider not found"
**Fix:** Run `npm install react-query` again
```bash
cd frontend && npm install react-query
```

### Issue: "API calls fail (CORS error)"
**Fix:** Ensure backend is running on `http://localhost:8000`
```bash
python manage.py runserver 0.0.0.0:8000
```

### Issue: "No data showing"
**Fix:** Check API response
```bash
curl http://localhost:8000/api/payables/interest/?page=1&page_size=50
# Should return JSON with 'results' array
```

## Next Steps

✅ **Test is working?** Then:

1. **Copy InterestPage template** to your actual pages
   ```bash
   cp frontend/src/pages/InterestPage.example.tsx \
      frontend/src/pages/InterestPage.tsx
   ```

2. **Update existing page components** to use DataTable + React Query
   - Search for `setState` in payables pages
   - Replace with `useInterestPayables()` hooks

3. **Run tests**
   ```bash
   npm test                    # Frontend
   cd backend && pytest tests/ # Backend
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: integrate Phase 2 components"
   git push origin develop
   ```

## Verification Checklist

- [ ] Test page displays data
- [ ] Pagination works (click next)
- [ ] Search filters results
- [ ] Sorting works (click headers)
- [ ] No console errors
- [ ] Loading states appear
- [ ] React Query DevTools show cache

## Performance Verification

Open DevTools (F12) and check:

1. **Network tab:**
   - Initial load: Single request for page 1
   - Click page 2: Single request for page 2
   - Scroll back to page 1: No request (cached)

2. **React DevTools:**
   - Search "React Query" in Console
   - Should see cache data

3. **Memory:**
   - Load page 1: ~2-3MB JavaScript
   - Scroll through 100 items: Memory stays same
   - Scroll through 1000 items: Still ~2-3MB

## 5-Minute Troubleshooting

```bash
# If components not loading
npm install --save react-query react-window @tanstack/react-table@8

# If types missing
npm install --save-dev @types/react @types/react-dom

# If tests fail
npm test -- --clearCache

# If API calls fail
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/payables/interest/

# If ports conflict
# Frontend: PORT=3001 npm start
# Backend: python manage.py runserver 8001
```

## Success Indicators

You'll know Phase 2 is working when:

✅ Page loads instantly (from cache)
✅ Navigating pages doesn't reload data
✅ Sorting by clicking headers works
✅ Search filters results in real-time
✅ Memory usage stays constant
✅ Scrolling is smooth (60 FPS)
✅ No console errors

## Production Deployment

Once testing complete:

```bash
# 1. Commit Phase 2 code
git add .
git commit -m "feat: Phase 2 implementation - pagination, React Query, DataTable"

# 2. Push to develop
git push origin develop

# 3. GitHub Actions runs tests (~20 min)

# 4. Verify deployment in staging
# https://staging.example.com

# 5. Merge to main for production
git checkout main
git merge develop
git push origin main

# 6. GitHub Actions deploys to production (~25 min)
```

## Support & Documentation

- Full guide: [PHASE_2_INTEGRATION_GUIDE.md](../PHASE_2_INTEGRATION_GUIDE.md)
- Complete report: [PHASE_2_COMPLETE_REPORT.md](../PHASE_2_COMPLETE_REPORT.md)
- Example page: [InterestPage.example.tsx](../frontend/src/pages/InterestPage.example.tsx)

## Questions?

Look in this order:
1. [PHASE_2_INTEGRATION_GUIDE.md](../PHASE_2_INTEGRATION_GUIDE.md) - Implementation details
2. Example component code in `frontend/src/components/`
3. Hook usage in `frontend/src/pages/InterestPage.example.tsx`
4. Type definitions in component files (fully documented)

---

**Start with the test page, then gradually migrate existing pages.**

Estimated time to full Phase 2 integration: 3-4 hours

Go! 🚀
