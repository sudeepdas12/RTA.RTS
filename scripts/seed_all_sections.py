#!/usr/bin/env python
"""
Complete Comprehensive Data Seeding Script
Populates ALL sections of the RTA/RTS system with realistic test data
"""

import os
import sys
import django
from datetime import datetime, timedelta, date
from decimal import Decimal
import random
from django.utils import timezone

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import models
from apps.companies.models import Company
from apps.clients.models import Client
from apps.users.models import User, Role, PendingUserChange
from apps.payables.models import InterestPayable, DividendPayable
from apps.reconciliation.models import BankStatement, BankTransaction, Reconciliation
from apps.audit.models import AuditLog
from apps.settings.models import FiscalYearSettings

def clear_all_data():
    """Clear all data from all tables"""
    print("🗑️  Clearing all existing data...")
    
    # Clear in dependency order, handling potential missing tables gracefully
    try:
        Reconciliation.objects.all().delete()
    except:
        pass
    
    try:
        BankTransaction.objects.all().delete()
    except:
        pass
    
    try:
        BankStatement.objects.all().delete()
    except:
        pass
    
    try:
        AuditLog.objects.all().delete()
    except:
        pass
    
    try:
        DividendPayable.objects.all().delete()
    except:
        pass
    
    try:
        InterestPayable.objects.all().delete()
    except:
        pass
    
    try:
        PendingUserChange.objects.all().delete()
    except:
        pass
    
    try:
        Client.objects.all().delete()
    except:
        pass
    
    try:
        Company.objects.all().delete()
    except:
        pass
    
    try:
        FiscalYearSettings.objects.all().delete()
    except:
        pass
    
    try:
        User.objects.exclude(username='admin').delete()
    except:
        pass
    
    print("✓ All data cleared")

def seed_roles():
    """Create user roles"""
    print("\n🔐 Creating Roles...")
    
    roles_data = [
        {
            'role_name': 'Administrator',
            'permissions': {
                'users': ['create', 'read', 'update', 'delete', 'approve'],
                'companies': ['create', 'read', 'update', 'delete'],
                'clients': ['create', 'read', 'update', 'delete'],
                'payables': ['create', 'read', 'update', 'delete', 'approve'],
                'reconciliation': ['create', 'read', 'update', 'delete'],
                'reports': ['read', 'export'],
                'audit': ['read'],
                'settings': ['read', 'update']
            },
            'description': 'Full system access'
        },
        {
            'role_name': 'Manager',
            'permissions': {
                'companies': ['read'],
                'clients': ['read'],
                'payables': ['create', 'read', 'update', 'approve'],
                'reconciliation': ['create', 'read', 'update'],
                'reports': ['read', 'export'],
                'audit': ['read']
            },
            'description': 'Can manage payables and reconciliation'
        },
        {
            'role_name': 'Operator',
            'permissions': {
                'companies': ['read'],
                'clients': ['read'],
                'payables': ['read'],
                'reconciliation': ['create', 'read'],
                'reports': ['read'],
                'audit': ['read']
            },
            'description': 'Can view and create reconciliation records'
        },
        {
            'role_name': 'Viewer',
            'permissions': {
                'companies': ['read'],
                'clients': ['read'],
                'payables': ['read'],
                'reports': ['read'],
                'audit': ['read']
            },
            'description': 'Read-only access'
        }
    ]
    
    roles = {}
    for data in roles_data:
        role, created = Role.objects.get_or_create(
            role_name=data['role_name'],
            defaults={
                'permissions': data['permissions'],
                'description': data['description']
            }
        )
        roles[data['role_name']] = role
        status = "✓ Created" if created else "• Exists"
        print(f"  {status}: {role.role_name}")
    
    return roles

