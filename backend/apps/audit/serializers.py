from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for Audit Log"""
    
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = '__all__'
        # fields that must remain read-only
        read_only_fields = ('audit_id', 'action_time')
