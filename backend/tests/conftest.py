"""
pytest configuration and shared fixtures for RTA/RTS test suite

Provides:
- Database fixtures
- User/Role fixtures
- API client fixtures
- Sample data factories
"""

import os
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from faker import Faker
from apps.users.models import Role
from apps.companies.models import Company
from apps.clients.models import Client as ClientModel

# Initialize faker
fake = Faker()
User = get_user_model()


# ============================================================================
# DATABASE & ENVIRONMENT FIXTURES
# ============================================================================

@pytest.fixture(scope='session')
def django_db_setup(django_db_setup, django_db_blocker):
    """Configure test database"""
    # You can add custom setup here
    with django_db_blocker.unblock():
        pass


@pytest.fixture
def db_reset(db):
    """Ensure clean database for test"""
    yield db


# ============================================================================
# ROLE & USER FIXTURES
# ============================================================================

@pytest.fixture
def admin_role(db):
    """Create or get admin role"""
    role, _ = Role.objects.get_or_create(
        role_name='Admin',
        defaults={'permissions': {'all': ['read', 'create', 'update', 'delete', 'approve']}}
    )
    return role


@pytest.fixture
def finance_operator_role(db):
    """Create or get finance operator role"""
    role, _ = Role.objects.get_or_create(
        role_name='Finance Operator',
        defaults={
            'permissions': {
                'interest_payables': ['read', 'create', 'update'],
                'dividend_payables': ['read', 'create', 'update'],
                'reconciliation': ['read', 'create', 'update'],
                'reports': ['read'],
                'companies': ['read'],
                'clients': ['read'],
            }
        }
    )
    return role


@pytest.fixture
def reconciliation_officer_role(db):
    """Create or get reconciliation officer role"""
    role, _ = Role.objects.get_or_create(
        role_name='Reconciliation Officer',
        defaults={
            'permissions': {
                'reconciliation': ['read', 'create', 'update'],
                'reports': ['read'],
                'companies': ['read'],
                'clients': ['read'],
            }
        }
    )
    return role


@pytest.fixture
def auditor_role(db):
    """Create or get auditor role"""
    role, _ = Role.objects.get_or_create(
        role_name='Auditor',
        defaults={
            'permissions': {
                'audit': ['read'],
                'reports': ['read'],
                'companies': ['read'],
                'clients': ['read'],
                'interest_payables': ['read'],
                'dividend_payables': ['read'],
                'reconciliation': ['read'],
            }
        }
    )
    return role


@pytest.fixture
def admin_user(db, admin_role):
    """Create admin test user"""
    user = User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='AdminPassword123!',
        full_name='Admin User',
        role=admin_role,
        status='active'
    )
    return user


@pytest.fixture
def finance_user(db, finance_operator_role):
    """Create finance operator test user"""
    user = User.objects.create_user(
        username='finance',
        email='finance@example.com',
        password='FinancePassword123!',
        full_name='Finance User',
        role=finance_operator_role,
        status='active'
    )
    return user


@pytest.fixture
def reconciliation_user(db, reconciliation_officer_role):
    """Create reconciliation officer test user"""
    user = User.objects.create_user(
        username='recuser',
        email='reconciliation@example.com',
        password='RecPassword123!',
        full_name='Reconciliation User',
        role=reconciliation_officer_role,
        status='active'
    )
    return user


# ============================================================================
# API CLIENT FIXTURES
# ============================================================================

@pytest.fixture
def api_client():
    """Basic API client (unauthenticated)"""
    return APIClient()


@pytest.fixture
def admin_api_client(admin_user):
    """Authenticated API client with admin user"""
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
    return client


@pytest.fixture
def finance_api_client(finance_user):
    """Authenticated API client with finance operator user"""
    client = APIClient()
    refresh = RefreshToken.for_user(finance_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
    return client


@pytest.fixture
def reconciliation_api_client(reconciliation_user):
    """Authenticated API client with reconciliation officer"""
    client = APIClient()
    refresh = RefreshToken.for_user(reconciliation_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
    return client


# ============================================================================
# MASTER DATA FIXTURES
# ============================================================================

@pytest.fixture
def test_company(db):
    """Create test company"""
    return Company.objects.create(
        company_code='TEST001',
        company_name='Test Company Ltd.',
        sector_type='private',
        interest_tax_status='active',
        status='active'
    )


@pytest.fixture
def test_company_public_sector(db):
    """Create test public sector company"""
    return Company.objects.create(
        company_code='PUBLIC001',
        company_name='Public Sector Company',
        sector_type='public',
        interest_tax_status='active',
        status='active'
    )


@pytest.fixture
def test_client(db, test_company):
    """Create test client"""
    return ClientModel.objects.create(
        company=test_company,
        client_code='CLI001',
        client_name='Test Client',
        boid='00000AB',
        holder_type='public',
        status='active'
    )


@pytest.fixture
def test_client_institution(db, test_company):
    """Create test institutional client"""
    return ClientModel.objects.create(
        company=test_company,
        client_code='CLI002',
        client_name='Test Institution',
        boid='00000AC',
        holder_type='institution',
        status='active'
    )


# ============================================================================
# SAMPLE DATA FIXTURES
# ============================================================================

@pytest.fixture
def sample_companies(db):
    """Create multiple sample companies"""
    companies = [
        Company.objects.create(
            company_code=f'COMP{i:03d}',
            company_name=f'Sample Company {i}',
            sector_type='private' if i % 2 == 0 else 'public',
            status='active'
        )
        for i in range(1, 6)
    ]
    return companies


@pytest.fixture
def sample_clients(db, sample_companies):
    """Create multiple sample clients"""
    clients = []
    for i, company in enumerate(sample_companies):
        for j in range(3):
            client = ClientModel.objects.create(
                company=company,
                client_code=f'CLI{i}{j}',
                client_name=f'Client {i}-{j}',
                boid=f'0000{i:02d}{j}',
                holder_type=['public', 'promoter', 'institution'][j % 3],
                status='active'
            )
            clients.append(client)
    return clients


# ============================================================================
# UTILITY FIXTURES & HELPERS
# ============================================================================

@pytest.fixture
def get_jwt_token_for_user():
    """Factory fixture to generate JWT tokens for users"""
    def _get_token(user):
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    return _get_token


@pytest.fixture
def random_email():
    """Generate random email"""
    return fake.email()


@pytest.fixture
def random_username():
    """Generate random username"""
    return fake.user_name()[:30]  # Max username length


# ============================================================================
# MARKERS FOR DIFFERENT TEST TYPES
# ============================================================================

def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line(
        "markers", "slow: mark test as slow to run"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers", "security: mark test as security test"
    )
    config.addinivalue_line(
        "markers", "api: mark test as API endpoint test"
    )
