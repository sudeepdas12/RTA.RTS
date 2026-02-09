"""
Middleware to attach user object to request
"""


class UserObjectMiddleware:
    """Middleware to attach custom User model to request as user_obj"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # JWT authentication already returns custom User model
        # Just attach it as user_obj for compatibility with permissions
        
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.user_obj = request.user
        response = self.get_response(request)
        return response
