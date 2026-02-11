
from rest_framework import permissions

class HasPermission(permissions.BasePermission):
    """
    Custom permission to check role-based access.
    ViewSet must define `required_permission` attribute.
    """
    
    def has_permission(self, request, view):
        # request.user is already the custom User model from JWT authentication
        if not request.user or not request.user.is_authenticated:
            logger.warning(f"User not authenticated: {request.user}")
            return False
        
        # Get required permission from view
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            logger.debug("No required_permission set, allowing")
            return True  # No specific permission required
        
        # Map HTTP methods to actions
        action_map = {
            'GET': 'read',
            'POST': 'create',
            'PUT': 'update',
            'PATCH': 'update',
            'DELETE': 'delete',
        }
        
        action = action_map.get(request.method, 'read')
        

        # Check permission using the custom User model
        return request.user.has_permission(required_permission, action)

class IsAdmin(permissions.BasePermission):
    """Check if user has Admin role"""
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role and request.user.role.role_name == 'Admin'


class ReadOnly(permissions.BasePermission):
    """Allow read-only access"""
    
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
