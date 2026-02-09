# Reconciliation Report - Navigation Guide

## 📍 Where to Find the Reconciliation Report

### Main Navigation Path:
```
Dashboard → Reports → [Reconciliation Report Section]
```

### Step-by-Step:

1. **Login to the System**
   - URL: `http://localhost:3000` (Frontend)
   - Username: `admin` / Password: `admin123`

2. **Navigate to Reports**
   - Click on **"Reports"** in the main navigation bar (📊 icon)
   - OR use the menu: Dashboard → Reports

3. **You will see:**
   - **Section 1: Export Reports** (left side)
     - Standard report exports for Interest and Dividend payables
     - Date filters
   
   - **Section 2: Reconciliation Report** (right side) ⭐ **NEW**
     - Reconciliation report type selector (Interest/Dividend)
     - Fiscal Year filter (YYYY/YYYY+1 format, e.g., 2025/2026)
     - Date filters (From Date / To Date)
     - **Refresh** button to reload data
     - **Export Reco** button to download as Excel

4. **Full Report Table Below** (scrollable)
   - Column 1: # (row number)
   - Column 2: Particulars (instrument/dividend code)
   - Column 3: Company (company name)
   - Column 4: Client (client name)
   - Column 5: Financial Year (calculated fiscal year)
   - Column 6: Due/Payment Date
   - Column 7: **In Books (NPR)** - Amount from payables table
   - Column 8: **In RTS (NPR)** - Amount from reconciliation matches
   - Column 9: **Difference** - Books minus RTS (highlights discrepancies)
   - Column 10: Status (Pending/Paid/Partial)

---

## 🎯 What You Can Do

### View Reconciliation Data:
✅ See side-by-side comparison of Books vs RTS amounts  
✅ Identify discrepancies (Difference column)  
✅ Filter by date range  
✅ Filter by fiscal year (e.g., 2025/2026)  
✅ View company totals  
✅ See grand totals at bottom

### Export Reports:
✅ Click **"Export Reco"** button  
✅ Download reconciliation as Excel file  
✅ Excel includes all filters applied  
✅ Format: `interest_reconciliation_YYYYMMDD.xlsx`

### Switch Between Report Types:
✅ **Debenture Interest** - Shows interest payables reconciliation  
✅ **Stock Dividend** - Shows dividend payables reconciliation  
✅ Data updates automatically when you switch

---

## 📊 Sample Data Included

### Interest Payables: 20 records
- 7 companies (NTC, NABIL, NRIC, HIDCL, NYADI, SBL, PRVU, UNL)
- Mix of Pending, Paid, and Partial status
- Dates across 2025/2026 fiscal year

### Dividend Payables: 17 records
- Various fiscal years (2024/2025 through 2081/82)
- Different holder types (Public, Institution, Promoter)
- Mix of payment statuses

### Reconciliations: 24 records
- 17 matched interest items
- Dividend matches with various statuses
- Some with partial or exception status (showing discrepancies)

---

## 💡 Example Scenarios

### Scenario 1: Find Pending Interest with Discrepancies
1. Go to Reports
2. Select **Debenture Interest** in Reconciliation section
3. Look for rows where:
   - Status = "Pending"
   - Difference > 0 (Books exceeds RTS)
4. These indicate items in books but not yet matched in bank

### Scenario 2: Export Q1 FY 2025/26 Reconciliation
1. Go to Reports
2. Select **Debenture Interest**
3. Enter Fiscal Year: `2025/2026`
4. Click **Refresh**
5. Click **Export Reco** to get Excel

### Scenario 3: Check Dividend Paid vs RTS
1. Go to Reports
2. Switch to **Stock Dividend**
3. Set Payment Status filter if available
4. Review "In Books" vs "In RTS" for paid items
5. Identify any mismatches

---

## 🔧 Behind the Scenes

### APIs Used:
- `GET /api/reports/reco/interest/` - Fetch interest reconciliation data
- `GET /api/reports/reco/dividend/` - Fetch dividend reconciliation data
- `GET /api/reports/reco/interest/export/` - Download interest Excel
- `GET /api/reports/reco/dividend/export/` - Download dividend Excel

### Fiscal Year Logic:
```
Nepal's Fiscal Year: July 1 - June 30

Examples:
  Due Date: 2026-07-15 → Fiscal Year: 2026/2027
  Due Date: 2026-03-10 → Fiscal Year: 2025/2026
  Due Date: 2025-12-25 → Fiscal Year: 2025/2026
```

### Data Sources:
- **Books Amount**: `InterestPayable.net_payable` / `DividendPayable.net_payable`
- **RTS Amount**: Sum of `Reconciliation.matched_amount` for each payable
- **Difference**: Books - RTS
- **Status**: `InterestPayable.payment_status` / `DividendPayable.payment_status`

---

## 🔍 Testing the Feature

### Quick Test:
1. Login as admin (admin123)
2. Click **Reports** in navigation
3. Scroll down to **Reconciliation Report** section
4. You should see:
   - Interest/Dividend toggle
   - Fiscal Year input field
   - Refresh button
   - Export Reco button
5. Click **Refresh** → table populates with 20 interest rows
6. Switch to **Stock Dividend** → table updates with 17 dividend rows

### Verify Fiscal Year:
1. In the table, check **Financial Year** column
2. All dates showing should match the fiscal year rules
3. E.g., "February 2026" dates show "2025/2026"
4. E.g., "July 2026" dates would show "2026/2027"

---

## 📈 Understanding the Report

### "In Books" = Payables Outstanding
This is money the company owes according to their books/records.  
Source: `InterestPayable` or `DividendPayable` table  
Represents: Accrued interest/dividends yet to be paid

### "In RTS" = Bank Matched Amount
This is money that has been matched to actual bank transactions.  
Source: `Reconciliation.matched_amount`  
Represents: Cash actually received/settled

### "Difference" = Unmatched Amount
- Positive = Money in books not yet matched to RTS
- Zero = Perfect match (fully reconciled)
- Negative = RTS exceeds books (unusual, indicates over-payment or duplicate)

---

## 🚀 New Features in This Release

✨ **Reconciliation Report** - Side-by-side Books vs RTS view  
✨ **Fiscal Year Support** - Filter by Nepal FY (July-June)  
✨ **Excel Export** - Download reconciliations with all filters  
✨ **Company Subtotals** - See totals grouped by company  
✨ **Difference Tracking** - Quickly spot unmatched items  

---

## 📞 Support

If the reconciliation report doesn't appear:
1. Check that backend built successfully: `docker compose logs backend | grep "error"`
2. Verify data was seeded: `docker compose exec backend python manage.py create_test_data`
3. Clear browser cache (Ctrl+Shift+Delete in Chrome)
4. Refresh the page (Ctrl+F5)
5. Check that API endpoints are responding: `curl http://localhost:8000/api/reports/reco/interest/`

---

**Last Updated:** February 3, 2026  
**System Status:** ✅ Ready to Use
