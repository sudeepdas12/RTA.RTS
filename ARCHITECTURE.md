# RTA/RTS System - Technical Overview & Architecture

## System Overview

The RTA/RTS Debenture Interest & Stock Dividend Management System is a comprehensive web-based application designed to manage payables, reconcile bank transactions, and generate reports with full audit trails.

## Technology Stack

### Backend Stack
- **Framework**: Django 4.2 (Python)
- **API**: Django REST Framework 3.14
- **Database**: PostgreSQL 12+
- **Authentication**: JWT (Simple JWT)
- **File Processing**: openpyxl (Excel), csv (standard library)
- **Export**: xlsxwriter, reportlab, weasyprint

### Frontend Stack
- **Framework**: React 18
- **UI Library**: Bootstrap 5, React-Bootstrap
- **Routing**: React Router v6
- **State Management**: React Context API
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Notifications**: React Toastify

### Database
- **RDBMS**: PostgreSQL
- **Schema**: 10 main tables with proper indexing
- **Views**: 3 SQL views for reporting
- **Triggers**: Auto-update timestamps
- **Constraints**: Foreign keys, checks, unique constraints

## Architecture

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │◄────────┤   Django REST    │◄────────┤   PostgreSQL    │
│  (Port 3000)    │  HTTP   │   API Backend    │  ORM    │   Database      │
│                 │         │   (Port 8000)    │         │   (Port 5432)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

### Application Layers

#### 1. Presentation Layer (React)
- **Components**: Reusable UI components
- **Pages**: Route-specific page components
- **Context**: Global state management (Auth)
- **Services**: API integration layer

#### 2. API Layer (Django REST Framework)
- **ViewSets**: CRUD operations
- **Serializers**: Data validation & transformation
- **Permissions**: Role-based access control
- **Middleware**: Authentication, Audit logging

#### 3. Business Logic Layer (Django)
- **Models**: Database ORM models
- **Services**: Business logic (reconciliation, matching)
- **Utils**: Helper functions

#### 4. Data Layer (PostgreSQL)
- **Tables**: Normalized database schema
- **Views**: Aggregated data for reporting
- **Triggers**: Automatic timestamp updates
- **Functions**: Custom database functions

## Database Schema

### Master Tables
1. **companies** - Company master data
2. **clients** - Client/shareholder master data
3. **roles** - User role definitions
4. **users** - System users

### Transaction Tables
5. **interest_payables** - Interest payment records
6. **dividend_payables** - Dividend payment records

### Reconciliation Tables
7. **bank_statements** - Uploaded bank statements
8. **bank_transactions** - Individual transactions
9. **reconciliation** - Matching records

### Audit Table
10. **audit_logs** - Complete audit trail

### Relationships
```
companies ──┬─► interest_payables
            └─► dividend_payables

clients ──┬─► interest_payables
          └─► dividend_payables

users ──┬─► interest_payables (created_by)
        ├─► dividend_payables (created_by)
        ├─► bank_statements (uploaded_by)
        ├─► reconciliation (reconciled_by)
        └─► audit_logs

roles ──► users

bank_statements ──► bank_transactions ──► reconciliation
```

## API Architecture

### RESTful Endpoints

#### Resource Structure
```
/api/
├── auth/
│   ├── login/          POST
│   └── refresh/        POST
├── companies/
│   ├── /               GET, POST
│   ├── /{id}/          GET, PUT, DELETE
│   ├── upload/         POST
│   └── export_template/ GET
├── clients/
│   ├── /               GET, POST
│   ├── /{id}/          GET, PUT, DELETE
│   ├── upload/         POST
│   └── export_template/ GET
├── payables/
│   ├── interest/
│   │   ├── /           GET, POST
│   │   ├── /{id}/      GET, PUT, DELETE
│   │   ├── summary/    GET
│   │   └── upload/     POST
│   └── dividend/
│       ├── /           GET, POST
│       ├── /{id}/      GET, PUT, DELETE
│       ├── summary/    GET
│       └── upload/     POST
├── reconciliation/
│   ├── bank-statements/ GET, POST
│   ├── bank-transactions/ GET
│   ├── /               GET, POST
│   └── auto_match/     POST
├── reports/
│   ├── dashboard/      GET
│   ├── export/interest/ GET
│   └── export/dividend/ GET
├── audit/              GET
└── users/
    ├── /               GET, POST
    ├── /{id}/          GET, PUT, DELETE
    ├── profile/        GET
    └── change_password/ POST
```

