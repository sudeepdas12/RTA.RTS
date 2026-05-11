"""
Decorators for applying rate limiting and security measures to API endpoints
Enables endpoint-specific throttle configuration and security headers
"""

from functools import wraps
from rest_framework.decorators import throttle_classes
from config.throttles import (
    UploadRateThrottle, ExportRateThrottle, ReconciliationRateThrottle,
    UserRateThrottle, AdminRateThrottle, BurstRateThrottle
)
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def upload_endpoint(view_func):
    """
    Decorator for file upload endpoints
    Applies stricter rate limiting suitable for file uploads
    Usage: @upload_endpoint
    """
    @wraps(view_func)
    @throttle_classes([UploadRateThrottle, UserRateThrottle, BurstRateThrottle])
    def wrapped(*args, **kwargs):
        return view_func(*args, **kwargs)
    return wrapped


def export_endpoint(view_func):
    """
    Decorator for data export endpoints
    Applies rate limiting suitable for resource-intensive exports
    Usage: @export_endpoint
    """
    @wraps(view_func)
    @throttle_classes([ExportRateThrottle, UserRateThrottle])
    def wrapped(*args, **kwargs):
        return view_func(*args, **kwargs)
    return wrapped


def reconciliation_endpoint(view_func):
    """
    Decorator for reconciliation operation endpoints
    Applies rate limiting suitable for heavy computation
    Usage: @reconciliation_endpoint
    """
    @wraps(view_func)
    @throttle_classes([ReconciliationRateThrottle, UserRateThrottle])
    def wrapped(*args, **kwargs):
        return view_func(*args, **kwargs)
    return wrapped


def log_request_security(view_func):
    """
    Decorator to log security-relevant information about requests
    Logs: IP address, user, action, timestamp
    Useful for audit trails
    """
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        user_id = getattr(request.user, 'user_id', 'anonymous')
        ip_address = get_client_ip(request)
        
        logger.info(f'{request.method} {request.path}', extra={
            'user_id': user_id,
            'ip_address': ip_address,
            'method': request.method,
            'path': request.path,
            'request_id': getattr(request, 'request_id', 'unknown'),
        })
        
        return view_func(request, *args, **kwargs)
    return wrapped


def require_signed_request(view_func):
    """
    Decorator requiring HMAC-SHA256 signed requests
    Prevents tampering with sensitive operations
    
    Usage:
        @require_signed_request
        def delete_sensitive():
            ...
    
    Client usage:
        signature = hmac.new(key, message, hashlib.sha256).hexdigest()
        headers = {
            'X-Signature': signature,
            'X-Timestamp': str(int(time.time()))
        }
    """
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        import hmac
        import hashlib
        import time
        from django.conf import settings
        
        signature = request.headers.get('X-Signature')
        timestamp = request.headers.get('X-Timestamp')
        
        if not signature or not timestamp:
            logger.warning(f'Unsigned request to {request.path}', extra={
                'user_id': getattr(request.user, 'user_id', 'anonymous'),
                'ip_address': get_client_ip(request),
                'request_id': getattr(request, 'request_id', 'unknown'),
            })
            return Response(
                {'error': 'Missing request signature'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verify timestamp (prevent replay attacks - 5 min window)
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 300:
                logger.warning(f'Stale timestamp in request to {request.path}', extra={
                    'user_id': getattr(request.user, 'user_id', 'anonymous'),
                    'ip_address': get_client_ip(request),
                    'request_id': getattr(request, 'request_id', 'unknown'),
                })
                return Response(
                    {'error': 'Request timestamp expired'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except ValueError:
            return Response(
                {'error': 'Invalid timestamp format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify signature
        signing_secret = getattr(settings, 'SIGNING_SECRET', settings.SECRET_KEY)
        body_hash = hashlib.sha256(request.body).hexdigest()
        message = f"{timestamp}:{body_hash}"
        expected_sig = hmac.new(
            signing_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            logger.warning(f'Invalid signature in request to {request.path}', extra={
                'user_id': getattr(request.user, 'user_id', 'anonymous'),
                'ip_address': get_client_ip(request),
                'request_id': getattr(request, 'request_id', 'unknown'),
            })
            return Response(
                {'error': 'Invalid request signature'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        return view_func(request, *args, **kwargs)
    return wrapped


def get_client_ip(request):
    """Extract client IP from request considering proxy headers"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'unknown')
    return ip
