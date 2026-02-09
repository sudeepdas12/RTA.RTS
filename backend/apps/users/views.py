from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q

from .models import User, Role
from .models import PendingUserChange
from .serializers import (
    UserSerializer, RoleSerializer, UserLoginSerializer,
    UserProfileSerializer, ChangePasswordSerializer, PendingUserChangeSerializer
)
from .permissions import IsAdmin
from apps.audit.models import AuditLog
from django.utils import timezone
from django.db import transaction


class RoleViewSet(viewsets.ModelViewSet):
    """ViewSet for Role CRUD operations"""
    
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User CRUD operations"""
    
    queryset = User.objects.select_related('role').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        """Filter users based on query parameters"""
        queryset = User.objects.select_related('role').all()
        
        # Search filter
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        # Status filter
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Role filter
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role_id=role)
        
        return queryset


class PendingUserChangeViewSet(viewsets.ModelViewSet):
    """ViewSet to submit and review pending user changes (maker-checker)"""

    queryset = PendingUserChange.objects.select_related('requested_by', 'approver', 'target_user').all()
    serializer_class = PendingUserChangeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user_obj
        # If user can approve users, show all pending requests; otherwise only show own requests
        if user.has_permission('users', 'approve') or (user.role and user.role.role_name == 'Admin'):
            return self.queryset
        return self.queryset.filter(requested_by=user)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['requested_by'] = request.user_obj.user_id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        # Basic permission check: maker must have create/update/delete permission for users or be admin
        action = serializer.validated_data.get('action')
        user_obj = request.user_obj
        required_action = 'create' if action == 'CREATE' else 'update' if action == 'UPDATE' else 'delete'
        if not (user_obj.has_permission('users', required_action) or (user_obj.role and user_obj.role.role_name == 'Admin')):
            return Response({'error': 'Insufficient permissions to request this action'}, status=status.HTTP_403_FORBIDDEN)

        instance = serializer.save()
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        pending = self.get_object()
        user_obj = request.user_obj

        # Authorize approver
        if not (user_obj.has_permission('users', 'approve') or (user_obj.role and user_obj.role.role_name == 'Admin')):
            return Response({'error': 'Not authorized to approve'}, status=status.HTTP_403_FORBIDDEN)

        if pending.status != 'PENDING':
            return Response({'error': 'Request already reviewed'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                old_value = None
                new_value = None

                if pending.action == 'CREATE':
                    # Create the user
                    user_data = pending.data or {}
                    user_serializer = UserSerializer(data=user_data)
                    user_serializer.is_valid(raise_exception=True)
                    created_user = user_serializer.save()
                    new_value = UserSerializer(created_user).data
                    record_id = created_user.user_id

                elif pending.action == 'UPDATE':
                    target = pending.target_user
                    if not target:
                        return Response({'error': 'Target user not found'}, status=status.HTTP_400_BAD_REQUEST)
                    old_value = UserSerializer(target).data
                    for k, v in (pending.data or {}).items():
                        if k == 'password':
                            target.set_password(v)
                        else:
                            setattr(target, k, v)
                    target.save()
                    new_value = UserSerializer(target).data
                    record_id = target.user_id

                elif pending.action == 'DELETE':
                    target = pending.target_user
                    if not target:
                        return Response({'error': 'Target user not found'}, status=status.HTTP_400_BAD_REQUEST)
                    old_value = UserSerializer(target).data
                    record_id = target.user_id
                    target.delete()
                    new_value = None

                else:
                    return Response({'error': 'Unknown action type'}, status=status.HTTP_400_BAD_REQUEST)

                # Mark pending request approved
                pending.status = 'APPROVED'
                pending.approver = user_obj
                pending.reviewed_at = timezone.now()
                pending.save()

                # Create audit log entry
                AuditLog.objects.create(
                    user=user_obj,
                    action=pending.action,
                    table_name='users',
                    record_id=record_id,
                    old_value=old_value,
                    new_value=new_value,
                    ip_address=request.META.get('REMOTE_ADDR')
                )

                return Response(self.get_serializer(pending).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        pending = self.get_object()
        user_obj = request.user_obj

        if not (user_obj.has_permission('users', 'approve') or (user_obj.role and user_obj.role.role_name == 'Admin')):
            return Response({'error': 'Not authorized to reject'}, status=status.HTTP_403_FORBIDDEN)

        if pending.status != 'PENDING':
            return Response({'error': 'Request already reviewed'}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get('reason', '')
        pending.status = 'REJECTED'
        pending.approver = user_obj
        pending.reviewed_at = timezone.now()
        pending.reason = reason
        pending.save()

        # Audit log for rejection
        AuditLog.objects.create(
            user=user_obj,
            action='REJECT_'+pending.action,
            table_name='pending_user_changes',
            record_id=pending.change_id,
            old_value={'requested_by': pending.requested_by.user_id if pending.requested_by else None, 'data': pending.data},
            new_value={'status': pending.status, 'reason': reason},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response(self.get_serializer(pending).data)

    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """Get current user profile"""
        user_obj = request.user_obj
        serializer = UserProfileSerializer(user_obj)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Change current user password"""
        user_obj = request.user_obj
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not user_obj.check_password(serializer.validated_data['old_password']):
                return Response(
                    {'error': 'Old password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user_obj.set_password(serializer.validated_data['new_password'])
            user_obj.save()
            
            return Response({'message': 'Password changed successfully'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Custom login endpoint"""
    serializer = UserLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    
    try:
        user = User.objects.select_related('role').get(username=username, status='Active')
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid credentials or inactive user'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Verify password
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Update last login
    user.last_login = timezone.now()
    user.save()
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['user_id'] = user.user_id
    refresh['username'] = user.username
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'email': user.email,
            'role': user.role.role_name if user.role else None,
            'permissions': user.role.permissions if user.role else {}
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint"""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