def seed_users(roles):
    """Create additional users"""
    print("\n👤 Creating Users...")
    
    admin_user = User.objects.filter(username='admin').first()
    
    users_data = [
        {
            'username': 'manager1',
            'full_name': 'Rajesh Kumar',
            'email': 'rajesh.kumar@rta.gov.np',
            'password': 'manager123',
            'role': roles['Manager'],
            'status': 'Active'
        },
        {
            'username': 'manager2',
            'full_name': 'Priya Sharma',
            'email': 'priya.sharma@rta.gov.np',
            'password': 'manager123',
            'role': roles['Manager'],
            'status': 'Active'
        },
        {
            'username': 'operator1',
            'full_name': 'Amit Pandey',
            'email': 'amit.pandey@rta.gov.np',
            'password': 'operator123',
            'role': roles['Operator'],
            'status': 'Active'
        },
        {
            'username': 'operator2',
            'full_name': 'Neha Singh',
            'email': 'neha.singh@rta.gov.np',
            'password': 'operator123',
            'role': roles['Operator'],
            'status': 'Active'
        },
        {
            'username': 'operator3',
            'full_name': 'Deepak Adhikari',
            'email': 'deepak.adhikari@rta.gov.np',
            'password': 'operator123',
            'role': roles['Operator'],
            'status': 'Active'
        },
        {
            'username': 'viewer1',
            'full_name': 'Kavya Yadav',
            'email': 'kavya.yadav@rta.gov.np',
            'password': 'viewer123',
            'role': roles['Viewer'],
            'status': 'Active'
        },
    ]
    
    users = [admin_user]
    for data in users_data:
        user, created = User.objects.get_or_create(
            username=data['username'],
            defaults={
                'full_name': data['full_name'],
                'email': data['email'],
                'role': data['role'],
                'status': data['status']
            }
        )
        
        if created:
            user.set_password(data['password'])
            user.save()
        
        users.append(user)
        status = "✓ Created" if created else "• Exists"
        print(f"  {status}: {user.username} - {user.full_name} ({user.role.role_name})")
    
    return users

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
        {'client_code': 'C001', 'full_name': 'Hari Kumar Singh', 'holder_type': 'Promoter', 'boid': 'B001001'},
        {'client_code': 'C002', 'full_name': 'Shyam Lal Gupta', 'holder_type': 'Promoter', 'boid': 'B001002'},
        {'client_code': 'C003', 'full_name': 'Rajesh Kumar Patel', 'holder_type': 'Promoter', 'boid': 'B001003'},
        {'client_code': 'C004', 'full_name': 'Nepal Insurance Company Limited', 'holder_type': 'Institution', 'boid': 'B001004'},
        {'client_code': 'C005', 'full_name': 'Kumari Bank Limited', 'holder_type': 'Institution', 'boid': 'B001005'},
        {'client_code': 'C006', 'full_name': 'NIC Insurance Limited', 'holder_type': 'Institution', 'boid': 'B001006'},
        {'client_code': 'C007', 'full_name': 'Ramesh Magar', 'holder_type': 'Public', 'boid': 'B001007'},
        {'client_code': 'C008', 'full_name': 'Priya Sharma', 'holder_type': 'Public', 'boid': 'B001008'},
        {'client_code': 'C009', 'full_name': 'Deepak Adhikari', 'holder_type': 'Public', 'boid': 'B001009'},
        {'client_code': 'C010', 'full_name': 'Kavya Yadav', 'holder_type': 'Public', 'boid': 'B001010'},
        {'client_code': 'C011', 'full_name': 'Amit Pandey', 'holder_type': 'Public', 'boid': 'B001011'},
        {'client_code': 'C012', 'full_name': 'Neha Sharma', 'holder_type': 'Public', 'boid': 'B001012'},
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