### Authentication Flow

```
1. User Login
   ┌──────────────────────────────────────────┐
   │ POST /api/auth/login/                    │
   │ { username, password }                   │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ Backend validates credentials            │
   │ - Query user from database               │
   │ - Check password hash                    │
   │ - Check user status (Active)             │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ Generate JWT Tokens                      │
   │ - access_token (8 hours)                 │
   │ - refresh_token (7 days)                 │
   │ - Include user data & permissions        │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ Frontend stores tokens                   │
   │ - localStorage.setItem('access_token')   │
   │ - localStorage.setItem('user')           │
   │ - Redirect to /dashboard                 │
   └──────────────────────────────────────────┘

2. Subsequent API Requests
   ┌──────────────────────────────────────────┐
   │ Request with Authorization header        │
   │ Authorization: Bearer {access_token}     │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ JWT Middleware validates token           │
   │ - Decode token                           │
   │ - Check expiration                       │
   │ - Attach user to request                 │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ Permission Middleware checks access      │
   │ - Check user role                        │
   │ - Verify resource permission             │
   │ - Allow or deny request                  │
   └──────────────────────────────────────────┘

3. Token Refresh
   ┌──────────────────────────────────────────┐
   │ Access token expires (401 response)      │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ POST /api/auth/refresh/                  │
   │ { refresh: refresh_token }               │
   └──────────────────┬───────────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────────┐
   │ New access_token issued                  │
   │ Retry original request                   │
   └──────────────────────────────────────────┘
```

## Security Implementation

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Token Refresh**: Automatic token renewal
- **Password Hashing**: PBKDF2 with SHA256
- **Role-Based Access**: Granular permissions per resource

### Data Security
- **SQL Injection**: Prevented by ORM
- **XSS**: React auto-escaping
- **CSRF**: Django CSRF tokens
- **CORS**: Configured allowed origins

### Audit Trail
- **Automatic Logging**: Every create/update/delete
- **User Tracking**: Who did what when
- **IP Logging**: Track source IP
- **Change History**: Old and new values

## File Upload Processing

### Upload Flow

```
1. User selects file (Excel/CSV)
2. Frontend validates file type
3. FormData sent to API endpoint
4. Backend reads file with pandas
5. Validate columns and data types
6. Process row by row:
   - Validate required fields
   - Check foreign key references
   - Calculate derived fields
   - Create or update records
7. Return results:
   - Records created
   - Records updated
   - Errors (with row numbers)
```

### Supported Formats
- **Excel**: .xlsx, .xls
- **CSV**: .csv (UTF-8 encoded)

### Validation Rules
- Required field checks
- Data type validation
- Foreign key existence
- Business rule validation
- Duplicate detection

## Reconciliation Logic

### Auto-Match Algorithm

```python
FOR EACH bank_transaction IN bank_statement:
    
    # Skip if already reconciled
    IF transaction.is_reconciled:
        CONTINUE
    
    # Get transaction amount
    amount = transaction.credit OR transaction.debit
    
    # Try to match with interest payables
    interest_match = FIND interest_payable WHERE:
        - net_payable == amount
        - payment_status == 'Pending'
        - due_date within tolerance
    
    IF interest_match FOUND:
        CREATE reconciliation_record
        UPDATE interest_payable.payment_status = 'Paid'
        CONTINUE
    
    # Try to match with dividend payables
    dividend_match = FIND dividend_payable WHERE:
        - net_payable == amount
        - payment_status == 'Pending'
    
    IF dividend_match FOUND:
        CREATE reconciliation_record
        UPDATE dividend_payable.payment_status = 'Paid'
        CONTINUE
    
    # No match found - flag as exception
    CREATE reconciliation_record WITH status='Exception'
```

