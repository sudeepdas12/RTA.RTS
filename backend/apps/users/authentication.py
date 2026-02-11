"""
Custom authentication backend to work with User model
"""
from .models import User


class CustomAuthBackend:
    """Custom authentication backend"""
    
    def authenticate(self, request, username=None, password=None):
        """Authenticate user"""
        try:
            user = User.objects.get(username=username, status='Active')
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            return None
        return None
    
    def get_user(self, user_id):
        """Get user by ID"""
        try:
            return User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return None
