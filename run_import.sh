#!/bin/bash
cd /app
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()
from django.db import transaction
from django.db.models import Sum, Count
from datetime import date
import uuid

import openpyxl
wb = openpyxl.load_workbook('/app/prime_data.xlsx', data_only=True)
print('Sheets:', wb.sheetnames)
ws = wb['ORIGINAL']
print('Rows:', ws.max_row, 'Cols:', ws.max_column)
# Show headers row
for c in range(1, min(15, ws.max_column+1)):
    v = ws.cell(row=1, column=c).value
    print('  Col', c, ':', v)
# Show first 3 data rows  
for r in range(2, 5):
    vals = [ws.cell(row=r, column=c).value for c in range(1, min(15, ws.max_column+1))]
    print('  Row', r, ':', vals)
"