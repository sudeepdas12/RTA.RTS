# Sample Data Pack (Nepal RTA/RTS)

This folder contains curated CSV files that mirror the records provisioned by `python manage.py create_test_data`. Use them to bulk upload data from the **Data Center ➜ Uploads** page or to smoke-test the REST endpoints without re-running the management command.

## Available Files

| File | Purpose | Key Columns |
| --- | --- | --- |
| companies_sample.csv | Master company register for telecom, hydropower, banking issuers. | company_code, company_name, sector_type, interest_tax_status, pan_no, bank_name, bank_account_no |
| clients_sample.csv | Holder roster covering public, promoter, and institutional investors. | client_code, full_name, holder_type, pan_or_citizenship, bank_name, bank_account_no |
| fiscal_year_settings_sample.csv | Company-specific interest & tax rates per fiscal year for calculation. | Company Name, Fiscal Year, Interest Rate %, Tax Rate % |
| interest_payables_sample.csv | Debenture/loan interest accruals with varied statuses. | company_code, client_code, instrument_ref, gross_interest, tax_amount, due_date (optional payment_status) |
| dividend_payables_sample.csv | Stock dividend declarations across fiscal years 2080/81–2081/82. | company_code, client_code, shares_held, gross_dividend, tax_amount (optional fiscal_year, payment_status) |
| bank_statement_sample.csv | Nepal Bank transaction extract for reconciliation tests. | txn_date, reference_no, description, debit, credit, balance |

## How to Use

1. Run `docker compose up -d` (or start your virtualenv backend) and execute `python manage.py create_test_data` once to ensure reference companies/clients exist.
2. Log into the frontend (`admin / admin123`) and open **Data Center ➜ Uploads**.
3. Choose the relevant tab (Companies, Clients, Interest, Dividend, Reconciliation) and upload the matching CSV. Each file uses the same headers expected by the API upload endpoints.
4. Switch to Dashboard/Reports/Interest/Dividend/Reconciliation pages to confirm charts and tables show the new records.

### Tips

- All amounts are in Nepalese Rupees (NPR) and fiscal years follow the Nepali calendar notation (e.g., `2081/82`).
- The bank statement file can be posted to `/api/reconciliation/bank-statements/upload/` together with metadata (bank name, account, date range) to exercise the auto-match workflow.
- If you need a clean slate, rerun `python manage.py create_test_data` to repopulate the canonical sample data before uploading again.
