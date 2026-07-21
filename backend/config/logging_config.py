from __future__ import annotations


def get_logging_config(debug: bool = False) -> dict:
    level = 'DEBUG' if debug else 'INFO'

    return {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
            },
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'standard',
            },
        },
        'root': {
            'handlers': ['console'],
            'level': level,
        },
        'loggers': {
            'django': {
                'handlers': ['console'],
                'level': level,
                'propagate': False,
            },
        },
    }