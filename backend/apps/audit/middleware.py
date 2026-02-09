"""
Audit Middleware - Logs all database operations
"""
from .models import AuditLog
import json


class AuditMiddleware:
    """Middleware to log all CRUD operations"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Log only for authenticated users and specific methods
        if hasattr(request, 'user_obj') and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            self.log_action(request, response)
        
        return response
    
    def log_action(self, request, response):
        """Log the action"""
        try:
            user = request.user_obj
            action_map = {
                'POST': 'CREATE',
                'PUT': 'UPDATE',
                'PATCH': 'UPDATE',
                'DELETE': 'DELETE'
            }
            
            action = action_map.get(request.method, 'UNKNOWN')
            path_parts = request.path.split('/')
            table_name = path_parts[2] if len(path_parts) > 2 else 'unknown'
            
            # Get IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            # Try to get record ID from path
            record_id = None
            if len(path_parts) > 3 and path_parts[3].isdigit():
                record_id = int(path_parts[3])
            
            # Create audit log
            AuditLog.objects.create(
                user=user,
                action=action,
                table_name=table_name,
                record_id=record_id,
                new_value=request.data if hasattr(request, 'data') else None,
                ip_address=ip_address
            )
        except Exception as e:
            # Don't break the request if audit logging fails
            print(f"Audit logging error: {str(e)}")
