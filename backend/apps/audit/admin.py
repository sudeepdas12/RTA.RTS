from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('audit_id', 'user', 'action', 'table_name', 'record_id', 'action_time')
    list_filter = ('action', 'table_name', 'action_time')
    search_fields = ('user__username', 'table_name')
    readonly_fields = ('audit_id', 'user', 'action', 'table_name', 'record_id', 
                      'old_value', 'new_value', 'ip_address', 'action_time')
