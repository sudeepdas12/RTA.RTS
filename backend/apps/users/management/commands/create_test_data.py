from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
import datetime

from apps.users.models import Role, User
from apps.companies.models import Company
from apps.clients.models import Client
from apps.payables.models import InterestPayable, DividendPayable
from apps.reconciliation.models import BankStatement, BankTransaction, Reconciliation
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Create Nepal RTA/RTS flavored test data across apps for end-to-end testing'

    def handle(self, *args, **options):
        now = timezone.now()
        resources = [
            'companies',
            'clients',
            'users',
            'interest_payables',
            'dividend_payables',
            'reconciliation',
            'audit',
            'reports',
        ]
        full_access = ['create', 'read', 'update', 'delete']

        def base_permissions(overrides=None):
            perms = {res: [] for res in resources}
            if overrides:
                perms.update(overrides)
            return perms

        role_blueprints = [
            {
                'name': 'Admin',
                'description': 'System administrator for Nepal RTA/RTS sample environment',
                'permissions': {res: full_access[:] for res in resources},
            },
            {
                'name': 'Accountant',
                'description': 'Settlement accountant responsible for matching payables',
                'permissions': base_permissions({
                    'companies': ['read'],
                    'clients': ['read'],
                    'interest_payables': ['create', 'read', 'update'],
                    'dividend_payables': ['create', 'read', 'update'],
                    'reconciliation': ['create', 'read', 'update'],
                    'audit': ['read'],
                    'reports': ['read'],
                }),
            },
            {
                'name': 'Auditor',
                'description': 'External auditor for Nepal RTS',
                'permissions': base_permissions({
                    'companies': ['read'],
                    'clients': ['read'],
                    'users': ['read'],
                    'interest_payables': ['read'],
                    'dividend_payables': ['read'],
                    'reconciliation': ['read'],
                    'audit': ['read'],
                    'reports': ['read'],
                }),
            },
            {
                'name': 'Maker',
                'description': 'Maker desk user (Lalitpur registrar office)',
                'permissions': base_permissions({
                    'companies': ['create', 'read', 'update'],
                    'clients': ['create', 'read', 'update'],
                    'interest_payables': ['create', 'read'],
                    'dividend_payables': ['create', 'read'],
                    'reconciliation': ['read'],
                    'reports': ['read'],
                }),
            },
            {
                'name': 'Checker',
                'description': 'Checker desk approving maker entries',
                'permissions': base_permissions({
                    'companies': ['read', 'update'],
                    'clients': ['read', 'update'],
                    'interest_payables': ['read', 'update'],
                    'dividend_payables': ['read', 'update'],
                    'reconciliation': ['read', 'update'],
                    'audit': ['read'],
                    'reports': ['read'],
                }),
            },
            {
                'name': 'Viewer',
                'description': 'Read-only dashboard consumer',
                'permissions': base_permissions({
                    'companies': ['read'],
                    'clients': ['read'],
                    'interest_payables': ['read'],
                    'dividend_payables': ['read'],
                    'reconciliation': ['read'],
                    'audit': ['read'],
                    'reports': ['read'],
                }),
            },
        ]

        roles = {}
        for blueprint in role_blueprints:
            role, _ = Role.objects.update_or_create(
                role_name=blueprint['name'],
                defaults={
                    'permissions': blueprint['permissions'],
                    'description': blueprint['description'],
                },
            )
            roles[blueprint['name']] = role

        user_blueprints = [
            {'username': 'admin', 'full_name': 'Central RTA Admin', 'email': 'admin@rta.gov.np', 'password': 'admin123', 'role': 'Admin'},
            {'username': 'accountant', 'full_name': 'Ledger Accountant - Kathmandu', 'email': 'accountant@rta.gov.np', 'password': 'acct123', 'role': 'Accountant'},
            {'username': 'auditor', 'full_name': 'OAG Nepal Auditor', 'email': 'auditor@oagnepal.gov.np', 'password': 'auditor123', 'role': 'Auditor'},
            {'username': 'maker', 'full_name': 'Maker Desk Lalitpur', 'email': 'maker@rta.gov.np', 'password': 'maker123', 'role': 'Maker'},
            {'username': 'checker', 'full_name': 'Checker Desk Kathmandu', 'email': 'checker@rta.gov.np', 'password': 'checker123', 'role': 'Checker'},
            {'username': 'analyst', 'full_name': 'Data Analyst Nepal RTS', 'email': 'analyst@rta.gov.np', 'password': 'analyst123', 'role': 'Viewer'},
        ]

        users = {}
        for blueprint in user_blueprints:
            defaults = {
                'full_name': blueprint['full_name'],
                'email': blueprint['email'],
                'role': roles[blueprint['role']],
                'status': 'Active',
                'password_hash': '',
            }
            user, _ = User.objects.get_or_create(username=blueprint['username'], defaults=defaults)
            user.full_name = blueprint['full_name']
            user.email = blueprint['email']
            user.role = roles[blueprint['role']]
            user.status = 'Active'
            user.set_password(blueprint['password'])
            user.save()
            users[blueprint['username']] = user

        admin_user = users['admin']
        accountant_user = users['accountant']

        company_blueprints = [
            {
                'company_code': 'NTC',
                'company_name': 'Nepal Telecom Company Limited',
                'sector_type': 'Public',
                'interest_tax_status': 'Taxable',
                'pan_no': '302045701',
                'bank_name': 'Rastriya Banijya Bank',
                'bank_account_no': '01001000012345',
            },
            {
                'company_code': 'NABIL',
                'company_name': 'Nabil Debenture Holdings',
                'sector_type': 'Public',
                'interest_tax_status': 'Taxable',
                'pan_no': '500207701',
                'bank_name': 'Nabil Bank Limited',
                'bank_account_no': '00405010010001',
            },
            {
                'company_code': 'NRIC',
                'company_name': 'Nepal Reinsurance Company',
                'sector_type': 'Public',
                'interest_tax_status': 'Exempted',
                'pan_no': '303030303',
                'bank_name': 'Nepal Rastra Bank',
                'bank_account_no': '22010010000011',
            },
            {
                'company_code': 'HIDCL',
                'company_name': 'Hydroelectric Investment & Development Company Ltd',
                'sector_type': 'Public',
                'interest_tax_status': 'Taxable',
                'pan_no': '606060606',
                'bank_name': 'Himalayan Bank Ltd',
                'bank_account_no': '04030000012345',
            },
            {
                'company_code': 'NYADI',
                'company_name': 'Nyadi Hydropower Limited',
                'sector_type': 'Private',
                'interest_tax_status': 'Taxable',
                'pan_no': '777888999',
                'bank_name': 'NIC Asia Bank',
                'bank_account_no': '250101000123456',
            },
            {
                'company_code': 'SBL',
                'company_name': 'Sunrise Bank Limited',
                'sector_type': 'Public',
                'interest_tax_status': 'Taxable',
                'pan_no': '606070808',
                'bank_name': 'Sunrise Bank Limited',
                'bank_account_no': '03030300004567',
            },
            {
                'company_code': 'PRVU',
                'company_name': 'Prabhu Bank Debenture Unit',
                'sector_type': 'Public',
                'interest_tax_status': 'Taxable',
                'pan_no': '777666555',
                'bank_name': 'Prabhu Bank Limited',
                'bank_account_no': '05050500007890',
            },
            {
                'company_code': 'UNL',
                'company_name': 'Unilever Nepal Limited',
                'sector_type': 'Private',
                'interest_tax_status': 'Taxable',
                'pan_no': '404040404',
                'bank_name': 'Standard Chartered Bank Nepal',
                'bank_account_no': '06060600004567',
            },
            {
                'company_code': 'NRCS',
                'company_name': 'Nepal Red Cross Society',
                'sector_type': 'Public',
                'interest_tax_status': 'Exempted',
                'pan_no': '500123456',
                'bank_name': 'Nepal Rastra Bank',
                'bank_account_no': '22010010000055',
            },
            {
                'company_code': 'NHPC',
                'company_name': 'Nepal Health and Population Commission',
                'sector_type': 'Public',
                'interest_tax_status': 'Exempted',
                'pan_no': '600234567',
                'bank_name': 'Rastriya Banijya Bank',
                'bank_account_no': '01001000088899',
            },
            {
                'company_code': 'CNRM',
                'company_name': 'Central Natural Resources Management',
                'sector_type': 'Public',
                'interest_tax_status': 'Exempted',
                'pan_no': '700345678',
                'bank_name': 'Nepal Bank Limited',
                'bank_account_no': '01001000055555',
            },
        ]

        companies = {}
        for blueprint in company_blueprints:
            company, _ = Company.objects.get_or_create(company_code=blueprint['company_code'])
            company.company_name = blueprint['company_name']
            company.sector_type = blueprint['sector_type']
            company.interest_tax_status = blueprint['interest_tax_status']
            company.pan_no = blueprint['pan_no']
            company.bank_name = blueprint['bank_name']
            company.bank_account_no = blueprint['bank_account_no']
            company.status = 'Active'
            company.save()
            companies[company.company_code] = company

        client_blueprints = [
            {'client_code': 'DP0001', 'full_name': 'Dipesh Pradhan', 'holder_type': 'Public', 'pan_or_citizenship': '303045601', 'bank_name': 'Rastriya Banijya Bank', 'bank_account_no': '01001000022334'},
            {'client_code': 'KS0002', 'full_name': 'Khadka Securities Pvt. Ltd', 'holder_type': 'Institution', 'pan_or_citizenship': '500209901', 'bank_name': 'Nabil Bank Limited', 'bank_account_no': '00405010022222'},
            {'client_code': 'SS0003', 'full_name': 'Saraswati Shrestha', 'holder_type': 'Promoter', 'pan_or_citizenship': '209988776', 'bank_name': 'Nepal Bank Limited', 'bank_account_no': '01001000055667'},
            {'client_code': 'NR0004', 'full_name': 'National Retirement Fund', 'holder_type': 'Institution', 'pan_or_citizenship': '700123654', 'bank_name': 'Nepal Rastra Bank', 'bank_account_no': '22010010000099'},
            {'client_code': 'MB0005', 'full_name': 'Mukti Bhandari', 'holder_type': 'Public', 'pan_or_citizenship': '105509933', 'bank_name': 'NIC Asia Bank', 'bank_account_no': '250101000456789'},
            {'client_code': 'LP0006', 'full_name': 'Lumbini Pension Trust', 'holder_type': 'Institution', 'pan_or_citizenship': '808080123', 'bank_name': 'Nepal Investment Bank', 'bank_account_no': '190101000334455'},
            {'client_code': 'SB0007', 'full_name': 'Samir Bista', 'holder_type': 'Public', 'pan_or_citizenship': '301010101', 'bank_name': 'Sunrise Bank Limited', 'bank_account_no': '03030300006789'},
            {'client_code': 'HF0008', 'full_name': 'Himalayan Foundation', 'holder_type': 'Institution', 'pan_or_citizenship': '888777666', 'bank_name': 'Prabhu Bank Limited', 'bank_account_no': '05050500004567'},
            {'client_code': 'BG0009', 'full_name': 'Bodhi Gurung', 'holder_type': 'Promoter', 'pan_or_citizenship': '207707707', 'bank_name': 'Standard Chartered Bank Nepal', 'bank_account_no': '06060600001234'},
        ]

        clients = {}
        for blueprint in client_blueprints:
            client, _ = Client.objects.get_or_create(client_code=blueprint['client_code'])
            client.full_name = blueprint['full_name']
            client.holder_type = blueprint['holder_type']
            client.pan_or_citizenship = blueprint['pan_or_citizenship']
            client.bank_name = blueprint['bank_name']
            client.bank_account_no = blueprint['bank_account_no']
            client.status = 'Active'
            client.save()
            clients[client.client_code] = client

        interest_blueprints = [
            {'instrument_ref': 'NABIL-DB-2081-01', 'company_code': 'NABIL', 'client_code': 'DP0001', 'gross': Decimal('125000.00'), 'tax': Decimal('18750.00'), 'due_days': 12, 'status': 'Pending'},
            {'instrument_ref': 'NTC-DB-2080-03', 'company_code': 'NTC', 'client_code': 'SS0003', 'gross': Decimal('150000.00'), 'tax': Decimal('22500.00'), 'due_days': -15, 'status': 'Paid', 'payment_date_offset': -12, 'payment_reference': 'NEPALPAY/NTC-INT-001'},
            {'instrument_ref': 'HIDCL-BOND-2080-02', 'company_code': 'HIDCL', 'client_code': 'KS0002', 'gross': Decimal('98000.00'), 'tax': Decimal('14700.00'), 'due_days': 25, 'status': 'Pending'},
            {'instrument_ref': 'NYADI-LOAN-2079-04', 'company_code': 'NYADI', 'client_code': 'LP0006', 'gross': Decimal('76000.00'), 'tax': Decimal('11400.00'), 'due_days': 5, 'status': 'Partial', 'payment_date_offset': -2, 'payment_reference': 'NYADI/TDS-2079'},
            {'instrument_ref': 'NRIC-TBILL-2081-05', 'company_code': 'NRIC', 'client_code': 'NR0004', 'gross': Decimal('88000.00'), 'tax': Decimal('0.00'), 'due_days': -3, 'status': 'Paid', 'payment_date_offset': -1, 'payment_reference': 'NRIC/NEPALPAY/2081'},
            {'instrument_ref': 'NTC-DB-2081-06', 'company_code': 'NTC', 'client_code': 'MB0005', 'gross': Decimal('54000.00'), 'tax': Decimal('8100.00'), 'due_days': 35, 'status': 'Pending'},
            {'instrument_ref': 'NABIL-DB-2080-07', 'company_code': 'NABIL', 'client_code': 'KS0002', 'gross': Decimal('132000.00'), 'tax': Decimal('19800.00'), 'due_days': -20, 'status': 'Partial', 'payment_date_offset': -5, 'payment_reference': 'SWIFT/NABIL/7701'},
            {'instrument_ref': 'HIDCL-BOND-2079-08', 'company_code': 'HIDCL', 'client_code': 'DP0001', 'gross': Decimal('64000.00'), 'tax': Decimal('9600.00'), 'due_days': -60, 'status': 'Paid', 'payment_date_offset': -55, 'payment_reference': 'HBL/CMS/7788'},
            {'instrument_ref': 'SBL-DB-2081-09', 'company_code': 'SBL', 'client_code': 'SB0007', 'gross': Decimal('88000.00'), 'tax': Decimal('13200.00'), 'due_days': 18, 'status': 'Pending'},
            {'instrument_ref': 'SBL-DB-2080-10', 'company_code': 'SBL', 'client_code': 'HF0008', 'gross': Decimal('102000.00'), 'tax': Decimal('15300.00'), 'due_days': -25, 'status': 'Paid', 'payment_date_offset': -22, 'payment_reference': 'SBL/NEPALPAY/2080'},
            {'instrument_ref': 'PRVU-DB-2080-11', 'company_code': 'PRVU', 'client_code': 'DP0001', 'gross': Decimal('165000.00'), 'tax': Decimal('24750.00'), 'due_days': 7, 'status': 'Pending'},
            {'instrument_ref': 'PRVU-DB-2080-12', 'company_code': 'PRVU', 'client_code': 'BG0009', 'gross': Decimal('73000.00'), 'tax': Decimal('10950.00'), 'due_days': -8, 'status': 'Partial', 'payment_date_offset': -4, 'payment_reference': 'PRVU/SWIFT/7782'},
            {'instrument_ref': 'UNL-CP-2081-13', 'company_code': 'UNL', 'client_code': 'HF0008', 'gross': Decimal('56000.00'), 'tax': Decimal('0.00'), 'due_days': 14, 'status': 'Pending'},
            {'instrument_ref': 'UNL-NCD-2080-14', 'company_code': 'UNL', 'client_code': 'SB0007', 'gross': Decimal('47000.00'), 'tax': Decimal('7050.00'), 'due_days': -40, 'status': 'Paid', 'payment_date_offset': -35, 'payment_reference': 'UNL/CMS/3344'},
            {'instrument_ref': 'NRCS-GRT-2081-15', 'company_code': 'NRCS', 'client_code': 'DP0001', 'gross': Decimal('45000.00'), 'tax': Decimal('0.00'), 'due_days': 10, 'status': 'Pending'},
            {'instrument_ref': 'NRCS-GRANT-2080-16', 'company_code': 'NRCS', 'client_code': 'KS0002', 'gross': Decimal('62000.00'), 'tax': Decimal('0.00'), 'due_days': -8, 'status': 'Paid', 'payment_date_offset': -5, 'payment_reference': 'NRCS/HUMANITARIAN/2080'},
            {'instrument_ref': 'NHPC-HEALTH-2081-17', 'company_code': 'NHPC', 'client_code': 'LP0006', 'gross': Decimal('75000.00'), 'tax': Decimal('0.00'), 'due_days': 20, 'status': 'Pending'},
            {'instrument_ref': 'NHPC-PUBLIC-2080-18', 'company_code': 'NHPC', 'client_code': 'MB0005', 'gross': Decimal('55000.00'), 'tax': Decimal('0.00'), 'due_days': -30, 'status': 'Paid', 'payment_date_offset': -25, 'payment_reference': 'NHPC/NATIONAL/2080'},
            {'instrument_ref': 'CNRM-ENV-2081-19', 'company_code': 'CNRM', 'client_code': 'SB0007', 'gross': Decimal('68000.00'), 'tax': Decimal('0.00'), 'due_days': 15, 'status': 'Pending'},
            {'instrument_ref': 'CNRM-RESOURCE-2080-20', 'company_code': 'CNRM', 'client_code': 'HF0008', 'gross': Decimal('52000.00'), 'tax': Decimal('0.00'), 'due_days': -12, 'status': 'Partial', 'payment_date_offset': -8, 'payment_reference': 'CNRM/CONSERVATION/2080'},
        ]

        interest_lookup = {}
        for blueprint in interest_blueprints:
            company = companies[blueprint['company_code']]
            client = clients[blueprint['client_code']]
            payment_offset = blueprint.get('payment_date_offset')
            interest, _ = InterestPayable.objects.update_or_create(
                company=company,
                client=client,
                instrument_ref=blueprint['instrument_ref'],
                defaults={
                    'gross_interest': blueprint['gross'],
                    'tax_amount': blueprint['tax'],
                    'net_payable': blueprint['gross'] - blueprint['tax'],
                    'payment_status': blueprint['status'],
                    'due_date': (now + datetime.timedelta(days=blueprint['due_days'])).date(),
                    'payment_date': (now + datetime.timedelta(days=payment_offset)).date() if payment_offset is not None else None,
                    'payment_reference': blueprint.get('payment_reference'),
                    'created_by': admin_user,
                },
            )
            interest_lookup[blueprint['instrument_ref']] = interest

        dividend_blueprints = [
            {'company_code': 'NTC', 'client_code': 'DP0001', 'shares': Decimal('1500'), 'gross': Decimal('450000.00'), 'tax': Decimal('67500.00'), 'fiscal_year': '2080/81', 'status': 'Paid', 'payment_date_offset': -30},
            {'company_code': 'NTC', 'client_code': 'SS0003', 'shares': Decimal('740'), 'gross': Decimal('222000.00'), 'tax': Decimal('33300.00'), 'fiscal_year': '2081/82', 'status': 'Pending'},
            {'company_code': 'NABIL', 'client_code': 'KS0002', 'shares': Decimal('920'), 'gross': Decimal('276000.00'), 'tax': Decimal('41400.00'), 'fiscal_year': '2080/81', 'status': 'Paid', 'payment_date_offset': -18},
            {'company_code': 'NRIC', 'client_code': 'NR0004', 'shares': Decimal('2000'), 'gross': Decimal('600000.00'), 'tax': Decimal('0.00'), 'fiscal_year': '2079/80', 'status': 'Paid', 'payment_date_offset': -90},
            {'company_code': 'HIDCL', 'client_code': 'LP0006', 'shares': Decimal('350'), 'gross': Decimal('105000.00'), 'tax': Decimal('15750.00'), 'fiscal_year': '2081/82', 'status': 'Pending'},
            {'company_code': 'NYADI', 'client_code': 'MB0005', 'shares': Decimal('420'), 'gross': Decimal('126000.00'), 'tax': Decimal('18900.00'), 'fiscal_year': '2081/82', 'status': 'Partial', 'payment_date_offset': -7},
            {'company_code': 'NABIL', 'client_code': 'DP0001', 'shares': Decimal('250'), 'gross': Decimal('75000.00'), 'tax': Decimal('11250.00'), 'fiscal_year': '2081/82', 'status': 'Pending'},
            {'company_code': 'SBL', 'client_code': 'SB0007', 'shares': Decimal('300'), 'gross': Decimal('90000.00'), 'tax': Decimal('13500.00'), 'fiscal_year': '2080/81', 'status': 'Paid', 'payment_date_offset': -20},
            {'company_code': 'SBL', 'client_code': 'HF0008', 'shares': Decimal('450'), 'gross': Decimal('135000.00'), 'tax': Decimal('20250.00'), 'fiscal_year': '2081/82', 'status': 'Pending'},
            {'company_code': 'PRVU', 'client_code': 'BG0009', 'shares': Decimal('520'), 'gross': Decimal('156000.00'), 'tax': Decimal('23400.00'), 'fiscal_year': '2081/82', 'status': 'Pending'},
            {'company_code': 'UNL', 'client_code': 'SB0007', 'shares': Decimal('610'), 'gross': Decimal('305000.00'), 'tax': Decimal('45750.00'), 'fiscal_year': '2080/81', 'status': 'Paid', 'payment_date_offset': -45},
            {'company_code': 'UNL', 'client_code': 'HF0008', 'shares': Decimal('250'), 'gross': Decimal('125000.00'), 'tax': Decimal('18750.00'), 'fiscal_year': '2079/80', 'status': 'Paid', 'payment_date_offset': -60},
        ]

        def dividend_key(company_code, client_code, fiscal_year):
            return f"{company_code}:{client_code}:{fiscal_year}"

        dividend_lookup = {}
        for blueprint in dividend_blueprints:
            company = companies[blueprint['company_code']]
            client = clients[blueprint['client_code']]
            payment_offset = blueprint.get('payment_date_offset')
            dividend, _ = DividendPayable.objects.update_or_create(
                company=company,
                client=client,
                fiscal_year=blueprint['fiscal_year'],
                defaults={
                    'shares_held': blueprint['shares'],
                    'gross_dividend': blueprint['gross'],
                    'tax_amount': blueprint['tax'],
                    'net_payable': blueprint['gross'] - blueprint['tax'],
                    'payment_status': blueprint['status'],
                    'payment_date': (now + datetime.timedelta(days=payment_offset)).date() if payment_offset is not None else None,
                    'payment_reference': None,
                    'created_by': admin_user,
                },
            )
            dividend_lookup[dividend_key(blueprint['company_code'], blueprint['client_code'], blueprint['fiscal_year'])] = dividend

        bank_statements_blueprints = [
            {
                'bank_name': 'Nepal Bank Limited',
                'account_no': '01001000012345',
                'file_name': 'sample_nepal_bank.csv',
                'statement_from_days': -30,
                'statement_to_days': 0,
                'transactions': [
                    {
                        'reference_no': 'NB-INT-001',
                        'txn_days': -4,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('106250.00'),
                        'balance': Decimal('2106250.00'),
                        'description': 'Interest payout for NABIL-DB-2081-01',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'NABIL-DB-2081-01',
                            'amount': Decimal('106250.00'),
                            'status': 'Matched',
                            'notes': 'Matched interest for Dipesh Pradhan',
                        },
                    },
                    {
                        'reference_no': 'NB-DIV-001',
                        'txn_days': -3,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('382500.00'),
                        'balance': Decimal('2488750.00'),
                        'description': 'Dividend payout NTC 2080/81',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NTC',
                            'client_code': 'DP0001',
                            'fiscal_year': '2080/81',
                            'amount': Decimal('382500.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'NB-INT-002',
                        'txn_days': -2,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('50000.00'),
                        'balance': Decimal('2538750.00'),
                        'description': 'Part payment Nyadi debenture',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'NYADI-LOAN-2079-04',
                            'amount': Decimal('50000.00'),
                            'status': 'Partial',
                            'notes': 'First installment received',
                        },
                    },
                    {
                        'reference_no': 'NB-DIV-002',
                        'txn_days': -1,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('90000.00'),
                        'balance': Decimal('2628750.00'),
                        'description': 'Dividend mismatch for NYADI',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NYADI',
                            'client_code': 'MB0005',
                            'fiscal_year': '2081/82',
                            'amount': Decimal('90000.00'),
                            'status': 'Exception',
                            'notes': 'Credit less than expected net',
                        },
                    },
                    {
                        'reference_no': 'NB-CHG-001',
                        'txn_days': 0,
                        'debit': Decimal('1500.00'),
                        'credit': Decimal('0.00'),
                        'balance': Decimal('2627250.00'),
                        'description': 'Bank charges for RTS account',
                    },
                ],
            },
            {
                'bank_name': 'Nabil Bank Limited',
                'account_no': '00405010010001',
                'file_name': 'sample_nabil_bank.csv',
                'statement_from_days': -25,
                'statement_to_days': -1,
                'transactions': [
                    {
                        'reference_no': 'NABIL-INT-001',
                        'txn_days': -10,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('127500.00'),
                        'balance': Decimal('1800000.00'),
                        'description': 'Interest settlement for NTC-DB-2080-03',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'NTC-DB-2080-03',
                            'amount': Decimal('127500.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'NABIL-DIV-001',
                        'txn_days': -9,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('234600.00'),
                        'balance': Decimal('2034600.00'),
                        'description': 'Dividend disbursement for KS0002',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NABIL',
                            'client_code': 'KS0002',
                            'fiscal_year': '2080/81',
                            'amount': Decimal('234600.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'NABIL-INT-002',
                        'txn_days': -8,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('70000.00'),
                        'balance': Decimal('2104600.00'),
                        'description': 'Partial payment for NABIL-DB-2080-07',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'NABIL-DB-2080-07',
                            'amount': Decimal('70000.00'),
                            'status': 'Partial',
                            'notes': 'Awaiting second tranche',
                        },
                    },
                    {
                        'reference_no': 'NABIL-DIV-002',
                        'txn_days': -7,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('63750.00'),
                        'balance': Decimal('2168350.00'),
                        'description': 'Dividend for Dipesh Pradhan (NABIL)',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NABIL',
                            'client_code': 'DP0001',
                            'fiscal_year': '2081/82',
                            'amount': Decimal('63750.00'),
                            'status': 'Matched',
                        },
                    },
                ],
            },
            {
                'bank_name': 'Nepal Rastra Bank',
                'account_no': '22010010000011',
                'file_name': 'sample_nrb.csv',
                'statement_from_days': -40,
                'statement_to_days': -5,
                'transactions': [
                    {
                        'reference_no': 'NRB-INT-001',
                        'txn_days': -12,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('54400.00'),
                        'balance': Decimal('5023000.00'),
                        'description': 'Interest payout for HIDCL-BOND-2079-08',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'HIDCL-BOND-2079-08',
                            'amount': Decimal('54400.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'NRB-INT-002',
                        'txn_days': -11,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('88000.00'),
                        'balance': Decimal('5111000.00'),
                        'description': 'T-Bill interest for NRIC',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'NRIC-TBILL-2081-05',
                            'amount': Decimal('88000.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'NRB-DIV-001',
                        'txn_days': -10,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('600000.00'),
                        'balance': Decimal('5711000.00'),
                        'description': 'Dividend settlement for NRIC',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NRIC',
                            'client_code': 'NR0004',
                            'fiscal_year': '2079/80',
                            'amount': Decimal('600000.00'),
                            'status': 'Matched',
                        },
                    },
                ],
            },
            {
                'bank_name': 'Sunrise Bank Limited',
                'account_no': '03030300004567',
                'file_name': 'sample_sunrise_bank.csv',
                'statement_from_days': -20,
                'statement_to_days': 5,
                'transactions': [
                    {
                        'reference_no': 'SBL-INT-001',
                        'txn_days': -6,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('86700.00'),
                        'balance': Decimal('1765000.00'),
                        'description': 'Interest payout for SBL-DB-2080-10',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'SBL-DB-2080-10',
                            'amount': Decimal('86700.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'SBL-DIV-001',
                        'txn_days': -4,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('76500.00'),
                        'balance': Decimal('1841500.00'),
                        'description': 'Dividend payout SBL FY2080/81',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'SBL',
                            'client_code': 'SB0007',
                            'fiscal_year': '2080/81',
                            'amount': Decimal('76500.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'SBL-DIV-002',
                        'txn_days': -1,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('100000.00'),
                        'balance': Decimal('1941500.00'),
                        'description': 'Partial dividend for Himalayan Foundation',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'SBL',
                            'client_code': 'HF0008',
                            'fiscal_year': '2081/82',
                            'amount': Decimal('100000.00'),
                            'status': 'Partial',
                            'notes': 'Awaiting balance credit',
                        },
                    },
                    {
                        'reference_no': 'SBL-CHG-001',
                        'txn_days': 2,
                        'debit': Decimal('2500.00'),
                        'credit': Decimal('0.00'),
                        'balance': Decimal('1939000.00'),
                        'description': 'RTGS service charge',
                    },
                ],
            },
            {
                'bank_name': 'Prabhu Bank Limited',
                'account_no': '05050500007890',
                'file_name': 'sample_prabhu_bank.csv',
                'statement_from_days': -18,
                'statement_to_days': 3,
                'transactions': [
                    {
                        'reference_no': 'PRVU-INT-001',
                        'txn_days': -5,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('62050.00'),
                        'balance': Decimal('1320000.00'),
                        'description': 'Partial payout for PRVU-DB-2080-12',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'PRVU-DB-2080-12',
                            'amount': Decimal('62050.00'),
                            'status': 'Partial',
                            'notes': '50% settlement posted',
                        },
                    },
                    {
                        'reference_no': 'PRVU-INT-002',
                        'txn_days': -2,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('140250.00'),
                        'balance': Decimal('1460250.00'),
                        'description': 'Interest payout for PRVU-DB-2080-11',
                        'match': {
                            'type': 'Interest',
                            'instrument_ref': 'PRVU-DB-2080-11',
                            'amount': Decimal('140250.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'PRVU-DIV-001',
                        'txn_days': -1,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('132600.00'),
                        'balance': Decimal('1592850.00'),
                        'description': 'Dividend to Bodhi Gurung',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'PRVU',
                            'client_code': 'BG0009',
                            'fiscal_year': '2081/82',
                            'amount': Decimal('132600.00'),
                            'status': 'Matched',
                        },
                    },
                    {
                        'reference_no': 'PRVU-DIV-002',
                        'txn_days': 0,
                        'debit': Decimal('0.00'),
                        'credit': Decimal('52500.00'),
                        'balance': Decimal('1645350.00'),
                        'description': 'Dividend installment for Dipesh Pradhan',
                        'match': {
                            'type': 'Dividend',
                            'company_code': 'NABIL',
                            'client_code': 'DP0001',
                            'fiscal_year': '2081/82',
                            'amount': Decimal('52500.00'),
                            'status': 'Partial',
                        },
                    },
                ],
            },
        ]

        for blueprint in bank_statements_blueprints:
            statement_from = (now + datetime.timedelta(days=blueprint['statement_from_days'])).date()
            statement_to = (now + datetime.timedelta(days=blueprint['statement_to_days'])).date()
            bank_stmt, _ = BankStatement.objects.get_or_create(
                account_no=blueprint['account_no'],
                statement_from=statement_from,
                statement_to=statement_to,
                defaults={'uploaded_by': admin_user},
            )
            bank_stmt.bank_name = blueprint['bank_name']
            bank_stmt.file_name = blueprint['file_name']
            bank_stmt.uploaded_by = admin_user
            bank_stmt.save()

            total_debit = Decimal('0.00')
            total_credit = Decimal('0.00')

            for txn_blueprint in blueprint['transactions']:
                txn_date = (now + datetime.timedelta(days=txn_blueprint['txn_days'])).date()
                transaction, _ = BankTransaction.objects.get_or_create(
                    bank_stmt=bank_stmt,
                    reference_no=txn_blueprint['reference_no'],
                    defaults={'txn_date': txn_date},
                )
                transaction.txn_date = txn_date
                transaction.debit = txn_blueprint.get('debit', Decimal('0.00'))
                transaction.credit = txn_blueprint.get('credit', Decimal('0.00'))
                transaction.balance = txn_blueprint.get('balance')
                transaction.description = txn_blueprint.get('description')
                transaction.save()

                total_debit += Decimal(transaction.debit or 0)
                total_credit += Decimal(transaction.credit or 0)

                match = txn_blueprint.get('match')
                if match:
                    if match['type'] == 'Interest':
                        source = interest_lookup.get(match['instrument_ref'])
                        if not source:
                            continue
                        source_id = source.interest_id
                    else:
                        dividend = dividend_lookup.get(dividend_key(match['company_code'], match['client_code'], match['fiscal_year']))
                        if not dividend:
                            continue
                        source_id = dividend.dividend_id

                    Reconciliation.objects.update_or_create(
                        bank_txn=transaction,
                        source_type=match['type'],
                        defaults={
                            'source_id': source_id,
                            'matched_amount': match['amount'],
                            'recon_status': match.get('status', 'Matched'),
                            'notes': match.get('notes'),
                            'reconciled_by': accountant_user,
                        },
                    )

            bank_stmt.total_debit = total_debit
            bank_stmt.total_credit = total_credit
            bank_stmt.save()

        AuditLog.objects.update_or_create(
            action='Seed Companies',
            table_name='companies',
            record_id=0,
            defaults={'user': admin_user, 'new_value': {'count': len(company_blueprints), 'codes': list(companies.keys())}},
        )
        AuditLog.objects.update_or_create(
            action='Seed Clients',
            table_name='clients',
            record_id=0,
            defaults={'user': admin_user, 'new_value': {'count': len(client_blueprints)}},
        )
        AuditLog.objects.update_or_create(
            action='Seed Payables',
            table_name='payables',
            record_id=0,
            defaults={'user': admin_user, 'new_value': {'interest': len(interest_blueprints), 'dividend': len(dividend_blueprints)}},
        )
        AuditLog.objects.update_or_create(
            action='Seed Reconciliations',
            table_name='reconciliation',
            record_id=0,
            defaults={'user': admin_user, 'new_value': {'bank_statements': len(bank_statements_blueprints)}},
        )

        summary = {
            'companies': Company.objects.count(),
            'clients': Client.objects.count(),
            'interest': InterestPayable.objects.count(),
            'dividend': DividendPayable.objects.count(),
            'bank_statements': BankStatement.objects.count(),
            'bank_transactions': BankTransaction.objects.count(),
            'reconciliations': Reconciliation.objects.count(),
            'audit_logs': AuditLog.objects.count(),
        }

        self.stdout.write(self.style.SUCCESS('Nepal RTA/RTS sample data refreshed.'))
        self.stdout.write(f"  Active roles: {len(role_blueprints)}")
        self.stdout.write('  Sample users (username / password):')
        for blueprint in user_blueprints:
            self.stdout.write(f"    - {blueprint['username']} / {blueprint['password']}")
        self.stdout.write(f"  Companies provisioned: {summary['companies']}")
        self.stdout.write(f"  Clients provisioned: {summary['clients']}")
        self.stdout.write(f"  Interest payables: {summary['interest']}")
        self.stdout.write(f"  Dividend payables: {summary['dividend']}")
        self.stdout.write(
            f"  Bank statements: {summary['bank_statements']} (transactions: {summary['bank_transactions']})"
        )
        self.stdout.write(f"  Reconciliations: {summary['reconciliations']}")
        self.stdout.write(f"  Audit logs: {summary['audit_logs']}")
        self.stdout.write(self.style.SUCCESS('End-to-end test data setup complete.'))
