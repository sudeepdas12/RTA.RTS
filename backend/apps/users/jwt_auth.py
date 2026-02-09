"""
Custom JWT authentication for custom User model
"""
from rest_framework_simplejwt.authentication import JWTAuthentication as BaseJWTAuthentication
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from apps.users.models import User


class CustomJWTAuthentication(BaseJWTAuthentication):
    """
    Custom JWT authentication that uses the custom User model
    """
    
    def authenticate(self, request):
        """
        Override authenticate to return tuple of (user, token)
        and set user_id attribute for middleware
        """
        result = super().authenticate(request)
        if result is None:
            return None
        
        user, validated_token = result
        
        # Set user_id attribute for middleware compatibility
        if user:
            user.user_id = validated_token.get(jwt_settings.USER_ID_CLAIM)
        
        return (user, validated_token)
    
    def get_user(self, validated_token):
        """
        Get user from token using custom User model with user_id field
        """
        user_id = validated_token.get(jwt_settings.USER_ID_CLAIM)
        
        if user_id is None:
            return None
        
        try:
            return User.objects.select_related('role').get(user_id=user_id)
        except User.DoesNotExist:
            return None
