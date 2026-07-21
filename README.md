# RTA/RTS Debenture Interest & Stock Dividend Management System

A comprehensive LAN-based web application for managing Debenture Interest Payables and Stock Dividend Payables with multi-user access, role-based permissions, and full audit trails.

## 📋 Features

- **Multi-user Access**: Role-based permissions (Admin, Finance Operator, Reconciliation Officer, Auditor, Report Viewer)
- **Master Data Management**: Companies and Clients with import/export functionality
- **Payables Management**: Interest and Dividend payables tracking
- **Bank Reconciliation**: Auto-matching and manual reconciliation of bank transactions
- **Comprehensive Reporting**: Dashboard with charts, Excel/PDF exports
- **Audit Logging**: Complete audit trail of all system changes
- **File Uploads**: Bulk import via Excel/CSV for all entities
- **Responsive Design**: Modern Bootstrap 5 UI

## 🏗️ Architecture

- **Frontend**: React.js 18 + Bootstrap 5 + Chart.js
- **Backend**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication

## 📁 Project Structure

```
RTA.RTS/
├── backend/
│   ├── config/              # Django settings
│   ├── apps/
│   │   ├── companies/       # Company master
│   │   ├── clients/         # Client/shareholder master
│   │   ├── users/           # User management & authentication
│   │   ├── payables/        # Interest & dividend payables
│   │   ├── reconciliation/  # Bank reconciliation
│   │   ├── reports/         # Reporting & exports
│   │   └── audit/           # Audit logging
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── context/         # React contexts
│   │   └── App.js
│   └── package.json
└── database/
    └── README.md            # PostgreSQL setup notes
```

## 🚀 Installation & Setup

**Developer note:** For developer-focused Docker/Postgres troubleshooting and recovery steps, see `DEV_SETUP.md`.

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### 1. Database Setup

```bash
# Install PostgreSQL
# Create database
psql -U postgres
CREATE DATABASE rta_rts_db;
CREATE USER rta_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;
\q

# Run Django migrations
cd backend
python manage.py migrate --noinput
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env
# Edit .env with your database credentials

# Run migrations (if needed)
python manage.py makemigrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

Backend will run at: `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env
# Edit .env if API URL is different

# Start development server
npm start
```

Frontend will run at: `http://localhost:3000`

## 👤 Default Credentials

**Username**: admin  
**Password**: admin123

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

## 📊 User Roles & Permissions

### Admin
- Full system access
- Manage users, companies, clients
- Create/update/delete all payables
- Perform reconciliation
- View all reports and audit logs

### Finance Operator
- Create and update payables
- Upload bank statements
- View dashboards
- Export reports

### Reconciliation Officer
- Handle bank reconciliation
- Match transactions
- Flag exceptions
- Generate reconciliation reports

### Auditor (Read-only)
- View all reports
- Access audit logs
- No modification permissions

### Report Viewer
- View dashboards
- Export reports only

## 📝 API Endpoints

### Authentication
```
POST /api/auth/login/          # Login
POST /api/auth/refresh/        # Refresh token
POST /api/users/logout/        # Logout
```

### Companies
```
GET    /api/companies/         # List companies
POST   /api/companies/         # Create company
GET    /api/companies/{id}/    # Get company details
PUT    /api/companies/{id}/    # Update company
DELETE /api/companies/{id}/    # Delete company
POST   /api/companies/upload/  # Bulk upload
GET    /api/companies/export_template/ # Download template
```

### Clients
```
GET    /api/clients/           # List clients
POST   /api/clients/           # Create client
GET    /api/clients/{id}/      # Get client details
PUT    /api/clients/{id}/      # Update client
DELETE /api/clients/{id}/      # Delete client
POST   /api/clients/upload/    # Bulk upload
GET    /api/clients/export_template/ # Download template
```

### Interest Payables
```
GET    /api/payables/interest/         # List interest payables
POST   /api/payables/interest/         # Create interest payable
GET    /api/payables/interest/{id}/    # Get details
PUT    /api/payables/interest/{id}/    # Update
DELETE /api/payables/interest/{id}/    # Delete
GET    /api/payables/interest/summary/ # Get summary
POST   /api/payables/interest/upload/  # Bulk upload
```

### Dividend Payables
```
GET    /api/payables/dividend/         # List dividend payables
POST   /api/payables/dividend/         # Create dividend payable
GET    /api/payables/dividend/{id}/    # Get details
PUT    /api/payables/dividend/{id}/    # Update
DELETE /api/payables/dividend/{id}/    # Delete
GET    /api/payables/dividend/summary/ # Get summary
POST   /api/payables/dividend/upload/  # Bulk upload
```

### Reconciliation
```
GET  /api/reconciliation/bank-statements/        # List bank statements
POST /api/reconciliation/bank-statements/upload/ # Upload statement
GET  /api/reconciliation/bank-transactions/      # List transactions
POST /api/reconciliation/auto_match/             # Auto-match
POST /api/reconciliation/                        # Manual reconciliation
```