### Matching Criteria
1. **Exact Amount Match**: Primary matching criterion
2. **Payment Status**: Only match pending payables
3. **Date Tolerance**: Within reasonable date range
4. **Reference Number**: Optional additional validation

### Exception Handling
- Unmatched transactions flagged
- Manual reconciliation interface
- Partial matching support
- Notes and comments

## Reporting System

### Dashboard Data Aggregation

```sql
-- Interest Summary
SELECT 
    COUNT(*) as total_count,
    SUM(gross_interest) as total_gross,
    SUM(tax_amount) as total_tax,
    SUM(net_payable) as total_net,
    SUM(CASE WHEN payment_status = 'Paid' THEN net_payable ELSE 0 END) as paid,
    SUM(CASE WHEN payment_status = 'Pending' THEN net_payable ELSE 0 END) as pending
FROM interest_payables;

-- Company-wise breakdown
SELECT 
    company.company_name,
    SUM(payable.net_payable) as total
FROM interest_payables payable
JOIN companies company ON payable.company_id = company.company_id
GROUP BY company.company_name
ORDER BY total DESC
LIMIT 10;
```

### Export Formats

#### Excel Export
- **Library**: xlsxwriter
- **Features**: 
  - Formatted headers
  - Number formatting
  - Formulas for totals
  - Multiple sheets
  - Charts (optional)

#### PDF Export
- **Library**: reportlab / weasyprint
- **Features**:
  - A4 page format
  - Company branding
  - Page numbers
  - Summary sections

## Performance Optimization

### Database Optimization
- **Indexes**: On frequently queried columns
- **Foreign Keys**: Proper relationships
- **Query Optimization**: Select only needed fields
- **Connection Pooling**: Reuse database connections

### API Optimization
- **Pagination**: 50 records per page
- **Select Related**: Reduce N+1 queries
- **Caching**: Cache frequently accessed data
- **Compression**: GZIP compression enabled

### Frontend Optimization
- **Code Splitting**: Route-based lazy loading
- **Memoization**: React.memo for expensive components
- **Debouncing**: Search input debouncing
- **Virtual Scrolling**: For large lists

## Scalability Considerations

### Horizontal Scaling
- **Stateless Backend**: Can run multiple instances
- **Load Balancer**: Distribute traffic
- **Database Connection Pooling**: Efficient connections

### Vertical Scaling
- **Database Optimization**: Indexes, query optimization
- **Caching Layer**: Redis for session/data caching
- **CDN**: Serve static files from CDN

### Future Enhancements
- Background job processing (Celery)
- Real-time notifications (WebSocket)
- Microservices architecture
- Containerization (Docker)

## Deployment Architecture

### Development
```
Developer Machine
├── Backend (localhost:8000)
├── Frontend (localhost:3000)
└── PostgreSQL (localhost:5432)
```

### Production
```
LAN Network
├── Application Server (Backend + Frontend)
│   ├── Nginx (Port 80/443)
│   ├── Gunicorn (Django)
│   └── Static Files
└── Database Server
    └── PostgreSQL (Port 5432)
```

## Maintenance & Monitoring

### Logs
- **Application Logs**: `backend/logs/debug.log`
- **Access Logs**: Nginx/Gunicorn logs
- **Error Logs**: Django error logs
- **Audit Logs**: Database audit_logs table

### Backup Strategy
- **Database**: Daily automated backups
- **Files**: Backup uploaded files
- **Configuration**: Version control

### Monitoring Points
- API response times
- Database query performance
- Error rates
- User activity
- Disk space
- Memory usage

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 20 GB
- **Network**: 100 Mbps LAN

### Recommended Requirements
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 1 Gbps LAN

### Client Requirements
- **Browser**: Modern browser (Chrome, Firefox, Edge, Safari)
- **Screen**: 1366x768 minimum
- **Network**: LAN access

## Conclusion

This system provides a comprehensive solution for managing debenture interest and stock dividend payables with enterprise-grade features including role-based access, audit trails, reconciliation, and reporting capabilities.

For detailed implementation, refer to:
- [README.md](README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [backend/README.md](backend/README.md) - Backend documentation
- [frontend/README.md](frontend/README.md) - Frontend documentation
- [database/README.md](database/README.md) - Database documentation
