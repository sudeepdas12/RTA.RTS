from django.conf import settings
from django.db import connections
from django.db.utils import OperationalError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Basic liveness/readiness endpoint for orchestration and monitoring."""
    database_ok = True
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except OperationalError:
        database_ok = False

    return Response(
        {
            'service': 'rta-rts-backend',
            'status': 'ok' if database_ok else 'degraded',
            'debug': settings.DEBUG,
            'database': 'ok' if database_ok else 'unreachable',
            'request_id': getattr(request, 'request_id', '-'),
        },
        status=200 if database_ok else 503,
    )
