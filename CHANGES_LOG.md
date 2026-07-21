# RTA/RTS System - Review & Improvements Log

## Issues Identified & Fixed

### 1. BUG: Missing `logger` import in `permissions.py` ⚠️
- **File**: `backend/apps/users/permissions.py`
- **Issue**: `logger.warning()` and `logger.debug()` are used but `logger` is never imported.
- **Impact**: Would crash at runtime when permission checks occur.
- **Fix**: Added `import logging` and `logger = logging.getLogger(__name__)`.

### 2. BUG: `token.blacklist()` fails - missing `token_blacklist` app
- **File**: `backend/apps/users/views.py` (line 285), `backend/config/settings.py`
- **Issue**: Logout tries to call `token.blacklist()` but `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`.
- **Impact**: Logout endpoint crashes with ImportError.
- **Fix**: Added `'rest_framework_simplejwt.token_blacklist'` to `INSTALLED_APPS`.

### 3. BUG: Duplicate eslint-disable comments in AuthContext.js
- **File**: `frontend/src/context/AuthContext.js` (lines 39-41)
- **Issue**: Duplicate `// eslint-disable-next-line react-hooks/exhaustive-deps` comments.
- **Fix**: Removed duplicate comments.

### 4. IMPROVEMENT: `net_payable` should be auto-calculated
- **Files**: `backend/apps/payables/models.py`
- **Issue**: `InterestPayable.net_payable` and `DividendPayable.net_payable` are set manually but are always `gross - tax`.
- **Fix**: Added `save()` method to auto-calculate `net_payable` from `gross - tax`.

### 5. IMPROVEMENT: Missing `db_index` on frequently queried fields
- **Files**: Various model files
- **Issue**: Fields like `client_code`, `company_code`, `boid`, `payment_status`, `due_date` used in filters lack `db_index=True`.
- **Fix**: Added `db_index=True` to key fields for query performance.

### 6. IMPROVEMENT: Add `npm test` script to frontend package.json
- **File**: `frontend/package.json`
- **Issue**: Missing `test` script (non-standard setup).
- **Fix**: Added proper `test` script.

### 7. IMPROVEMENT: Weak default DB password
- **File**: `backend/config/settings.py`
- **Issue**: Default DB password is `'password'`.
- **Fix**: No change needed (it's a documented default for dev), but added env validation hint.