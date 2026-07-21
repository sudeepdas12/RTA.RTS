import json, os, sys
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
import django
django.setup()

from django.db import transaction
from apps.payables.models import DebentureReconciliation
from django.utils import timezone
from datetime import datetime, date

# Load the JSON data
json_path = '/app/staticfiles/debenture_data.json'
if not os.path.exists(json_path):
    json_path = '/app/debenture_data.json'
if not os.path.exists(json_path):
    print(f"JSON not found at {json_path}")
    sys.exit(1)

with open(json_path, 'r', encoding='utf-8') as f:
    records = json.load(f)

print(f"Loaded {len(records)} records")

batch_size = 500
created = 0

with transaction.atomic():
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        objs = []
        for r in batch:
            objs.append(DebentureReconciliation(
                company_code=r.get('company_code', 'RBBL'),
                company_name=r.get('company_name', 'Rastriya Banijya Bank Ltd.'),
                report_title=r.get('report_title', 'Rastriya Banijya Bank Limited (7% RBBL Debenture 2088)'),
                report_subtitle=r.get('report_subtitle', 'Bank Wise Verified List'),
                sn=r.get('sn', 0),
                boid=str(r.get('boid', '')),
                applicant_name=str(r.get('applicant_name', '')),
                father_mother_name=str(r.get('father_mother_name', '')),
                grandfather_spouse_name=str(r.get('grandfather_spouse_name', '')),
                citizenship_number=str(r.get('citizenship_number', '')),
                issued_from=str(r.get('issued_from', '')),
                alloted_quantity=float(r.get('alloted_quantity', 0)),
                amount=float(r.get('amount', 0)),
                annual_interest=float(r.get('annual_interest', 0)),
                daily_interest=float(r.get('daily_interest', 0)),
                period_interest=float(r.get('period_interest', 0)),
                tax=float(r.get('tax', 0)),
                net_interest_payable=float(r.get('net_interest_payable', 0)),
                roundup=float(r.get('roundup', 0)),
                bank_code=str(r.get('bank_code', '')),
                bank_name=str(r.get('bank_name', '')),
                account_number=str(r.get('account_number', '')),
                lot=str(r.get('lot', '')),
                status=str(r.get('status', 'SUCCESS')),
                remarks=str(r.get('remarks', '')),
                period_from=None,
                period_to=None,
                period_days=74,
                interest_rate=7.00,
                tax_rate=6.00,
                upload_batch='init_seed',
            ))
        DebentureReconciliation.objects.bulk_create(objs, ignore_conflicts=True)
        created += len(objs)
        print(f"  Created {created}/{len(records)}...")

print(f"Total records seeded: {created}")
print(f"Total in DB: {DebentureReconciliation.objects.count()}")