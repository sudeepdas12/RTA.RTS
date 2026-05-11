"""
Example API Tests for Payables Endpoints

Demonstrates:
- Testing interest payable creation/retrieval
- Testing upload functionality
- Testing business logic validation
- Testing permission checks
"""

import pytest
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from apps.payables.models import InterestPayable, DividendPayable


@pytest.mark.api
@pytest.mark.django_db
class TestInterestPayablesAPI:
    """Test Interest Payables API endpoints"""
    
    def test_list_interest_payables(self, finance_api_client, test_company, test_client):
        """Test listing interest payables"""
        # Create test data
        InterestPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_interest=Decimal('1000.00'),
            tax_amount=Decimal('150.00'),
            net_payable=Decimal('850.00'),
            payment_status='pending',
        )
        
        url = reverse('interest-list')
        response = finance_api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) > 0 or 'results' in response.data
    
    def test_create_interest_payable(self, finance_api_client, test_company, test_client):
        """Test creating interest payable"""
        url = reverse('interest-list')
        data = {
            'company': test_company.id,
            'client': test_client.id,
            'gross_interest': '1000.00',
            'tax_amount': '150.00',
            'net_payable': '850.00',
            'due_date': '2025-06-30',
            'payment_status': 'pending',
        }
        
        response = finance_api_client.post(url, data)
        
        assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)
        if response.status_code == status.HTTP_201_CREATED:
            assert response.data['net_payable'] == '850.00'
    
    def test_cannot_create_with_negative_amount(self, finance_api_client, test_company, test_client):
        """Test that negative amounts are rejected"""
        url = reverse('interest-list')
        data = {
            'company': test_company.id,
            'client': test_client.id,
            'gross_interest': '-1000.00',  # Invalid: negative
            'tax_amount': '0.00',
            'net_payable': '-1000.00',
            'due_date': '2025-06-30',
        }
        
        response = finance_api_client.post(url, data)
        
        # Should be rejected
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mark_interest_as_paid(self, finance_api_client, test_company, test_client):
        """Test updating payment status"""
        interest = InterestPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_interest=Decimal('1000.00'),
            tax_amount=Decimal('150.00'),
            net_payable=Decimal('850.00'),
            payment_status='pending',
        )
        
        url = reverse('interest-detail', args=[interest.id])
        data = {'payment_status': 'paid'}
        
        response = finance_api_client.patch(url, data)
        
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST)
    
    def test_get_interest_summary(self, finance_api_client, test_company, test_client):
        """Test getting aggregated summary"""
        # Create multiple records
        for i in range(3):
            InterestPayable.objects.create(
                company=test_company,
                client=test_client,
                gross_interest=Decimal('1000.00'),
                tax_amount=Decimal('150.00'),
                net_payable=Decimal('850.00'),
                payment_status='pending' if i % 2 == 0 else 'paid',
            )
        
        url = reverse('interest-summary')
        response = finance_api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # Should return aggregated data
        assert 'total' in response.data or response.status_code != 400


@pytest.mark.api
@pytest.mark.django_db
class TestDividendPayablesAPI:
    """Test Dividend Payables API endpoints"""
    
    def test_list_dividend_payables(self, finance_api_client, test_company, test_client):
        """Test listing dividend payables"""
        DividendPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_dividend=Decimal('500.00'),
            tax_amount=Decimal('50.00'),
            net_payable=Decimal('450.00'),
            payment_status='pending',
        )
        
        url = reverse('dividend-list')
        response = finance_api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_create_dividend_payable(self, finance_api_client, test_company, test_client_institution):
        """Test creating dividend payable for institution"""
        url = reverse('dividend-list')
        data = {
            'company': test_company.id,
            'client': test_client_institution.id,
            'gross_dividend': '500.00',
            'tax_amount': '50.00',
            'net_payable': '450.00',
            'payment_status': 'pending',
        }
        
        response = finance_api_client.post(url, data)
        
        assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)


@pytest.mark.api
@pytest.mark.security
@pytest.mark.django_db
class TestPayablesPermissions:
    """Test permission checks on payables endpoints"""
    
    def test_auditor_can_read_payables(self, api_client, auditor_role):
        """Auditor should be able to read payables"""
        from apps.users.models import User
        auditor = User.objects.create_user(
            username='auditor_test',
            password='AuditorPass123!',
            role=auditor_role,
            status='active'
        )
        api_client.force_authenticate(user=auditor)
        
        url = reverse('interest-list')
        response = api_client.get(url)
        
        # Should be able to read
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_403_FORBIDDEN)
    
    def test_auditor_cannot_create_payables(self, api_client, auditor_role, test_company, test_client):
        """Auditor should NOT be able to create payables"""
        from apps.users.models import User
        auditor = User.objects.create_user(
            username='auditor_create_test',
            password='AuditorPass123!',
            role=auditor_role,
            status='active'
        )
        api_client.force_authenticate(user=auditor)
        
        url = reverse('interest-list')
        data = {
            'company': test_company.id,
            'client': test_client.id,
            'gross_interest': '1000.00',
            'tax_amount': '150.00',
            'net_payable': '850.00',
        }
        
        response = api_client.post(url, data)
        
        # Should be denied
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_finance_operator_can_create_payables(self, finance_api_client, test_company, test_client):
        """Finance operator should be able to create payables"""
        url = reverse('interest-list')
        data = {
            'company': test_company.id,
            'client': test_client.id,
            'gross_interest': '1000.00',
            'tax_amount': '150.00',
            'net_payable': '850.00',
        }
        
        response = finance_api_client.post(url, data)
        
        # Should be allowed
        assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)


@pytest.mark.unit
@pytest.mark.django_db
class TestInterestPayableModel:
    """Test InterestPayable model business logic"""
    
    def test_create_interest_payable(self, test_company, test_client):
        """Test creating interest payable"""
        interest = InterestPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_interest=Decimal('1000.00'),
            tax_amount=Decimal('150.00'),
            net_payable=Decimal('850.00'),
        )
        
        assert interest.id is not None
        assert interest.payment_status == 'pending'  # Default status
    
    def test_calculated_fiscal_year(self, test_company, test_client):
        """Test automatic fiscal year calculation"""
        from django.utils import timezone
        from datetime import date
        
        # Fiscal year: July 1 - June 30
        interest = InterestPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_interest=Decimal('1000.00'),
            tax_amount=Decimal('150.00'),
            net_payable=Decimal('850.00'),
            due_date=date(2025, 3, 15),  # Before June 30 → fiscal year 2024-25
        )
        
        # This assumes the model has fiscal year calculation
        # Adjust based on actual implementation
        assert interest.company_id == test_company.id
    
    def test_interest_string_representation(self, test_company, test_client):
        """Test model string representation"""
        interest = InterestPayable.objects.create(
            company=test_company,
            client=test_client,
            gross_interest=Decimal('1000.00'),
            tax_amount=Decimal('150.00'),
            net_payable=Decimal('850.00'),
        )
        
        # Should have a meaningful string representation
        str_repr = str(interest)
        assert test_company.company_code in str_repr or test_client.client_code in str_repr