def seed_fiscal_year_settings(companies):
    """Create fiscal year settings"""
    print("\n⚙️  Creating Fiscal Year Settings...")
    
    fiscal_years = ['2022/23', '2023/24', '2024/25', '2025/26']
    created_count = 0
    
    for company in companies:
        for i, fy in enumerate(fiscal_years):
            setting, created = FiscalYearSettings.objects.get_or_create(
                company=company,
                fiscal_year=fy,
                defaults={
                    'interest_rate': Decimal(str(random.uniform(6.0, 14.0))),
                    'tax_rate': Decimal(str(random.randint(5, 15))),
                    'is_active': (i == len(fiscal_years) - 1)  # Last one is active
                }
            )
            if created:
                created_count += 1
    
    print(f"  ✓ Created {created_count} fiscal year settings")

def seed_payables(companies, clients, admin_user):
    """Create comprehensive payable data"""
    print("\n💰 Creating Interest and Dividend Payables...")
    
    statuses = ['Pending', 'Paid', 'Partial']
    base_date = datetime.now().date()
    
    interest_count = 0
    dividend_count = 0
    
    for i, company in enumerate(companies[:5]):
        for j, client in enumerate(clients[:8]):
            for cycle in range(2):
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
                    interest_count += 1
    
    for company in companies[:4]:
        for client in clients[:6]:
            for fy in ['2023/24', '2024/25']:
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
                    dividend_count += 1
    
    print(f"  ✓ Created {interest_count} interest payables")
    print(f"  ✓ Created {dividend_count} dividend payables")

def seed_bank_statements_and_transactions(companies, admin_user):
    """Create bank statements, transactions, and reconciliation data"""
    print("\n🏦 Creating Bank Statements and Transactions...")
    
    base_date = datetime.now().date()
    stmt_count = 0
    txn_count = 0
    recon_count = 0
    
    for company in companies[:4]:  # 4 companies
        for month_offset in range(3):  # 3 months of data
            stmt_from = base_date - timedelta(days=30 * (month_offset + 1))
            stmt_to = base_date - timedelta(days=30 * month_offset)
            
            stmt, created = BankStatement.objects.get_or_create(
                bank_name=company.bank_name,
                account_no=company.bank_account_no,
                statement_from=stmt_from,
                statement_to=stmt_to,
                defaults={
                    'uploaded_by': admin_user,
                    'file_name': f"{company.company_code}_statement_{stmt_from.strftime('%Y%m%d')}.csv",
                }
            )
            
            if created:
                stmt_count += 1
                
                # Create transactions for this statement
                total_debit = Decimal(0)
                total_credit = Decimal(0)
                
                for day_offset in range((stmt_to - stmt_from).days):
                    current_date = stmt_from + timedelta(days=day_offset)
                    
                    # Create 2-4 transactions per day
                    for _ in range(random.randint(2, 4)):
                        is_credit = random.choice([True, False])
                        amount = Decimal(str(random.randint(100000, 5000000)))
                        
                        if is_credit:
                            total_credit += amount
                        else:
                            total_debit += amount
                        
                        txn, created_txn = BankTransaction.objects.get_or_create(
                            bank_stmt=stmt,
                            txn_date=current_date,
                            reference_no=f"REF-{current_date.strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
                            defaults={
                                'debit': amount if not is_credit else Decimal(0),
                                'credit': amount if is_credit else Decimal(0),
                                'balance': Decimal(str(random.randint(1000000, 50000000))),
                                'description': f"Transaction for {company.company_name}",
                            }
                        )
                        
                        if created_txn:
                            txn_count += 1
                
                # Update statement totals
                stmt.total_debit = total_debit
                stmt.total_credit = total_credit
                stmt.save()
                
                # Create reconciliation records for some transactions
                all_transactions = stmt.transactions.all()
                transactions = list(all_transactions)[:min(5, len(all_transactions))]
                for txn in transactions:
                    recon, created_recon = Reconciliation.objects.get_or_create(
                        bank_txn=txn,
                        defaults={
                            'source_type': 'Interest' if random.choice([True, False]) else 'Dividend',
                            'source_id': random.randint(1, 100),
                            'matched_amount': Decimal(str(random.randint(100000, 1000000))),
                            'recon_status': random.choice(['Matched', 'Partial', 'Exception']),
                            'notes': 'Auto-reconciled during data seeding',
                            'reconciled_by': admin_user,
                        }
                    )
                    
                    if created_recon:
                        recon_count += 1
    
    print(f"  ✓ Created {stmt_count} bank statements")
    print(f"  ✓ Created {txn_count} bank transactions")
    print(f"  ✓ Created {recon_count} reconciliation records")

