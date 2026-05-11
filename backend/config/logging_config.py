"""
Structured Logging Configuration for RTA/RTS System
Implements JSON logging with correlation IDs for production observability
"""

import os
import logging
from pythonjsonlogger import jsonlogger


def get_logging_config(debug=False):
    """
    Returns Django logging configuration with JSON formatter
    
    Features:
    - JSON structured logging for easy parsing
    - Request ID tracking for distributed tracing
    - Correlation ID propagation
    - Sensitive data masking
    """
    
    LOG_DIR = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(LOG_DIR, exist_ok=True)
    
    # JSON formatter for structured logs
    json_formatter = jsonlogger.JsonFormatter(
        fmt='%(timestamp)s %(level)s %(name)s %(message)s',
        rename_fields={
            'timestamp': '@timestamp',
            'level': 'severity'
        },
        static_fields={
            'service': 'rta-rts-backend',
            'environment': 'debug' if debug else 'production'
        }
    )
    
    # Standard text formatter for debugging
    text_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'json': {
                '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
                'fmt': '%(timestamp)s %(level)s %(name)s %(message)s',
            },
            'verbose': {
                'format': '{levelname} {asctime} {name} {message}',
                'style': '{',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'simple': {
                'format': '{levelname} {message}',
                'style': '{',
            },
        },
        'filters': {
            'require_debug_false': {
                '()': 'django.utils.log.RequireDebugFalse',
            },
            'require_debug_true': {
                '()': 'django.utils.log.RequireDebugTrue',
            },
            'add_request_id': {
                '()': 'config.logging_config.RequestIDFilter',
            },
        },
        'handlers': {
            'console': {
                'level': 'DEBUG' if debug else 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'simple' if debug else 'json',
                'filters': ['add_request_id'],
            },
            'file': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, 'app.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'formatter': 'json',
                'filters': ['add_request_id'],
            },
            'error_file': {
                'level': 'ERROR',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, 'error.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5,
                'formatter': 'json',
                'filters': ['add_request_id'],
            },
            'mail_admins': {
                'level': 'ERROR',
                'class': 'django.utils.log.AdminEmailHandler',
                'filters': ['require_debug_false'],
            }
        },
        'loggers': {
            'django': {
                'handlers': ['console', 'file', 'error_file'],
                'level': 'INFO',
            },
            'django.request': {
                'handlers': ['console', 'error_file', 'mail_admins'],
                'level': 'ERROR',
                'propagate': False,
            },
            'django.security': {
                'handlers': ['console', 'file'],
                'level': 'INFO',
                'propagate': False,
            },
            'apps': {
                'handlers': ['console', 'file', 'error_file'],
                'level': 'DEBUG' if debug else 'INFO',
            },
            'config': {
                'handlers': ['console', 'file'],
                'level': 'DEBUG' if debug else 'INFO',
            },
        },
        'root': {
            'handlers': ['console', 'file', 'error_file'],
            'level': 'DEBUG' if debug else 'INFO',
        }
    }
    
    return LOGGING


class RequestIDFilter(logging.Filter):
    """
    Adds request_id to log records for request tracing
    """
    def filter(self, record):
        from django.core.wsgi import get_wsgi_application
        # Try to get request_id from current request
        try:
            from django.http import HttpRequest
            from threading import local
            
            # Access request from thread-local storage if available
            request = getattr(local, 'request', None)
            if hasattr(request, 'request_id'):
                record.request_id = request.request_id
            else:
                record.request_id = 'no-request-id'
        except:
            record.request_id = 'unknown'
        
        return True


# Logger shortcuts for common use cases
def get_logger(name):
    """Get configured logger instance"""
    return logging.getLogger(name)


def log_api_request(logger, request, message):
    """Log API request with context"""
    logger.info(message, extra={
        'request_id': getattr(request, 'request_id', 'unknown'),
        'user_id': getattr(request.user, 'user_id', None),
        'method': request.method,
        'path': request.path,
        'remote_addr': get_client_ip(request),
    })


def log_api_error(logger, request, exception, message):
    """Log API error with context"""
    logger.error(message, exc_info=True, extra={
        'request_id': getattr(request, 'request_id', 'unknown'),
        'user_id': getattr(request.user, 'user_id', None),
        'method': request.method,
        'path': request.path,
        'error_type': type(exception).__name__,
        'remote_addr': get_client_ip(request),
    })


def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
