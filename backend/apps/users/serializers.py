from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model"""
    
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ('role_id', 'created_at')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ('user_id', 'username', 'full_name', 'email', 'password', 
                  'role', 'role_name', 'status', 'last_login', 'created_at', 'updated_at')
        read_only_fields = ('user_id', 'last_login', 'created_at', 'updated_at')
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Create user with hashed password"""
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            raise serializers.ValidationError({'password': 'Password is required'})
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """Update user, hash password if provided"""
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    
    role_name = serializers.CharField(source='role.role_name', read_only=True)
    permissions = serializers.JSONField(source='role.permissions', read_only=True)
    
    class Meta:
        model = User
        fields = ('user_id', 'username', 'full_name', 'email', 'role_name', 'permissions', 'last_login')
        read_only_fields = fields


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


class PendingUserChangeSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approver_username = serializers.CharField(source='approver.username', read_only=True)
    class Meta:
        model = __import__('apps.users.models', fromlist=['PendingUserChange']).PendingUserChange
        fields = ('change_id', 'requested_by', 'requested_by_username', 'target_user', 'action', 'data', 'status', 'approver', 'approver_username', 'requested_at', 'reviewed_at', 'reason')
        read_only_fields = ('change_id', 'status', 'approver', 'approver_username', 'requested_at', 'reviewed_at')

    def validate(self, attrs):
        action = attrs.get('action')
        # Basic validation: CREATE must include meaningful data, UPDATE/DELETE should include target_user
        if action == 'CREATE' and not attrs.get('data'):
            raise serializers.ValidationError({'data': 'Data is required for CREATE requests'})
        if action in ('UPDATE', 'DELETE') and not attrs.get('target_user'):
            raise serializers.ValidationError({'target_user': 'Target user is required for UPDATE/DELETE requests'})
        return attrs
