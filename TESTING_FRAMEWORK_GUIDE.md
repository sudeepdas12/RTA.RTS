# PHASE 1 Testing Framework Setup Guide

## ✅ What's Been Implemented

### Backend Testing (pytest)
- ✅ **pytest** - Testing framework
- ✅ **pytest-django** - Django integration
- ✅ **pytest-cov** - Code coverage reporting
- ✅ **factory-boy** - Test data factories
- ✅ **faker** - Random test data generation
- ✅ **pytest.ini** - Test configuration
- ✅ **conftest.py** - Shared fixtures and configuration

### Frontend Testing (Jest)
- ✅ **@testing-library/react** - Component testing
- ✅ **@testing-library/jest-dom** - DOM matchers
- ✅ **@testing-library/user-event** - User interaction simulation
- ✅ **jest** - Testing framework
- ✅ **jest.config.js** - Jest configuration
- ✅ **setupTests.js** - Test environment setup

---

## 🧪 Running Backend Tests

### Run All Tests
```bash
cd backend
python -m pytest
```

### Run Tests with Coverage Report
```bash
python -m pytest --cov=apps --cov-report=html
# Open htmlcov/index.html in browser to see coverage
```

### Run Specific Test File
```bash
python -m pytest tests/test_users_authentication.py -v
```

### Run Specific Test Class
```bash
python -m pytest tests/test_users_authentication.py::TestAuthenticationAPI -v
```

### Run Specific Test
```bash
python -m pytest tests/test_users_authentication.py::TestAuthenticationAPI::test_login_success -v
```

### Run Only Unit Tests
```bash
python -m pytest -m unit
```

### Run Only API Tests
```bash
python -m pytest -m api
```

### Run Only Security Tests
```bash
python -m pytest -m security
```

### Run Tests (Exclude Slow Tests)
```bash
python -m pytest -m "not slow"
```

### Watch Mode (Re-run on Changes)
```bash
python -m pytest --looponfail
# Or install pytest-watch:
# pip install pytest-watch
pytest-watch
```

### Parallel Test Execution
```bash
pip install pytest-xdist
python -m pytest -n 4  # Run on 4 processors
```

---

## 🧪 Running Frontend Tests

### Run All Tests
```bash
cd frontend
npm test
```

### Run All Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Specific Test File
```bash
npm test -- Dashboard.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="login"
```

### Generate Coverage Report
```bash
npm test -- --coverage
# Coverage HTML report in: coverage/lcov-report/index.html
```

### Update Snapshots
```bash
npm test -- --updateSnapshot
```

### Run Tests and Exit (For CI/CD)
```bash
npm test -- --passWithNoTests
```

---

## 📊 Test Coverage

### Backend Coverage Goals
```
- Target: 80%+ code coverage
- Critical paths: 95%+ (authentication, authorization)
- Business logic: 90%+
- API endpoints: 85%+

View coverage report:
cd backend/htmlcov
open index.html  # macOS
start index.html # Windows
```

### Frontend Coverage Goals
```
- Target: 70%+ code coverage
- Components: 75%+
- Services: 85%+
- Utils: 80%+

View coverage report:
cd frontend/coverage/lcov-report
open index.html  # macOS
start index.html # Windows
```

---

## 📝 Test Organization

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── conftest.py                      # Shared fixtures
├── __init__.py
├── test_users_authentication.py     # Auth & user tests
├── test_payables.py                 # Payables (Interest/Dividend)
├── test_reconciliation.py           # (To be created)
├── test_companies.py                # (To be created)
├── test_clients.py                  # (To be created)
└── test_audit.py                    # (To be created)
```

### Frontend Tests (`frontend/src/**/*.test.js`)

```
frontend/src/
├── pages/
│   ├── Dashboard.test.js
│   ├── Login.test.js
│   ├── InterestDashboard.test.js    # (To be created)
│   └── ...
├── components/
│   ├── NavigationBar.test.js        # (To be created)
│   ├── DateRangeFilter.test.js      # (To be created)
│   └── ...
├── services/
│   └── api.test.js                  # (To be created)
└── setupTests.js
```

---

## 🔧 Test Examples

### Backend - Unit Test Example
```python
@pytest.mark.unit
@pytest.mark.django_db
def test_create_user(admin_role):
    """Test creating a new user"""
    user = User.objects.create_user(
        username='testuser',
        password='TestPass123!',
        role=admin_role,
    )
    assert user.username == 'testuser'
    assert user.check_password('TestPass123!')
