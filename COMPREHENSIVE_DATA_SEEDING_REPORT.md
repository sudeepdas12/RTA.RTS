# 📊 Comprehensive Sample Data Seeding - Complete

**Seeding Completed:** April 9, 2026 @ 06:57 UTC

## ✅ Data Seeding Summary

### Database Population Status

| Section | Count | Status |
|---------|-------|--------|
| 🏢 Companies | 8 | ✓ Seeded |
| 👥 Clients | 14 | ✓ Seeded |
| 💰 Interest Payables | 80 | ✓ Seeded |
| 📈 Dividend Payables | 48 | ✓ Seeded |
| **Total Records** | **150** | **✓ Ready** |

### Financial Summary

```
Total Interest Payable:  Rs. 36,686,475.83
Total Dividend Payable:  Rs. 31,985,005.33
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Payables:          Rs. 68,671,481.16
```

### Pending Items

```
Pending Interest Payables:   26 records
Pending Dividend Payables:   16 records
Total Pending:               42 records (~28% of payables)
```

## 📋 Data Breakdown

### Companies (`8 total`)

1. **NBL** - Nepal Bank Limited (Private, Taxable)
2. **RBB** - Rastriya Banijya Bank (Public, Taxable)
3. **NICASIA** - NIC Asia Bank Limited (Private, Exempted)
4. **EBL** - Everest Bank Limited (Private, Taxable)
5. **NABIL** - NABIL Bank (Private, Taxable)
6. **UBL** - United Bank Limited (Private, Taxable)
7. **BOKL** - Bank of Kathmandu (Private, Exempted)
8. **SCBL** - Standard Chartered Bank Nepal (Private, Taxable)

### Clients (`14 total`)

**Promoters (5):**
- Hari Kumar Singh (C001)
- Shyam Lal Gupta (C002)
- Rajesh Kumar Patel (C003)
- Sanjay Kumar Singh (C013)
- Anita Kumari (C014)

**Institutions (3):**
- Nepal Insurance Company Limited (C004)
- Kumari Bank Limited (C005)
- NIC Insurance Limited (C006)

**Public (6):**
- Ramesh Magar (C007)
- Priya Sharma (C008)
- Deepak Adhikari (C009)
- Kavya Yadav (C010)
- Amit Pandey (C011)
- Neha Sharma (C012)

### Interest Payables (`80 total`)

**Distribution:**
- Generated for: First 5 companies × 8 clients × 2 cycles = 80 records
- Includes: Realistic interest rates (5-12%), principal amounts, tax calculations
- Status Mix: Pending, Paid, Partial (3 cycle scenarios)
- Range: Rs. 100,000 - Rs. 1,000,000 gross interest per record

**Sample Fields:**
```
- Principal Amount: Rs. 1M - Rs. 10M
- Interest Rate: 5% - 12%
- Gross Interest: Rs. 100K - Rs. 1M
- Tax Amount: 0% - 15% (based on company tax status)
- Payment Status: Pending (26), Paid (27), Partial (27)
```

### Dividend Payables (`48 total`)

**Distribution:**
- Generated for: First 4 companies × 6 clients × 2 fiscal years = 48 records
- Includes: Share holdings, fiscal year designation, tax calculations
- Status Mix: Pending (16), Paid (16), Partial (16)
- Fiscal Years: 2023/24, 2024/25

**Sample Fields:**
```
- Shares Held: 100 - 5,000 shares
- Dividend Per Share: Rs. 10 - Rs. 500
- Gross Dividend: Rs. 1K - Rs. 2.5M
- Tax Amount: 0% - 15% (based on company tax status)
- Payment Status: Pending (16), Paid (16), Partial (16)
```

## 🔌 API Access

### Authentication

**Login Endpoint:**
```
POST http://localhost:8000/api/auth/login/
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Data Endpoints

Use the `access` token in Authorization header:
```
Authorization: Bearer <access_token>
```

#### Companies
```
GET http://localhost:8000/api/companies/
Returns: List of 8 companies with details
```

#### Clients
```
GET http://localhost:8000/api/clients/
Returns: List of 14 clients with holder_type and BOID
```

#### Interest Payables
```
GET http://localhost:8000/api/payables/interest/
Returns: List of 80 interest payable records with:
  - company, client references
  - gross_interest, tax_amount, net_payable
  - payment_status, due_date
  - principal_amount, interest_rate, tax_rate
