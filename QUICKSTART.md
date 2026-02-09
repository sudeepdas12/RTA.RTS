# Quick Start Guide - RTA/RTS Management System

This guide will help you get the system up and running in minutes.

## Prerequisites Check

Before starting, ensure you have:
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 16+ installed (`node --version`)
- [ ] PostgreSQL 12+ installed and running

## 🚀 Quick Setup (5 Minutes)

### Option A: Docker Compose (Recommended)

1) Ensure root .env has DB credentials for Compose interpolation:
```
DB_NAME=rta_rts_db
DB_USER=rta_user
DB_PASSWORD=rta123
```

2) Start services:
```
docker compose up -d --build
```

3) Load schema into the DB container:
```
Get-Content .\database\schema.sql | docker exec -i rtarts-db-1 psql -U rta_user -d rta_rts_db
```

4) Ensure admin user exists:
```
docker compose exec -T backend python manage.py set_admin_password --username admin --password admin123
```

5) (Optional) Create end-to-end test data and run quick checks
```
# create sample data used by UI and tests
docker compose exec -T backend python manage.py create_test_data

# run simple API end-to-end checks (login + list endpoints)
docker compose exec -T backend python manage.py run_e2e_tests
```

Note: `python manage.py create_test_data` now hydrates a Nepal-focused sample data pack covering:
- Multi-role access (Admin, Accountant, Auditor, Maker, Checker, Viewer) with realistic permissions
- Companies and clients that mirror Nepal RTA/RTS issuers/holders
- Debenture interest, stock dividend, and reconciliation data across Paid, Pending, Partial, and Exception statuses
- Bank statements and audit logs so Dashboard, Reports, Uploads, Reconciliation, Audit, Users, Companies, Clients, Interest, and Dividend pages all render meaningful charts/tables

Looking for bulk-upload files? Check [`sample_data/`](sample_data/README.md) which ships ready-to-import CSVs for companies, clients, interest, dividend, and bank statements. Re-run `create_test_data` whenever you need to reset the canonical dataset.

Frontend: http://localhost:3000
Backend:  http://localhost:8000

### Step 1: Database Setup (2 minutes)

```bash
# Open PostgreSQL terminal
psql -U postgres

# Run these commands:
CREATE DATABASE rta_rts_db;
CREATE USER rta_user WITH PASSWORD 'rta123';
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;
\q

# Load schema
cd database
psql -U postgres -d rta_rts_db -f schema.sql
```

### Step 2: Backend Setup (2 minutes)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Setup environment
copy .env.example .env         # Windows
cp .env.example .env           # Linux/Mac

# Create required folders
mkdir logs media staticfiles

# Run server
python manage.py runserver
```

Backend is now running at **http://localhost:8000**

### Step 3: Frontend Setup (1 minute)

Open a **new terminal window**:

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
copy .env.example .env         # Windows
cp .env.example .env           # Linux/Mac

# Start development server
npm start
```

Frontend will open automatically at **http://localhost:3000**

## 🎉 You're Ready!

Login with:
- **Username**: `admin`
- **Password**: `admin123`

### Additional Sample Accounts

| Role | Username | Password | Notes |
| --- | --- | --- | --- |
| Accountant | accountant | acct123 | Can create/update payables and run reconciliations |
| Auditor | auditor | auditor123 | Read-only visibility across all modules |
| Maker | maker | maker123 | Creates master data + payables for review |
| Checker | checker | checker123 | Reviews and updates maker submissions |
| Viewer / Analyst | analyst | analyst123 | Dashboard/report-only access |

## ✅ Verification Steps

1. **Database**: Can you login to PostgreSQL?
   ```bash
   psql -U rta_user -d rta_rts_db
   ```

2. **Backend**: Visit http://localhost:8000/api/
   - You should see API documentation

3. **Frontend**: Visit http://localhost:3000
   - You should see the login page

## 🐛 Common Issues

### Issue: Localhost not accessible after running scripts
**Cause**: The backend is trying to connect to the wrong database host for your run mode.

**Fix (Docker Compose run)**: Use the Docker service name for DB host.
```
DB_HOST=db
```

**Fix (Local Postgres run)**: Use localhost for DB host.
```
DB_HOST=localhost
```

After updating `backend/.env`, restart the backend.

### Issue: "psql: command not found"
**Fix**: Add PostgreSQL to PATH or use full path to psql.exe

### Issue: Backend won't start
**Fix**: 
```bash
# Check if virtual environment is activated
# You should see (venv) in your terminal prompt

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: Frontend won't start
**Fix**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Cannot connect to database
**Fix**: Edit `backend/.env`:
```
DB_PASSWORD=rta123
DB_HOST=localhost
DB_PORT=5432
```

### Issue: `psql` not recognized on Windows
**Fix**: Either add PostgreSQL `bin` to PATH or use Docker Compose:
```
docker compose up --build -d
```

### Issue: CORS error in browser
**Fix**: Check `backend/.env` includes:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## 📝 What's Next?

1. **Change Default Password**
   - Login → Click on your name → Change Password

2. **Add Master Data**
   - Navigate to Companies → Upload company data
   - Navigate to Clients → Upload client data

3. **Create Payables**
   - Go to Interest Payables → Upload or create entries
   - Go to Dividend Payables → Upload or create entries

4. **View Dashboard**
   - Check Dashboard for summary and charts

5. **Export Reports**
   - Go to Reports → Export Interest/Dividend reports

## 🆘 Need Help?

1. Check the main [README.md](README.md) for detailed documentation
2. Check [backend/README.md](backend/README.md) for backend-specific issues
3. Check [frontend/README.md](frontend/README.md) for frontend-specific issues
4. Check [database/README.md](database/README.md) for database issues

## 📌 Important URLs

| Service  | URL                          | Credentials        |
|----------|------------------------------|-------------------|
| Frontend | http://localhost:3000        | admin / admin123  |
| Backend  | http://localhost:8000        | -                 |
| API Docs | http://localhost:8000/api/   | -                 |
| Admin    | http://localhost:8000/admin/ | Django superuser  |

## 🔐 Security Reminder

⚠️ **IMPORTANT**: This setup is for development only!

For production:
1. Change SECRET_KEY in backend/.env
2. Set DEBUG=False
3. Use strong database password
4. Configure HTTPS
5. Set proper ALLOWED_HOSTS
6. Change default admin password

## 🎯 System Features at a Glance

- ✅ Multi-user with role-based access
- ✅ Company & Client master management
- ✅ Interest & Dividend payables tracking
- ✅ Bank statement reconciliation
- ✅ Bulk upload via Excel/CSV
- ✅ Dashboard with charts
- ✅ Excel/PDF export
- ✅ Complete audit trail

Enjoy using the RTA/RTS Management System! 🚀