### Reports
```
GET /api/reports/dashboard/          # Dashboard data
GET /api/reports/export/interest/    # Export interest report (Excel)
GET /api/reports/export/dividend/    # Export dividend report (Excel)
```

### Audit Logs
```
GET /api/audit/                      # List audit logs
```

## 📤 File Upload Templates

### Company Upload (Excel/CSV)
```
company_code | company_name | sector_type | interest_tax_status | pan_no | bank_name | bank_account_no
COMP001     | Sample Co    | Public      | Taxable            | 123456 | ABC Bank  | 1234567890
```

### Client Upload (Excel/CSV)
```
client_code | full_name    | holder_type | pan_or_citizenship | bank_name | bank_account_no
CL001      | John Doe     | Public      | 12345678          | ABC Bank  | 1234567890
```

### Interest Payable Upload (Excel/CSV)
```
company_code | client_code | instrument_ref | gross_interest | tax_amount | due_date
COMP001     | CL001       | DEB001        | 100000        | 5000      | 2026-03-31
```

### Dividend Payable Upload (Excel/CSV)
```
company_code | client_code | shares_held | gross_dividend | tax_amount | fiscal_year
COMP001     | CL001       | 1000       | 50000         | 2500      | 2080/81
```

### Bank Statement Upload (Excel/CSV)
```
txn_date   | reference_no | debit | credit | balance  | description
2026-02-01 | TXN001      | 0     | 95000  | 1000000 | Payment received
```

## 🔧 Configuration

### Backend (.env)
```
DEBUG=True
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=rta_rts_db
DB_USER=rta_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
```

## 🔒 Security Features

- JWT-based authentication with token refresh
- Password hashing using Django's PBKDF2
- Role-based access control (RBAC)
- CORS protection
- SQL injection prevention via ORM
- XSS protection via React
- Complete audit trail

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running (local)
sudo systemctl status postgresql

# Verify database credentials in backend/.env
# Ensure the DB credentials match the running database (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
```

#### Docker: Postgres initialization issues
Sometimes a pre-existing DB Docker volume contains data from a different init which causes Postgres to skip the normal initialization step. When that happens you may see repeated messages like `database "<username>" does not exist` in the DB container logs and the backend will fail to connect.

Non-destructive fix (recommended):

1. Find the DB container name:
```bash
docker ps --filter name=db --format "{{.Names}}"
```
2. Connect to the Postgres container as the configured superuser (uses env vars set in `backend/.env` or `docker-compose.yml`):

```bash
# replace <db-container> with the name found above
# use your POSTGRES_USER and POSTGRES_PASSWORD from backend/.env
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" -it <db-container> psql -U "$POSTGRES_USER" -d postgres
```

3. Inside psql, inspect and (if missing) create the required DB and user:
```
\l                      -- list databases
CREATE DATABASE rta_rts_db;                -- if missing
CREATE ROLE rta_user WITH LOGIN PASSWORD 'your_password';  -- if missing
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;
```

Destructive (reinitialize) option:

- If you don't need existing DB data, remove the DB volume and re-run compose to allow Postgres to initialize from scratch:
```bash
# WARNING: this deletes DB data
docker compose down -v
docker compose up --build
```

Useful logs and checks:
```bash
# Follow DB logs
docker compose logs -f db
# Check service health
docker compose ps
```

Notes:
- Make sure `backend/.env` exists and values match what you expect before `docker compose up` (e.g. `cp backend/.env.sample backend/.env`).
- The `version` attribute in `docker-compose.yml` is obsolete and can be removed to avoid a warning; it does not affect startup.


### CORS Error
```bash
# Ensure frontend URL is in CORS_ALLOWED_ORIGINS in backend/.env
```

### Port Already in Use
```bash
# Backend (port 8000)
# Find and kill process using port 8000

# Frontend (port 3000)
# Specify different port: PORT=3001 npm start
```

## 📞 Support

For issues or questions, contact the system administrator.

## 📄 License

Internal use only - RTA/RTS Department, Nepal

---

## 🐳 Docker (development)  ✅

A convenient docker-compose setup builds and runs the full stack (Postgres, Django backend, React frontend).

Quick start (recommended):

```bash
# from project root
cp backend/.env.sample backend/.env    # provide secrets if needed
# then run the one-line starter (preferred)
start.bat    # or start_project.bat
```

Notes:
- `start.bat` is a simple alias that calls `start_project.bat`. The starter prefers Docker Compose when available and falls back to local starts.
- If you prefer to run services manually, see the "Backend Setup" and "Frontend Setup" sections above.

docker compose up --build
# backend: http://localhost:8000
# frontend: http://localhost:3000
```

To run only the backend or frontend:

```bash
# rebuild backend container
docker compose build backend && docker compose up backend

# rebuild frontend container
docker compose build frontend && docker compose up frontend
```

**Notes:**
- The compose file mounts persistent volumes for DB and static/media content.
- For production you should replace the sample `.env` values, set `DEBUG=False` and use a proper secret key and TLS termination.

---

**Version**: 1.0.0  
**Last Updated**: February 1, 2026
