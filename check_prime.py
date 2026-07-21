#!/usr/bin/env python
import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()
from apps.payables.models import DebentureReconciliation
from django.db.models import Sum, Count

qs = DebentureReconciliation.objects.filter(company_code='PRIME')
print(f"PRIME records in DB: {qs.count()}")

stats = qs.aggregate(
    total_applicants=Count('id'),
    total_amount=Sum('amount'),
    total_gross=Sum('period_interest'),
    total_tax=Sum('tax'),
    total_net=Sum('roundup'),
)
for k, v in stats.items():
    val = v or 0
    print(f"  {k}: {float(val):,.2f}")

# Check distinct banks
banks = qs.values('bank_name').distinct().count()
print(f"  Distinct banks: {banks}")

# Check that this company appears in companies API
all_companies = DebentureReconciliation.objects.values('company_code', 'company_name').annotate(total=Count('id')).order_by('company_code')
print(f"\nAll companies in DB:")
for c in all_companies:
    print(f"  {c['company_code']}: {c['company_name']} ({c['total']} records)")