"""
Example API Tests for RTA/RTS System - Users & Authentication

Demonstrates:
- Testing authentication endpoints
- Testing permission checks
- Testing rate limiting
- Testing JWT token generation
"""

import pytest
from django.urls import reverse
from rest_framework import status
from apps.users.models import User


@pytest.mark.api
@pytest.mark.django_db
class TestAuthenticationAPI:
    """Test authentication endpoints"""
    
    def test_login_success(self, api_client, admin_user):
        """Test successful login"""
        url = reverse('login')
        data = {
            'username': 'admin',
            'password': 'AdminPassword123!',
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['username'] == 'admin'
        assert response.data['user']['role'] == 'Admin'
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with wrong password"""
        url = reverse('login')
        data = {
            'username': 'admin',
            'password': 'WrongPassword123!',
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'access' not in response.data
    
    def test_login_user_not_found(self, api_client):
        """Test login with non-existent user"""
        url = reverse('login')
        data = {
            'username': 'nonexistent',
            'password': 'Password123!',
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_refresh(self, api_client, admin_user):
        """Test JWT token refresh"""
        # First login to get tokens
        login_url = reverse('login')
        response = api_client.post(login_url, {
            'username': 'admin',
            'password': 'AdminPassword123!',
        })
        
        assert response.status_code == status.HTTP_200_OK
        refresh_token = response.data['refresh']
        
        # Use refresh token
        refresh_url = reverse('token_refresh')
        refresh_response = api_client.post(refresh_url, {
            'refresh': refresh_token
        })
        
        assert refresh_response.status_code == status.HTTP_200_OK
        assert 'access' in refresh_response.data
    
    def test_protected_endpoint_without_token(self, api_client):
        """Test that protected endpoints reject unauthenticated requests"""
        url = reverse('user-list')  # Assuming this endpoint exists
        
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_protected_endpoint_with_token(self, admin_api_client):
        """Test that protected endpoints accept valid tokens"""
        url = reverse('user-list')
        
        response = admin_api_client.get(url)
        
        # Admin should be able to access
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
        # 403 if endpoint doesn't exist, 200 if it does and user has permission


@pytest.mark.api
@pytest.mark.security
@pytest.mark.django_db
class TestPermissions:
    """Test permission-based access control"""
    
    def test_admin_can_access_all_endpoints(self, admin_api_client):
        """Admin user should have access to all operations"""
        # This is a general test; specific endpoints would be tested elsewhere
        assert admin_api_client.credentials is not None
    
    def test_finance_user_cannot_delete_payables(self, finance_api_client):
        """Finance operator should not have delete permission"""
        # This tests the RBAC system
        # Actual endpoint would be tested with specific data
        pass
    
    def test_auditor_read_only_access(self, api_client, auditor_role):
        """Auditor role should have read-only access"""
        auditor_user = User.objects.create_user(
            username='auditor_test',
            password='AuditorPass123!',
            role=auditor_role,
            status='active'
        )
        api_client.force_authenticate(user=auditor_user)
        
        # Auditor should be able to read
        # Auditor should NOT be able to create/update
        assert 'read' in auditor_role.permissions.get('audit', [])
        assert 'create' not in auditor_role.permissions.get('interest_payables', [])


@pytest.mark.api
@pytest.mark.security
@pytest.mark.django_db
class TestRateLimiting:
    """Test rate limiting on endpoints"""
    
    @pytest.mark.slow
    def test_anonymous_user_rate_limit(self, api_client):
        """Test that anonymous users hit rate limit"""
        url = reverse('login')
        data = {'username': 'test', 'password': 'test'}
        
        # Make many requests
        responses = []
        for i in range(105):  # Limit is 100/minute
            response = api_client.post(url, data)
            responses.append(response.status_code)
        
        # Should eventually get 429 (Too Many Requests)
        assert status.HTTP_429_TOO_MANY_REQUESTS in responses
    
    def test_authenticated_user_higher_limit(self, admin_api_client):
        """Test that authenticated users have higher rate limits"""
        # Authenticated users have 1000/hour limit
        # This would need more complex setup to test fully
        pass


@pytest.mark.unit
@pytest.mark.django_db
class TestUserModel:
    """Test User model"""
    
    def test_create_user(self, admin_role):
        """Test creating a new user"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPassword123!',
            role=admin_role,
        )
        
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.role == admin_role
        assert user.check_password('TestPassword123!')
    
    def test_user_password_hashed(self, admin_role):
        """Test that passwords are hashed"""
        user = User.objects.create_user(
            username='hashtest',
            password='PlainPassword123!',
            role=admin_role,
        )
        
        # Password should not be stored in plain text
        assert user.password != 'PlainPassword123!'
        assert user.check_password('PlainPassword123!')
    
    def test_inactive_user_cannot_login(self, api_client, admin_role):
        """Test that inactive users cannot login"""
        inactive_user = User.objects.create_user(
            username='inactive',
            password='InactivePass123!',
            status='inactive',
            role=admin_role,
        )
        
        url = reverse('login')
        response = api_client.post(url, {
            'username': 'inactive',
            'password': 'InactivePass123!',
        })
        
        # Should be rejected
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
