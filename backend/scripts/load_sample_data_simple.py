#!/usr/bin/env python
"""Load sample data into the RTA/RTS database."""

import os
import sys
import django

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from datetime import datetime, timedelta

def load_sample_data():
    """Load sample data using raw SQL."""
    
    with connection.cursor() as cursor:
        # Clear existing data
        print("Clearing existing data...")
        cursor.execute("DELETE FROM interest_payables;")
        cursor.execute("DELETE FROM dividend_payables;")
        cursor.execute("DELETE FROM clients;")
        cursor.execute("DELETE FROM companies;")
        
        # Create companies
        print("Creating sample companies...")
        companies_data = [
            ("Nepal Bank Limited", "NBL", "Kathmandu", "info@nbl.com.np"),
            ("Rastriya Banijya Bank", "RBB", "Kathmandu", "info@rbb.gov.np"),
            ("NIC Asia Bank", "NICASIA", "Kathmandu", "info@nicasiabank.com"),
            ("Everest Bank Limited", "EBL", "Kathmandu", "info@ebl.com.np"),
        ]
        
        for name, code, location, email in companies_data:
            cursor.execute(
                """INSERT INTO companies (name, company_code, location, email, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (name, code, location, email, datetime.now(), datetime.now())
            )
        
        # Get company IDs
        cursor.execute("SELECT id FROM companies ORDER BY created_at;")
        company_ids = [row[0] for row in cursor.fetchall()]
        print(f"Created {len(company_ids)} companies")
        
        # Create clients
        print("Creating sample clients...")
        clients_data = [
            ("Client A", "123001", company_ids[0]),
            ("Client B", "123002", company_ids[1]),
            ("Client C", "123003", company_ids[0]),
            ("Client D", "123004", company_ids[2]),
            ("Client E", "123005", company_ids[3]),
        ]
        
        for name, boid, company_id in clients_data:
            cursor.execute(
                """INSERT INTO clients (name, boid_number, company_id, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s)""",
                (name, boid, company_id, datetime.now(), datetime.now())
            )
        
        # Get client IDs
        cursor.execute("SELECT id FROM clients ORDER BY created_at;")
        client_ids = [row[0] for row in cursor.fetchall()]
        print(f"Created {len(client_ids)} clients")
        
        # Create interest payables
        print("Creating sample interest payables...")
        interest_data = [
            (client_ids[0], 500000, 50000, "Paid", "Interest on deposit", "REGULAR"),
            (client_ids[1], 350000, 35000, "Pending", "Annual interest", "REGULAR"),
            (client_ids[2], 450000, 45000, "Partial", "Interest payment", "REGULAR"),
            (client_ids[3], 400000, 40000, "Paid", "Quarterly interest", "REGULAR"),
            (client_ids[4], 265000, 26500, "Pending", "Interest accrual", "REGULAR"),
        ]
        
        for client_id, gross, tax_amount, status, description, payable_type in interest_data:
            net = gross - tax_amount
            cursor.execute(
                """INSERT INTO interest_payables 
                   (client_id, gross_amount, tax_amount, net_amount, status, description, payable_type, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (client_id, gross, tax_amount, net, status, description, payable_type, datetime.now(), datetime.now())
            )
        
        # Create dividend payables
        print("Creating sample dividend payables...")
        dividend_data = [
            (client_ids[0], 150000, 15000, "Paid", "Dividend Q1 2026"),
            (client_ids[1], 100000, 10000, "Pending", "Dividend Q2 2026"),
            (client_ids[2], 80000, 8000, "Paid", "Annual dividend"),
            (client_ids[3], 70500, 7050, "Pending", "Dividend distribution"),
        ]
        
        for client_id, gross, tax_amount, status, description in dividend_data:
            net = gross - tax_amount
            cursor.execute(
                """INSERT INTO dividend_payables 
                   (client_id, gross_amount, tax_amount, net_amount, status, description, created_at, updated_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (client_id, gross, tax_amount, net, status, description, datetime.now(), datetime.now())
            )
        
        connection.commit()
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM companies;")
        company_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM clients;")
        client_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM interest_payables;")
        interest_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM dividend_payables;")
        dividend_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(net_amount) FROM interest_payables;")
        interest_total = cursor.fetchone()[0] or 0
        cursor.execute("SELECT SUM(net_amount) FROM dividend_payables;")
        dividend_total = cursor.fetchone()[0] or 0
        
        print("\n✅ Sample data loaded successfully!")
        print(f"Companies: {company_count}")
        print(f"Clients: {client_count}")
        print(f"Interest Payables: {interest_count} (Total: Rs. {interest_total:,.0f})")
        print(f"Dividend Payables: {dividend_count} (Total: Rs. {dividend_total:,.0f})")

if __name__ == '__main__':
    load_sample_data()