```

#### Dividend Payables
```
GET http://localhost:8000/api/payables/dividend/
Returns: List of 48 dividend payable records with:
  - company, client references
  - shares_held, gross_dividend, tax_amount, net_payable
  - payment_status, fiscal_year
```

### PowerShell Example

```powershell
# Login
$loginData = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" `
  -Method Post -Body $loginData -ContentType "application/json"
$token = $response.access
$headers = @{ "Authorization" = "Bearer $token" }

# Get Companies
$companies = Invoke-RestMethod -Uri "http://localhost:8000/api/companies/" `
  -Headers $headers
$companies.results | Select-Object company_code, company_name

# Get Interest Payables
$interest = Invoke-RestMethod -Uri "http://localhost:8000/api/payables/interest/" `
  -Headers $headers
$interest.results | Select-Object -First 5 | ConvertTo-Json
```

## 🧪 Frontend Testing Checklist

- [ ] **Dashboard** - Verify charts populate with data
- [ ] **Companies** - View all 8 companies in list
- [ ] **Clients** - Filter by holder_type (Promoter, Institution, Public)
- [ ] **Interest Payables** - Sort by due_date, filter by payment_status
- [ ] **Dividend Payables** - Group by fiscal year, view summary by company
- [ ] **Reconciliation** - Create/match interest or dividend records
- [ ] **Reports** - Generate reports with populated data
- [ ] **Search** - Search for specific company codes or client names
- [ ] **Filtering** - Test date range filters, status filters

## 🔧 Database Details

### Schema Updates Applied

The `interest_payables` table includes these fields:
```sql
- instrument_ref VARCHAR(100)
- allotted_quantity INT
- principal_amount NUMERIC(15,2)
- interest_rate NUMERIC(5,2)
- interest_per_day NUMERIC(10,4)
- interest_pumori NUMERIC(15,2)
- tax_rate NUMERIC(5,2)
- tax_exempted BOOLEAN
- bank_code VARCHAR(20)
- bank_name VARCHAR(100)
- account_number VARCHAR(50)
- lot VARCHAR(50)
- approved_date DATE
- remarks TEXT
- [plus standard payable fields]
```

### Docker Containers

```
Frontend:  http://localhost:3000
Backend:   http://localhost:8000
Database:  localhost:5432 (rtarts-db-1)
```

## 📊 Seeding Script Details

**Location:** `/backend/scripts/seed_comprehensive_data.py`

**Features:**
- Clears existing data safely (with transaction rollback support)
- Creates 8 realistic companies with bank details
- Generates 14 clients with mixed holder types and BOIDs
- Creates 80 interest payables with varied payment statuses
- Creates 48 dividend payables with fiscal year designation
- Validates all foreign key relationships
- Provides summary statistics

**Execution:**
```bash
docker exec rtarts-backend-1 python scripts/seed_comprehensive_data.py
```

## 🎯 Key Achievements

✅ **Schema Alignment** - Updated interest_payables table to match Django model  
✅ **Complete Population** - All major data tables populated with realistic data  
✅ **Tax Handling** - Correctly applies tax rates based on company exemption status  
✅ **Payment Status Mix** - Distributed between Pending, Paid, and Partial states  
✅ **Data Validation** - All foreign key relationships verified  
✅ **API Verified** - All endpoints tested and returning data  
✅ **Frontend Ready** - All sections now have data for comprehensive testing  

## 📝 Notes

- All timestamps use current UTC time with auto_now fields
- Created by: System Administrator (admin user)
- Total database size: ~2-3 MB with all data
- No audit logs generated (will be created on user actions)
- Notifications table remains empty (will populate on document lifecycle events)

## 🔄 Next Steps

1. **Frontend Testing:** Verify all pages display data correctly
2. **User Actions:** Test create/update/delete operations
3. **Reconciliation:** Create reconciliation records matching payables
4. **Audit Logs:** Monitor audit trails for user actions
5. **Reports:** Generate financial reports with populated data

---

**Database Ready for Comprehensive Testing** ✅
