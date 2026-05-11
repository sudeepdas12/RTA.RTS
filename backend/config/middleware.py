import uuid
from contextvars import ContextVar


request_id_ctx = ContextVar('request_id', default='-')


class RequestIDMiddleware:
    """Attach and propagate request IDs for tracing and logs."""

    header_name = 'HTTP_X_REQUEST_ID'
    response_header = 'X-Request-ID'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get(self.header_name) or str(uuid.uuid4())
        request.request_id = request_id
        token = request_id_ctx.set(request_id)
        try:
            response = self.get_response(request)
            response[self.response_header] = request_id
            return response
        finally:
            request_id_ctx.reset(token)


class RequestIDLogFilter:
    """Inject request ID into logging records."""

    def filter(self, record):
        record.request_id = request_id_ctx.get()
        return True
