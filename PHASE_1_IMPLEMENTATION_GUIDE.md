# PHASE 1 Implementation Guide: Security & Logging

## ✅ What's Been Implemented

### 1. Rate Limiting (config/throttles.py)
- **AnonymousRateThrottle**: 100 requests/minute for unauthenticated users
- **UserRateThrottle**: 1,000 requests/hour for authenticated users
- **BurstRateThrottle**: 10 requests/minute (sudden spike prevention)
- **UploadRateThrottle**: 10 uploads/minute (file upload endpoints)
- **ExportRateThrottle**: 5 exports/minute (resource-intensive)
- **ReconciliationRateThrottle**: 3 operations/minute (heavy computation)
- **AdminRateThrottle**: 5,000 requests/hour (admin users)

### 2. Structured Logging (config/logging_config.py)
- **JSON formatted logs** for easy parsing in production
- **Request ID tracking** for distributed tracing
- **Rotating file handlers** (10MB per file, keeps 5 backups)
- **Separate error logs** for easier debugging
- **Dynamic formatter** based on DEBUG setting (JSON in production, text in dev)

### 3. Security Decorators (config/security_decorators.py)
- `@upload_endpoint` - For file upload routes
- `@export_endpoint` - For data export routes
- `@reconciliation_endpoint` - For reconciliation operations
- `@log_request_security` - For security-relevant logging
- `@require_signed_request` - For sensitive operations (optional)

---

## 🔧 How to Use These Features

### Register Rate Limiting on Endpoints

#### Option 1: Use Decorators (Recommended for specific endpoints)

```python
# In apps/payables/views.py

from rest_framework.decorators import api_view, throttle_classes
from config.security_decorators import upload_endpoint, export_endpoint, log_request_security
from config.throttles import UploadRateThrottle, ExportRateThrottle, UserRateThrottle

# Method 1: Using decorators (clean, composable)
@api_view(['POST'])
@upload_endpoint
@log_request_security
def upload_interest_payables(request):
    """
    Upload interest payables from Excel/CSV
    Rate limited to 10/minute due to @upload_endpoint decorator
    """
    # implementation...
    pass


@api_view(['GET'])
@export_endpoint
def export_interest_report(request):
    """
    Export interest payables as Excel/PDF
    Rate limited to 5/minute due to @export_endpoint decorator
    """
    # implementation...
    pass
```

#### Option 2: Using Throttle Classes (More explicit, for ViewSets)

```python
# In apps/reconciliation/views.py

from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from config.throttles import ReconciliationRateThrottle, UserRateThrottle

class ReconciliationViewSet(ViewSet):
    # Apply to entire ViewSet
    throttle_classes = [UserRateThrottle, ReconciliationRateThrottle]
    
    @action(detail=False, methods=['post'])
    def auto_match(self, request):
        """
        Auto-match bank transactions
        Uses ViewSet-level throttle (3/minute for reconciliation)
        """
        # implementation...
        pass
```

---

### Structured Logging Examples

#### Basic Logging

```python
import logging

logger = logging.getLogger(__name__)

def process_payables(company_id):
    logger.info('Processing payables', extra={
        'company_id': company_id,
        'timestamp': timezone.now().isoformat()
    })
    
    try:
        # Do work...
        logger.info('Payables processed successfully', extra={
            'company_id': company_id,
            'records_count': 50
        })
    except Exception as e:
        logger.error('Failed to process payables', exc_info=True, extra={
            'company_id': company_id,
            'error_type': type(e).__name__,
            'error_message': str(e)
        })
```

#### Using Logging Helpers

```python
# In your API views
from config.logging_config import log_api_request, log_api_error

@api_view(['POST'])
def create_payable(request):
    logger = logging.getLogger(__name__)
    
    log_api_request(logger, request, 'Creating new payable')
    
    try:
        # Create payable...
        return Response({'success': True})
    except Exception as e:
        log_api_error(logger, request, e, 'Failed to create payable')
        raise
```

#### Logging with Request ID (automatic)

All logs automatically include request_id for tracing:

```python
# Log output (JSON format in production):
# {
#   "@timestamp": "2026-05-08T10:30:45.123Z",
#   "severity": "INFO",
#   "name": "apps.payables.views",
#   "message": "Interest upload completed",
#   "request_id": "req-12345-abcde",
#   "user_id": 1,
#   "records_created": 42,
#   "service": "rta-rts-backend",
#   "environment": "production"
# }
```

---

## 📋 Migration Checklist

