#!/bin/sh
# EOL: LF (normalized)
# enable execution trace and exit on errors to make startup failures visible in logs
set -ex

# Wait for DB (docker-compose ensures healthy db, but this is a safety net)
# Try connecting until it works (retry loop using python exit code)
for i in $(seq 1 60); do
  python - <<PY
import os, sys, traceback
try:
    import psycopg
    conn = psycopg.connect(host=os.environ.get('DB_HOST', 'db'),
                           user=os.environ.get('DB_USER', 'rta_user'),
                           password=os.environ.get('DB_PASSWORD', 'password'),
                           dbname=os.environ.get('DB_NAME', 'rta_rts_db'),
                           port=os.environ.get('DB_PORT', '5432'))
    conn.close()
    print('Database connection OK')
except Exception:
    traceback.print_exc()
    sys.exit(1)
sys.exit(0)
PY
  if [ $? -eq 0 ]; then
    echo "Database available"
    break
  fi
  echo "Waiting for database..."
  sleep 1
done

# verify final state
if [ $? -ne 0 ]; then
  echo 'Database did not become available in time'
  exit 1
fi

# Run migrations, ensure admin user, collectstatic, then run the CMD
# The DB is pre-seeded with schema.sql, so we only run migrate here.
# Do not run makemigrations in container startup; it can create conflicting
# migration files at runtime.

# Fake initial migrations for apps that already have tables in schema.sql
python manage.py migrate --fake users 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake users 0002_pending_user_changes --noinput 2>/dev/null || true
python manage.py migrate --fake companies 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake clients 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake clients 0002_add_boid_field --noinput 2>/dev/null || true
python manage.py migrate --fake clients 0003_add_company_field --noinput 2>/dev/null || true
python manage.py migrate --fake payables 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake payables 0002_add_public_sector_fields --noinput 2>/dev/null || true
python manage.py migrate --fake payables 0003_institution_fields --noinput 2>/dev/null || true
python manage.py migrate --fake payables 0004_tax_exempted --noinput 2>/dev/null || true
python manage.py migrate --fake payables 0005_advanced_models --noinput 2>/dev/null || true
python manage.py migrate --fake reconciliation 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake reports 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake audit 0001_initial --noinput 2>/dev/null || true
python manage.py migrate --fake settings 0001_initial --noinput 2>/dev/null || true

# Run remaining migrations (new apps and additions)
python manage.py migrate --noinput 2>/dev/null || true

python manage.py set_admin_password \
  --username "${ADMIN_USERNAME:-admin}" \
  --password "${ADMIN_PASSWORD:-admin123}" \
  --email "${ADMIN_EMAIL:-admin@rta.gov.np}" \
  --full-name "${ADMIN_FULL_NAME:-System Administrator}"
python manage.py collectstatic --noinput 2>/dev/null || true

# Load sample data if tables are empty
echo "Loading sample data..."
python - <<'PYTHON_SCRIPT'
import os
import sys
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