def seed_audit_logs(users, companies, clients):
    """Create audit log entries"""
    print("\n📝 Creating Audit Logs...")
    
    actions = [
        ('CREATE', 'companies', 1),
        ('UPDATE', 'clients', 1),
        ('DELETE', 'reconciliation', 1),
        ('CREATE', 'interest_payables', 1),
        ('UPDATE', 'dividend_payables', 1),
        ('APPROVE', 'payables', 1),
        ('EXPORT', 'reports', None),
    ]
    
    base_time = timezone.now()
    log_count = 0
    
    for i in range(60):  # Create 60 audit log entries
        action, table, record_id = random.choice(actions)
        user = random.choice(users)
        
        log, created = AuditLog.objects.get_or_create(
            user=user,
            action=action,
            table_name=table,
            record_id=record_id,
            action_time=base_time - timedelta(hours=random.randint(1, 72)),
            defaults={
                'old_value': {'status': 'Pending'} if action == 'UPDATE' else None,
                'new_value': {'status': 'Approved'} if action == 'UPDATE' else None,
                'ip_address': f"192.168.1.{random.randint(1, 255)}",
            }
        )
        
        if created:
            log_count += 1
    
    print(f"  ✓ Created {log_count} audit log entries")

def seed_pending_user_changes(users):
    """Create pending user change requests"""
    print("\n❍ Creating Pending User Changes...")
    
    # Get first user as admin for approvals
    requester = users[0]
    approver = users[0] if len(users) > 0 else None
    
    # Get operators and other non-requester users
    other_users = users[1:] if len(users) > 1 else users
    
    if not other_users or not approver:
        print("  ⚠ Skipped: Not enough users for pending changes")
        return
    
    change_count = 0
    
    # Create some pending requests
    for _ in range(5):
        try:
            target = random.choice(other_users)
            change, created = PendingUserChange.objects.get_or_create(
                requested_by=requester,
                target_user=target,
                action='UPDATE',
                status='PENDING',
                defaults={
                    'data': {
                        'full_name': f"{random.choice(['Mr.', 'Ms.', 'Mrs.'])} Updated Name",
                        'email': 'newemail@rta.gov.np'
                    },
                }
            )
            
            if created:
                change_count += 1
        except:
            pass
    
    # Create some approved requests
    for _ in range(3):
        try:
            target = random.choice(other_users)
            change, created = PendingUserChange.objects.get_or_create(
                requested_by=requester,
                target_user=target,
                action='CREATE',
                status='APPROVED',
                defaults={
                    'approver': approver,
                    'reviewed_at': timezone.now() - timedelta(days=random.randint(1, 7)),
                    'data': {
                        'username': f'newuser{random.randint(1000, 9999)}',
                        'full_name': f"{random.choice(['Mr.', 'Ms.', 'Mrs.'])} New User"
                    },
                }
            )
            
            if created:
                change_count += 1
        except:
            pass
    
    print(f"  ✓ Created {change_count} pending user changes")

