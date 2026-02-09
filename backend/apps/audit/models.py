from django.db import models
from apps.users.models import User


class AuditLog(models.Model):
    """Audit Log Model"""
    
    audit_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    table_name = models.CharField(max_length=50)
    record_id = models.IntegerField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=50, null=True, blank=True)
    action_time = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-action_time']
    
    def __str__(self):
        return f"{self.action} on {self.table_name} by {self.user}"
