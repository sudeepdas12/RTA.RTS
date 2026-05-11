#!/usr/bin/env python
"""
Comprehensive Sample Data Seeding Script
Populates all sections of the RTA/RTS system with realistic test data
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from apps.companies.models import Company
from apps.clients.models import Client
from apps.users.models import User
from apps.payables.models import InterestPayable, DividendPayable

def clear_data():
    """Clear all data from tables"""
    print("🗑️  Clearing existing data...")
    InterestPayable.objects.all().delete()
    DividendPayable.objects.all().delete()
    Client.objects.all().delete()
    Company.objects.all().delete()
    print("✓ Data cleared")

def seed_companies():
    """Create comprehensive company data"""
    print("\n📊 Creating Companies...")
    
    companies_data = [
        {
            'company_code': 'NBL',
            'company_name': 'Nepal Bank Limited',
            'sector_type': 'Private',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000001',
            'bank_account_no': 'ACC-2024-001',
            'bank_name': 'Nepal Bank Limited'
        },
        {
            'company_code': 'RBB',
            'company_name': 'Rastriya Banijya Bank',
            'sector_type': 'Public',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000002',
            'bank_account_no': 'ACC-2024-002',
            'bank_name': 'Rastriya Banijya Bank'
        },
        {
            'company_code': 'NICASIA',
            'company_name': 'NIC Asia Bank Limited',
            'sector_type': 'Private',
            'interest_tax_status': 'Exempted',
            'pan_no': '120000003',
            'bank_account_no': 'ACC-2024-003',
            'bank_name': 'NIC Asia Bank'
        },
        {
            'company_code': 'EBL',
            'company_name': 'Everest Bank Limited',
            'sector_type': 'Private',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000004',
            'bank_account_no': 'ACC-2024-004',
            'bank_name': 'Everest Bank'
        },
        {
            'company_code': 'NABIL',
            'company_name': 'NABIL Bank',
            'sector_type': 'Private',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000005',
            'bank_account_no': 'ACC-2024-005',
            'bank_name': 'NABIL Bank'
        },
        {
            'company_code': 'UBL',
            'company_name': 'United Bank Limited',
            'sector_type': 'Private',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000006',
            'bank_account_no': 'ACC-2024-006',
            'bank_name': 'United Bank'
        },
        {
            'company_code': 'BOKL',
            'company_name': 'Bank of Kathmandu',
            'sector_type': 'Private',
            'interest_tax_status': 'Exempted',
            'pan_no': '120000007',
            'bank_account_no': 'ACC-2024-007',
            'bank_name': 'Bank of Kathmandu'
        },
        {
            'company_code': 'SCBL',
            'company_name': 'Standard Chartered Bank Nepal',
            'sector_type': 'Private',
            'interest_tax_status': 'Taxable',
            'pan_no': '120000008',
            'bank_account_no': 'ACC-2024-008',
            'bank_name': 'Standard Chartered Bank'
        },
    ]
    
    companies = []
    for data in companies_data:
        company, created = Company.objects.get_or_create(
            company_code=data['company_code'],
            defaults=data
        )
        companies.append(company)
        status = "✓ Created" if created else "• Exists"
        print(f"  {status}: {company.company_code} - {company.company_name}")
    
    return companies

def seed_clients():
    """Create comprehensive client data"""
    print("\n👥 Creating Clients...")
    
    clients_data = [
        # Promoters
        {'client_code': 'C001', 'full_name': 'Hari Kumar Singh', 'holder_type': 'Promoter', 'boid': 'B001001'},
        {'client_code': 'C002', 'full_name': 'Shyam Lal Gupta', 'holder_type': 'Promoter', 'boid': 'B001002'},
        {'client_code': 'C003', 'full_name': 'Rajesh Kumar Patel', 'holder_type': 'Promoter', 'boid': 'B001003'},
        
        # Institutions
        {'client_code': 'C004', 'full_name': 'Nepal Insurance Company Limited', 'holder_type': 'Institution', 'boid': 'B001004'},
        {'client_code': 'C005', 'full_name': 'Kumari Bank Limited', 'holder_type': 'Institution', 'boid': 'B001005'},
        {'client_code': 'C006', 'full_name': 'NIC Insurance Limited', 'holder_type': 'Institution', 'boid': 'B001006'},
        
        # Public
        {'client_code': 'C007', 'full_name': 'Ramesh Magar', 'holder_type': 'Public', 'boid': 'B001007'},
        {'client_code': 'C008', 'full_name': 'Priya Sharma', 'holder_type': 'Public', 'boid': 'B001008'},
        {'client_code': 'C009', 'full_name': 'Deepak Adhikari', 'holder_type': 'Public', 'boid': 'B001009'},
        {'client_code': 'C010', 'full_name': 'Kavya Yadav', 'holder_type': 'Public', 'boid': 'B001010'},
        {'client_code': 'C011', 'full_name': 'Amit Pandey', 'holder_type': 'Public', 'boid': 'B001011'},
        {'client_code': 'C012', 'full_name': 'Neha Sharma', 'holder_type': 'Public', 'boid': 'B001012'},
        
        # Promoters (More)
        {'client_code': 'C013', 'full_name': 'Sanjay Kumar Singh', 'holder_type': 'Promoter', 'boid': 'B001013'},
        {'client_code': 'C014', 'full_name': 'Anita Kumari', 'holder_type': 'Promoter', 'boid': 'B001014'},
    ]
    
    clients = []
    for data in clients_data:
        client, created = Client.objects.get_or_create(
            client_code=data['client_code'],
            defaults=data
        )
        clients.append(client)
        status = "✓ Created" if created else "• Exists"
        print(f"  {status}: {client.client_code} - {client.full_name} ({client.holder_type})")
    
    return clients

def seed_interest_payables(companies, clients):
    """Create comprehensive interest payable data"""
    print("\n💰 Creating Interest Payables...")
    
    admin_user = User.objects.filter(role_id=1).first() or User.objects.first()
    
    statuses = ['Pending', 'Paid', 'Partial']
    base_date = datetime.now().date()
    
    payables_created = 0
    
    for i, company in enumerate(companies[:5]):  # First 5 companies
        for j, client in enumerate(clients[:8]):  # First 8 clients
            for cycle in range(2):  # 2 payable cycles per company-client
                due_date = base_date + timedelta(days=random.randint(30, 120))
                status = statuses[random.randint(0, 2)]
                
                gross = Decimal(str(random.randint(100000, 1000000)))
                tax_rate = Decimal('0') if company.interest_tax_status == 'Exempted' else Decimal(str(random.randint(5, 15)))
                tax = (gross * tax_rate / 100).quantize(Decimal('0.01'))
                net = (gross - tax).quantize(Decimal('0.01'))
                
                payable, created = InterestPayable.objects.get_or_create(
                    company=company,
                    client=client,
                    due_date=due_date,
                    defaults={
                        'gross_interest': gross,
                        'tax_amount': tax,
                        'net_payable': net,
                        'payment_status': status,
                        'tax_rate': tax_rate,
                        'payment_date': base_date - timedelta(days=10) if status in ['Paid', 'Partial'] else None,
                        'created_by': admin_user,
                        'principal_amount': Decimal(str(random.randint(1000000, 10000000))),
                        'interest_rate': Decimal(str(round(random.uniform(5.0, 12.0), 2))),
                        'bank_code': 'BANK001',
                        'bank_name': company.bank_name,
                        'account_number': company.bank_account_no,
                    }
                )
                
                if created:
                    payables_created += 1
    
    print(f"  ✓ Created {payables_created} interest payables")

def seed_dividend_payables(companies, clients):
    """Create comprehensive dividend payable data"""
    print("\n📈 Creating Dividend Payables...")
    
    admin_user = User.objects.filter(role_id=1).first() or User.objects.first()
    
    statuses = ['Pending', 'Paid', 'Partial']
    fiscal_years = ['2023/24', '2024/25']
    base_date = datetime.now().date()
    
    payables_created = 0
    
    for company in companies[:4]:  # First 4 companies
        for client in clients[:6]:  # First 6 clients
            for fy in fiscal_years:
                status = statuses[random.randint(0, 2)]
                
                shares = Decimal(str(random.randint(100, 5000)))
                gross = (shares * Decimal(str(random.randint(10, 500)))).quantize(Decimal('0.01'))
                tax_rate = Decimal('0') if company.interest_tax_status == 'Exempted' else Decimal(str(random.randint(5, 15)))
                tax = (gross * tax_rate / 100).quantize(Decimal('0.01'))
                net = (gross - tax).quantize(Decimal('0.01'))
                
                payable, created = DividendPayable.objects.get_or_create(
                    company=company,
                    client=client,
                    fiscal_year=fy,
                    defaults={
                        'shares_held': shares,
                        'gross_dividend': gross,
                        'tax_amount': tax,
                        'net_payable': net,
                        'payment_status': status,
                        'payment_date': base_date - timedelta(days=30) if status in ['Paid', 'Partial'] else None,
                        'created_by': admin_user,
                    }
                )
                
                if created:
                    payables_created += 1
    
    print(f"  ✓ Created {payables_created} dividend payables")

def print_summary():
    """Print data summary"""
    print("\n" + "="*60)
    print("📊 DATA SUMMARY")
    print("="*60)
    
    company_count = Company.objects.count()
    client_count = Client.objects.count()
    interest_count = InterestPayable.objects.count()
    dividend_count = DividendPayable.objects.count()
    
    print(f"✓ Companies: {company_count}")
    print(f"✓ Clients: {client_count}")
    print(f"✓ Interest Payables: {interest_count}")
    print(f"✓ Dividend Payables: {dividend_count}")
    
    total_interest = InterestPayable.objects.aggregate(
        total=models.Sum('net_payable')
    )['total'] or Decimal(0)
    
    total_dividend = DividendPayable.objects.aggregate(
        total=models.Sum('net_payable')
    )['total'] or Decimal(0)
    
    print(f"\n💵 Total Interest Payable: Rs. {total_interest:,.2f}")
    print(f"💵 Total Dividend Payable: Rs. {total_dividend:,.2f}")
    print(f"💵 Total Payables: Rs. {(total_interest + total_dividend):,.2f}")
    
    pending_interest = InterestPayable.objects.filter(payment_status='Pending').count()
    pending_dividend = DividendPayable.objects.filter(payment_status='Pending').count()
    print(f"\n⏳ Pending Interest: {pending_interest}")
    print(f"⏳ Pending Dividend: {pending_dividend}")
    
    print("\n✅ Data seeding completed successfully!")

if __name__ == '__main__':
    from django.db import models
    
    try:
        print("🌱 Starting Comprehensive Data Seeding...\n")
        
        # Seed data
        clear_data()
        companies = seed_companies()
        clients = seed_clients()
        seed_interest_payables(companies, clients)
        seed_dividend_payables(companies, clients)
        
        # Print summary
        print_summary()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