def load_sample_data():
    with connection.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM companies;")
        company_count = cursor.fetchone()[0]
        
        if company_count > 0:
            print("✓ Sample data already exists, skipping load")
            return
        
        print("📊 Loading sample data...")
        
        # Create companies with correct column names
        companies_data = [
            ("NBL", "Nepal Bank Limited", "Private", "Taxable", "123456", "ACC001", "Nepal Bank"),
            ("RBB", "Rastriya Banijya Bank", "Public", "Taxable", "123457", "ACC002", "RBB Bank"),
            ("NICASIA", "NIC Asia Bank", "Private", "Exempted", "123458", "ACC003", "NIC Bank"),
            ("EBL", "Everest Bank Limited", "Private", "Taxable", "123459", "ACC004", "Everest Bank"),
        ]
        
        for code, name, sector, tax_status, pan, acc, bank in companies_data:
            cursor.execute(
                """INSERT INTO companies (company_code, company_name, sector_type, interest_tax_status, pan_no, bank_account_no, bank_name, status, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (code, name, sector, tax_status, pan, acc, bank, "Active", datetime.now(), datetime.now())
            )
        
        # Get company IDs
        cursor.execute("SELECT company_id FROM companies ORDER BY created_at;")
        company_ids = [row[0] for row in cursor.fetchall()]
        print(f"  ✓ Created {len(company_ids)} companies")
        
        # Create clients
        clients_data = [
            ("C001", "Alpha Holdings", "Promoter", "123001"),
            ("C002", "Beta Corporation", "Institution", "123002"),
            ("C003", "Gamma Ltd", "Public", "123003"),
            ("C004", "Delta Enterprises", "Promoter", "123004"),
            ("C005", "Epsilon Group", "Institution", "123005"),
        ]
        
        for code, name, holder_type, boid in clients_data:
            cursor.execute(
                """INSERT INTO clients (client_code, full_name, holder_type, boid, status, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (code, name, holder_type, boid, "Active", datetime.now(), datetime.now())
            )
        
        cursor.execute("SELECT client_id FROM clients ORDER BY created_at;")
        client_ids = [row[0] for row in cursor.fetchall()]
        print(f"  ✓ Created {len(client_ids)} clients")
        
        # Create interest payables with correct column names
        due_date = datetime.now().date() + timedelta(days=30)
        interest_data = [
            (company_ids[0], client_ids[0], 500000, 50000, due_date, "Pending"),
            (company_ids[1], client_ids[1], 350000, 35000, due_date, "Paid"),
            (company_ids[0], client_ids[2], 450000, 45000, due_date, "Partial"),
            (company_ids[2], client_ids[3], 400000, 40000, due_date, "Pending"),
            (company_ids[3], client_ids[4], 265000, 26500, due_date, "Paid"),
        ]
        
        for company_id, client_id, gross, tax, due, status in interest_data:
            net = gross - tax
            cursor.execute(
                """INSERT INTO interest_payables (company_id, client_id, gross_interest, tax_amount, net_payable, due_date, payment_status, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (company_id, client_id, gross, tax, net, due, status, datetime.now(), datetime.now())
            )
        
        print(f"  ✓ Created {len(interest_data)} interest payables")
        
        # Create dividend payables - NOTE: no due_date, uses fiscal_year instead
        dividend_data = [
            (company_ids[0], client_ids[0], 1000, 150000, 15000, "Paid", "2025/26"),
            (company_ids[1], client_ids[1], 800, 100000, 10000, "Pending", "2025/26"),
            (company_ids[2], client_ids[2], 600, 80000, 8000, "Paid", "2025/26"),
            (company_ids[3], client_ids[3], 500, 70500, 7050, "Pending", "2025/26"),
        ]
        
        cursor.execute("""SELECT COUNT(*) FROM information_schema.tables WHERE table_name='dividend_payables';""")
        if cursor.fetchone()[0] > 0:
            for company_id, client_id, shares, gross, tax, status, fiscal_yr in dividend_data:
                net = gross - tax
                cursor.execute(
                    """INSERT INTO dividend_payables (company_id, client_id, shares_held, gross_dividend, tax_amount, net_payable, payment_status, fiscal_year, created_at, updated_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (company_id, client_id, shares, gross, tax, net, status, fiscal_yr, datetime.now(), datetime.now())
                )
            print(f"  ✓ Created {len(dividend_data)} dividend payables")
        
        connection.commit()
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM companies;")
        comp_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM clients;")
        client_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM interest_payables;")
        interest_cnt = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(net_payable) FROM interest_payables;")
        interest_total = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM dividend_payables;")
        dividend_cnt = cursor.fetchone()[0]
        cursor.execute("SELECT SUM(net_payable) FROM dividend_payables;")
        dividend_total = cursor.fetchone()[0] or 0
        
        total_payables = float(interest_total) + float(dividend_total)
        
        print(f"\n✅ Sample data loaded successfully!")
        print(f"   Companies: {comp_cnt} | Clients: {client_cnt}")
        print(f"   Interest Payables: {interest_cnt} (Rs. {float(interest_total):,.0f})")
        print(f"   Dividend Payables: {dividend_cnt} (Rs. {float(dividend_total):,.0f})")
        print(f"   Total Payables: Rs. {total_payables:,.0f}")

try:
    load_sample_data()
except Exception as e:
    print(f"⚠️  Sample data load error: {e}")
    import traceback
    traceback.print_exc()

PYTHON_SCRIPT

exec "$@"
