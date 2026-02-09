from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Audit Log (read-only)"""
    
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter audit logs"""
        queryset = AuditLog.objects.select_related('user').all()
        
        # User filter
        user_id = self.request.query_params.get('user', None)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Table filter
        table_name = self.request.query_params.get('table', None)
        if table_name:
            queryset = queryset.filter(table_name=table_name)
        
        # Action filter
        action = self.request.query_params.get('action', None)
        if action:
            queryset = queryset.filter(action=action)
        
        # Date range filter
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)
        
        if from_date:
            queryset = queryset.filter(action_time__gte=from_date)
        if to_date:
            queryset = queryset.filter(action_time__lte=to_date)
        
        return queryset
