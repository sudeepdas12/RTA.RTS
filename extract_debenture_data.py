import json
import sys

# Since we can't rely on openpyxl being available, let's check
try:
    import openpyxl
    print(f"openpyxl version: {openpyxl.__version__}")
    
    # Load the workbook
    wb = openpyxl.load_workbook(r"C:\Users\Administrator\OneDrive\Desktop\7% RBB Debenture 2088-Reconciliation.xlsx", data_only=True)
    print(f"Sheets: {wb.sheetnames}")
    
    records = []
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        print(f"\n--- Sheet: {sheet_name} ---")
        print(f"Rows: {ws.max_row}, Cols: {ws.max_column}")
        
        # Find header row
        header_row = None
        data_start_row = None
        for row_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=10, values_only=True), 1):
            if row and row[0] == 'S.N':
                header_row = row_idx
                data_start_row = row_idx + 1
                print(f"\nHeaders found at row {header_row}: {row}")
                break
        
        if not header_row or not data_start_row:
            continue
        
        headers = list(ws.iter_rows(min_row=header_row, max_row=header_row, values_only=True))[0]
        
        # Determine column mapping based on sheet
        # PUBLIC sheet has full columns, Private Company has different structure
        if sheet_name == 'PUBLIC':
            col_map = {
                'sn': 0, 'boid': 1, 'applicant_name': 2, 'father_mother_name': 3,
                'grandfather_spouse_name': 4, 'citizenship_number': 5, 'issued_from': 6,
                'alloted_quantity': 7, 'amount': 8, 'annual_interest': 9, 'daily_interest': 10,
                'period_interest': 11, 'tax': 12, 'net_interest_payable': 13,
                'bank_code': 15, 'bank_name': 16, 'account_number': 17,
                'lot': 19, 'status': 20, 'approved_date': 21, 'remarks': 22, 'roundup': 23
            }
        elif sheet_name in ('Private Company', 'Tax Exempted Fund'):
            col_map = {
                'sn': 0, 'boid': 1, 'applicant_name': 2, 'father_mother_name': None,
                'grandfather_spouse_name': None, 'citizenship_number': None, 'issued_from': None,
                'alloted_quantity': 3, 'amount': 4, 'annual_interest': 5, 'daily_interest': 6,
                'period_interest': 7, 'tax': 8, 'net_interest_payable': 9,
                'bank_code': 11, 'bank_name': 12, 'account_number': 13,
                'lot': None, 'status': 15, 'approved_date': 16, 'remarks': 18, 'roundup': None
            }
        elif sheet_name == 'Summary':
            # Summary sheet might have totals - skip or handle separately
            print("Skipping Summary sheet")
            continue
        else:
            print(f"Unknown sheet: {sheet_name}, skipping")
            continue
        
        for row_idx, row in enumerate(ws.iter_rows(min_row=data_start_row, max_row=ws.max_row, values_only=True), data_start_row):
            if all(v is None for v in row[:5]):
                continue
            
            try:
                sn_val = row[col_map['sn']]
                sn = int(sn_val) if sn_val is not None else None
            except (ValueError, TypeError):
                continue
            
            if sn is None:
                continue
            
            def get_str(idx):
                if idx is None: return ""
                v = row[idx] if idx < len(row) else None
                return str(v).strip() if v else ""
            
            def get_num(idx):
                if idx is None: return 0
                v = row[idx] if idx < len(row) else None
                return v if isinstance(v, (int, float)) else 0
            
            record = {
                "sn": sn,
                "boid": get_str(col_map['boid']),
                "applicant_name": get_str(col_map['applicant_name']),
                "father_mother_name": get_str(col_map['father_mother_name']),
                "grandfather_spouse_name": get_str(col_map['grandfather_spouse_name']),
                "citizenship_number": get_str(col_map['citizenship_number']),
                "issued_from": get_str(col_map['issued_from']),
                "alloted_quantity": get_num(col_map['alloted_quantity']),
                "amount": get_num(col_map['amount']),
                "annual_interest": get_num(col_map['annual_interest']),
                "daily_interest": get_num(col_map['daily_interest']),
                "period_interest": get_num(col_map['period_interest']),
                "tax": get_num(col_map['tax']),
                "net_interest_payable": get_num(col_map['net_interest_payable']),
                "bank_code": get_str(col_map['bank_code']),
                "bank_name": get_str(col_map['bank_name']),
                "account_number": get_str(col_map['account_number']),
                "lot": get_str(col_map['lot']),
                "status": get_str(col_map['status']),
                "approved_date": get_str(col_map['approved_date']),
                "remarks": get_str(col_map['remarks']),
                "roundup": get_num(col_map['roundup'])
            }
            records.append(record)
    
    print(f"\nTotal records extracted: {len(records)}")
    
    with open("frontend/public/debenture_data.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    
    print("JSON data saved to frontend/public/debenture_data.json")
    
    # Print summary
    banks = set(r["bank_name"] for r in records)
    lots = set(r["lot"] for r in records)
    statuses = set(r["status"] for r in records)
    print(f"\nBanks ({len(banks)}): {sorted(banks)}")
    print(f"Lots: {sorted(lots)}")
    print(f"Statuses: {sorted(statuses)}")
    
except ImportError:
    print("openpyxl not installed. Try pip install openpyxl")
    # Alternative: try pandas
    try:
        import pandas as pd
        print("pandas available, trying to read...")
    except ImportError:
        print("Neither openpyxl nor pandas available")