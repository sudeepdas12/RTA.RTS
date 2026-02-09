from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Role(models.Model):
    """Role Model"""
    
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)
    permissions = models.JSONField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'roles'
        ordering = ['role_name']
    
    def __str__(self):
        return self.role_name


class User(models.Model):
    """User Model"""
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]
    
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200, null=True, blank=True)
    email = models.EmailField(max_length=100, null=True, blank=True)
    password_hash = models.TextField()
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='users')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['username']
    
    def __str__(self):
        return f"{self.username} - {self.full_name}"
    
    def set_password(self, raw_password):
        """Hash and set password"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """Verify password"""
        return check_password(raw_password, self.password_hash)
    
    @property
    def is_authenticated(self):
        """Always return True for authenticated users (required for DRF IsAuthenticated permission)"""
        return True
    
    def has_permission(self, resource, action='read'):
        """Check if user has permission for a specific action on a resource"""
        if not self.role or not self.role.permissions:
            return False
        
        resource_perms = self.role.permissions.get(resource, [])
        return action in resource_perms


class PendingUserChange(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete')
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected')
    ]

    change_id = models.AutoField(primary_key=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='pending_requests')
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pending_target')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    data = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    approver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_requests')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'pending_user_changes'
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.action} by {self.requested_by} -> status {self.status}"
