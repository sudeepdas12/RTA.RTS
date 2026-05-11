"""
Rate Limiting and API Security Configuration for RTA/RTS System

Implements granular rate limiting with endpoint-specific thresholds:
- Anonymous users: 100 requests/minute (5,000/hour)
- Authenticated users: 1,000 requests/hour
- Upload endpoints: 10 requests/minute (stricter for file processing)
- Export endpoints: 5 requests/minute
- Admin endpoints: 5,000 requests/hour
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle, SimpleRateThrottle
from rest_framework.exceptions import Throttled
import logging

logger = logging.getLogger(__name__)


class AnonymousRateThrottle(AnonRateThrottle):
    """
    Rate limiting for unauthenticated users
    100 requests per minute
    """
    scope = 'anon'
    rate = '100/minute'


class UserRateThrottle(UserRateThrottle):
    """
    Rate limiting for authenticated users
    1,000 requests per hour
    """
    scope = 'user'
    rate = '1000/hour'


class BurstRateThrottle(SimpleRateThrottle):
    """
    Burst rate limiting to prevent sudden spikes
    10 requests per minute for any user
    """
    scope = 'burst'
    rate = '10/minute'
    
    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return f'burst_throttle_{self.request.user.user_id}'
        return f'burst_throttle_{self.get_ident()}'


class UploadRateThrottle(SimpleRateThrottle):
    """
    Strict limit on file uploads (parser intensive)
    10 uploads per minute per user
    """
    scope = 'upload'
    rate = '10/minute'
    
    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return f'upload_throttle_{self.request.user.user_id}'
        return None  # Disable for anonymous users


class ExportRateThrottle(SimpleRateThrottle):
    """
    Limit on data exports (resource intensive)
    5 exports per minute per user
    """
    scope = 'export'
    rate = '5/minute'
    
    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return f'export_throttle_{self.request.user.user_id}'
        return None  # Disable for anonymous users


class ReconciliationRateThrottle(SimpleRateThrottle):
    """
    Limit on reconciliation operations (heavy computation)
    3 operations per minute
    """
    scope = 'reconciliation'
    rate = '3/minute'
    
    def get_cache_key(self):
        if self.request.user and self.request.user.is_authenticated:
            return f'reconciliation_throttle_{self.request.user.user_id}'
        return None


class AdminRateThrottle(UserRateThrottle):
    """
    Higher limits for admin users
    5,000 requests per hour
    """
    scope = 'admin'
    rate = '5000/hour'
    
    def throttle_success(self):
        logger.debug(f'Admin {self.request.user.user_id} throttle success', extra={
            'throttle_scope': self.scope,
            'cache_key': self.key,
            'request_id': getattr(self.request, 'request_id', 'unknown')
        })
        return super().throttle_success()


class CustomThrottled(Throttled):
    """
    Custom throttled exception with detailed information
    """
    def __init__(self, wait=None, detail=None):
        super().__init__(wait=wait, detail=detail)
    
    def get_codes(self):
        return 'throttled'


def get_throttle_classes(request):
    """
    Determine appropriate throttle classes based on request
    Used to dynamically select throttles per endpoint
    """
    throttles = []
    
    if request.user and request.user.is_authenticated:
        # Check if user is admin
        if hasattr(request.user, 'role') and request.user.role.role_name == 'Admin':
            throttles.append(AdminRateThrottle())
        else:
            throttles.append(UserRateThrottle())
        
        throttles.append(BurstRateThrottle())
    else:
        throttles.append(AnonymousRateThrottle())
    
    return throttles


def get_upload_throttle_classes(request):
    """Get throttles specifically for upload endpoints"""
    throttles = [UploadRateThrottle()]
    
    if request.user and request.user.is_authenticated:
        if hasattr(request.user, 'role') and request.user.role.role_name == 'Admin':
            # Admins have higher limits
            throttles.append(AdminRateThrottle())
        else:
            throttles.append(UserRateThrottle())
    else:
        throttles.append(AnonymousRateThrottle())
    
    return throttles


def get_export_throttle_classes(request):
    """Get throttles specifically for export endpoints"""
    throttles = [ExportRateThrottle()]
    
    if request.user and request.user.is_authenticated:
        if hasattr(request.user, 'role') and request.user.role.role_name == 'Admin':
            throttles.append(AdminRateThrottle())
        else:
            throttles.append(UserRateThrottle())
    else:
        throttles.append(AnonymousRateThrottle())
    
    return throttles


def get_reconciliation_throttle_classes(request):
    """Get throttles specifically for reconciliation endpoints"""
    return [ReconciliationRateThrottle()]
