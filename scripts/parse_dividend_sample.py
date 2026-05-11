import csv
from pathlib import Path

# Resolve sample file relative to the repository root (one level up from scripts)
repo_root = Path(__file__).resolve().parents[1]
sample = repo_root / 'sample_data' / 'dividend_payables_sample.csv'
if not sample.exists():
    print('Sample file not found:', sample)
    raise SystemExit(1)

rows = []
with sample.open('r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for r in reader:
        rows.append(r)

print(f'Read {len(rows)} rows')

required_cols = ['company_code', 'shares_held', 'gross_dividend', 'tax_amount']
missing_cols = [c for c in required_cols if c not in (rows[0] if rows else {})]
if missing_cols:
    print('Missing required columns:', missing_cols)

created = 0
errors = []
summary = {'gross':0.0,'tax':0.0,'net':0.0,'tax_exempted':0}
for idx, row in enumerate(rows, start=2):
    try:
        company_code = str(row.get('company_code','')).strip()
        shares = float(row.get('shares_held') or 0)
        gross_raw = row.get('gross_dividend')
        try:
            gross = float(gross_raw or 0)
        except Exception:
            gross = 0.0
        tax_raw = row.get('tax_amount') or row.get('TAX')
        tax_exempt = False
        if isinstance(tax_raw, str) and 'EXEMPT' in tax_raw.upper():
            tax = 0.0
            tax_exempt = True
        else:
            try:
                tax = float(tax_raw or 0)
            except Exception:
                tax = 0.0
        net = gross - tax
        summary['gross'] += gross
        summary['tax'] += tax
        summary['net'] += net
        if tax_exempt:
            summary['tax_exempted'] += 1
        created += 1
        print(f'Row {idx}: company={company_code}, shares={shares}, gross={gross}, tax={tax}, net={net}, tax_exempted={tax_exempt}')
    except Exception as e:
        errors.append((idx, str(e)))

print('\nSummary:')
print('Created rows:', created)
print('Gross total:', summary['gross'])
print('Tax total:', summary['tax'])
print('Net total:', summary['net'])
print('Tax exempted count:', summary['tax_exempted'])
if errors:
    print('Errors:')
    for e in errors:
        print(e)