```

### Backend - API Test Example
```python
@pytest.mark.api
@pytest.mark.django_db
def test_login_success(api_client, admin_user):
    """Test successful login"""
    response = api_client.post('/api/auth/login/', {
        'username': 'admin',
        'password': 'AdminPassword123!',
    })
    assert response.status_code == 200
    assert 'access' in response.data
```

### Frontend - Component Test Example
```javascript
test('renders dashboard with title', () => {
  render(
    <Router>
      <Dashboard />
    </Router>
  );
  
  expect(document.body).toBeInTheDocument();
});
```

### Frontend - API Mock Test Example
```javascript
test('loads dashboard data on mount', async () => {
  const mockData = { interest_total: 50000 };
  api.reports.getDashboard.mockResolvedValue(mockData);
  
  render(<Router><Dashboard /></Router>);
  
  await waitFor(() => {
    expect(api.reports.getDashboard).toHaveBeenCalled();
  });
});
```

---

## 🚀 CI/CD Integration

### GitHub Actions Example (.github/workflows/test.yml)
```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && python -m pytest --cov

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage
```

---

## 🐛 Debugging Tests

### Get More Verbose Output
```bash
# Backend
python -m pytest -vv -s

# Frontend
npm test -- --verbose
```

### Print Debug Output
```python
# In backend tests
import pytest
def test_something():
    result = function_under_test()
    print(f"Debug: {result}")  # Will print with -s flag
    assert result == expected
```

```javascript
// In frontend tests
test('something', () => {
  const result = functionUnderTest();
  console.log('Debug:', result);  // Will show with verbose flag
  expect(result).toBe(expected);
});
```

### Drop Into Debugger
```python
# Backend
import pdb
def test_something():
    pdb.set_trace()  # Execution pauses here
    result = function()
```

```javascript
// Frontend
test('something', () => {
  debugger;  // DevTools will pause here
  result = function();
});
```

### Use pytest fixtures to inspect database
```python
@pytest.mark.django_db
def test_with_inspection(client):
    # Make request
    response = client.post('/api/payables/interest/', data)
    
    # Inspect database
    from apps.payables.models import InterestPayable
    payables = InterestPayable.objects.all()
    assert payables.count() == 1
```

---

## ✅ Testing Checklist

- [ ] Backend tests pass: `python -m pytest`
- [ ] Frontend tests pass: `npm test -- --coverage`
- [ ] Backend coverage ≥ 60%
- [ ] Frontend coverage ≥ 60%
- [ ] All tests have descriptive names
- [ ] Critical paths have security tests
- [ ] API tests validate error handling
- [ ] Permission tests cover all roles
- [ ] Rate limiting tests pass
- [ ] Database tests use fixtures
- [ ] Async tests use `waitFor()` / `await`
- [ ] No console errors/warnings
- [ ] All mocked functions cleared between tests

---

## 📚 Test Writing Best Practices

### 1. **Test Organization**
   - One concept per test
   - Clear test names: `test_<feature>_<scenario>_<expected_result>`
   - Group related tests in classes

### 2. **Use Fixtures**
   - Backend: Use pytest fixtures from `conftest.py`
   - Frontend: Create test utilities and mocks

### 3. **Test Isolation**
   - Each test should be independent
   - Reset mocks before each test
   - Clean database between tests

### 4. **Error Paths**
   - Test success cases
   - Test error cases
   - Test edge cases

### 5. **Mocking**
   - Mock external services
   - Mock API calls
   - Mock time-dependent functions

### 6. **Assertions**
   - Assert one thing per test
   - Use meaningful assertion messages
   - Check both positive and negative cases

---

## 🔗 Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [RTA/RTS Testing Guide](../PHASE_1_IMPLEMENTATION_GUIDE.md)

---

## 📝 Summary

✅ **Completed**:
- Testing infrastructure set up (pytest + Jest)
- Example test files created
- Fixtures and configuration ready
- CI/CD integration guide provided

⏭️ **Next Phase**:
- Implement TypeScript migration
- Expand test coverage
- Add E2E tests