### For Existing Upload Endpoints
- [ ] Add `@upload_endpoint` decorator OR `throttle_classes = [UploadRateThrottle, ...]`
- [ ] Add logging calls at start/end of operation
- [ ] Add error logging in try/except block

Example locations to update:
1. `apps/companies/views.py` → `upload` action
2. `apps/clients/views.py` → `upload` action
3. `apps/payables/views.py` → `upload` actions (interest, dividend)
4. `apps/reconciliation/views.py` → `upload` action

### For Existing Export Endpoints
- [ ] Add `@export_endpoint` decorator OR throttle classes
- [ ] Add logging for export requests

Example locations:
1. `apps/reports/views.py` → all `export_*` functions

### For Reconciliation Operations
- [ ] Add `@reconciliation_endpoint` decorator OR throttle classes
- [ ] High-priority: `auto_match` action

---

## 🔍 Monitoring Rate Limits

### View Active Rate Limits

Check Django REST Framework throttle stats:

```python
from django.core.cache import cache

# Get throttle cache keys (if using cache backend)
# By default uses Django's cache (settings.CACHES)

# Manual check from shell:
# python manage.py shell
from django.core.cache import cache
keys = cache.keys('*throttle*')
for key in keys:
    print(f"{key}: {cache.get(key)}")
```

### Monitor Throttled Requests in Logs

```bash
# Watch for throttled requests in logs
tail -f logs/app.log | grep -i throttled

# Or with JSON parsing
tail -f logs/app.log | grep "severity.*ERROR" | grep throttle
```

---

## 🛡️ Security Best Practices

### 1. Environment Variables for Rate Limits

Update `.env.example`:
```
# Rate limiting (requests per unit time)
API_THROTTLE_ANON=100/minute
API_THROTTLE_USER=1000/hour
API_THROTTLE_BURST=10/minute
API_THROTTLE_UPLOAD=10/minute
API_THROTTLE_EXPORT=5/minute
API_THROTTLE_RECON=3/minute
API_THROTTLE_ADMIN=5000/hour

# Signing secret for sensitive operations (optional)
SIGNING_SECRET=your-secret-key-here
```

### 2. Enhanced CORS Configuration

Already in settings.py, but verify in production:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://rta.example.com",  # Production domain
    # NO localhost in production!
]

CSRF_TRUSTED_ORIGINS = [
    "https://rta.example.com",
]
```

### 3. HTTPS/TLS Enforcement

For production deployment:

```python
# Only in production (settings.py)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

---

## 📊 Log Locations

### Development (Text Format)
```
backend/logs/
├── app.log          # General application logs
└── error.log        # Error-level logs only
```

### Production (JSON Format)
Same locations, but JSON formatted for easy parsing with tools like:
- ELK Stack (Elasticsearch-Logstash-Kibana)
- DataDog
- CloudWatch
- Splunk

### Log Rotation
- **Max size**: 10MB per file
- **Backup count**: 5 older files retained
- **Example**: `app.log` → `app.log.1` → `app.log.2` → etc.

---

## 🚀 Next Steps

1. **Test locally**: Run Django with new settings and verify logs are JSON formatted
2. **Apply to endpoints**: Add decorators to upload/export/reconciliation endpoints
3. **Monitor**: Check logs for throttled requests
4. **Adjust rates**: If rate limits too strict/loose, update environment variables
5. **Alerts**: Setup alerts on error logs (count errors > 10 in 5 min)

---

## 🧪 Testing Rate Limits

### Manual Test

```bash
# Test anonymous rate limit (should get 429 after 100 requests)
for i in {1..150}; do
  curl http://localhost:8000/api/auth/login/ -X POST
  echo "Request $i"
done

# Test upload rate limit
for i in {1..15}; do
  curl -X POST \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -F "file=@test.xlsx" \
    http://localhost:8000/api/payables/interest/upload/
  echo "Upload $i"
done
```

### Automated Test (pytest - covered in next phase)

```python
def test_anonymous_rate_limit():
    """Test that anonymous users are throttled after 100 requests"""
    client = APIClient()
    
    for i in range(101):
        response = client.post('/api/auth/login/')
        if i < 100:
            assert response.status_code != 429  # Too many requests
        else:
            assert response.status_code == 429  # Now throttled
```

---

## 📝 Summary

✅ **Completed**:
- Rate limiting infrastructure set up
- Structured logging configured
- Security decorators created
- Error logging capabilities added

⏭️ **Next Phase**:
- Implement automated testing (pytest + Jest)
- Add TypeScript to frontend
- Setup CI/CD pipeline