def print_summary():
    """Print complete data summary"""
    print("\n" + "="*70)
    print("📊 COMPLETE DATA SEEDING SUMMARY")
    print("="*70)
    
    company_count = Company.objects.count()
    client_count = Client.objects.count()
    user_count = User.objects.count()
    role_count = Role.objects.count()
    interest_count = InterestPayable.objects.count()
    dividend_count = DividendPayable.objects.count()
    stmt_count = BankStatement.objects.count()
    txn_count = BankTransaction.objects.count()
    recon_count = Reconciliation.objects.count()
    audit_count = AuditLog.objects.count()
    fiscal_count = FiscalYearSettings.objects.count()
    
    try:
        pending_count = PendingUserChange.objects.count()
    except:
        pending_count = 0
    
    print(f"\n📦 CORE DATA:")
    print(f"  ✓ Companies: {company_count}")
    print(f"  ✓ Clients: {client_count}")
    print(f"  ✓ Users: {user_count}")
    print(f"  ✓ Roles: {role_count}")
    
    print(f"\n💰 PAYABLES:")
    print(f"  ✓ Interest Payables: {interest_count}")
    print(f"  ✓ Dividend Payables: {dividend_count}")
    
    print(f"\n🏦 RECONCILIATION:")
    print(f"  ✓ Bank Statements: {stmt_count}")
    print(f"  ✓ Bank Transactions: {txn_count}")
    print(f"  ✓ Reconciliation Records: {recon_count}")
    
    print(f"\n📋 ADMINISTRATIVE:")
    print(f"  ✓ Audit Logs: {audit_count}")
    print(f"  ✓ Fiscal Year Settings: {fiscal_count}")
    print(f"  ✓ Pending User Changes: {pending_count}")
    
    total_records = (company_count + client_count + user_count + interest_count + 
                    dividend_count + stmt_count + txn_count + recon_count + 
                    audit_count + fiscal_count + pending_count)
    
    print(f"\n📊 TOTAL RECORDS: {total_records}")
    
    # Financial summary
    total_interest = InterestPayable.objects.aggregate(
        total=models.Sum('net_payable')
    )['total'] or Decimal(0)
    
    total_dividend = DividendPayable.objects.aggregate(
        total=models.Sum('net_payable')
    )['total'] or Decimal(0)
    
    print(f"\n💵 FINANCIAL SUMMARY:")
    print(f"  ✓ Total Interest Payable: Rs. {total_interest:,.2f}")
    print(f"  ✓ Total Dividend Payable: Rs. {total_dividend:,.2f}")
    print(f"  ✓ Combined Total: Rs. {(total_interest + total_dividend):,.2f}")
    
    # Payment status summary
    pending_interest = InterestPayable.objects.filter(payment_status='Pending').count()
    paid_interest = InterestPayable.objects.filter(payment_status='Paid').count()
    partial_interest = InterestPayable.objects.filter(payment_status='Partial').count()
    
    pending_dividend = DividendPayable.objects.filter(payment_status='Pending').count()
    paid_dividend = DividendPayable.objects.filter(payment_status='Paid').count()
    partial_dividend = DividendPayable.objects.filter(payment_status='Partial').count()
    
    print(f"\n⏳ PAYMENT STATUS:")
    print(f"  Interest - Pending: {pending_interest}, Paid: {paid_interest}, Partial: {partial_interest}")
    print(f"  Dividend - Pending: {pending_dividend}, Paid: {paid_dividend}, Partial: {partial_dividend}")
    
    print(f"\n👥 USER ACCESS:")
    for role in Role.objects.all():
        role_user_count = User.objects.filter(role=role).count()
        print(f"  ✓ {role.role_name}: {role_user_count} user(s)")
    
    print("\n✅ ALL SECTIONS SEEDED SUCCESSFULLY!")

if __name__ == '__main__':
    
    try:
        print("🌱 Starting Complete Data Seeding for ALL Sections...\n")
        
        # Clear and seed data
        clear_all_data()
        roles = seed_roles()
        users = seed_users(roles)
        admin_user = User.objects.filter(username='admin').first()
        companies = seed_companies()
        clients = seed_clients()
        seed_fiscal_year_settings(companies)
        seed_payables(companies, clients, admin_user)
        seed_bank_statements_and_transactions(companies, admin_user)
        seed_audit_logs(users, companies, clients)
        seed_pending_user_changes(users)
        
        # Print summary
        print_summary()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
