from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Return a consistent error payload while preserving DRF status codes."""
    response = exception_handler(exc, context)

    if response is None:
        return response

    request = context.get('request')
    request_id = getattr(request, 'request_id', '-') if request else '-'
    status_code = response.status_code
    detail = response.data

    if isinstance(detail, dict):
        message = detail.get('detail') or detail.get('error') or 'Request failed'
    elif isinstance(detail, list):
        message = detail[0] if detail else 'Request failed'
    else:
        message = str(detail)

    response.data = {
        'error': str(message),
        'message': str(message),
        'status_code': status_code,
        'request_id': request_id,
        'details': detail,
    }
    return response
