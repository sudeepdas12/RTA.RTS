# Database Setup Guide

## PostgreSQL Installation and Configuration

### 1. Install PostgreSQL

**Windows:**
- Download PostgreSQL from https://www.postgresql.org/download/windows/
- Run the installer and follow the setup wizard
- Default port: 5432
- Set a password for the `postgres` superuser

### 2. Create Database

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE rta_rts_db;
CREATE USER rta_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;
```

### 3. Execute Schema

Navigate to the database directory and run:

```bash
psql -U postgres -d rta_rts_db -f schema.sql
```

Or using pgAdmin:
1. Connect to the database
2. Open Query Tool
3. Open and execute `schema.sql`

### 4. Verify Installation

Check that all tables are created:

```sql
\dt
```

You should see:
- companies
- clients
- roles
- users
- interest_payables
- dividend_payables
- bank_statements
- bank_transactions
- reconciliation
- audit_logs

### 5. Default Admin Credentials

**Username:** admin  
**Password:** admin123

⚠️ **IMPORTANT:** Change the admin password immediately after first login!

## Database Configuration for Django

Update your Django `settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'rta_rts_db',
        'USER': 'rta_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

## Backup and Restore

### Backup
```bash
pg_dump -U rta_user -d rta_rts_db -f backup_$(date +%Y%m%d).sql
```

### Restore
```bash
psql -U rta_user -d rta_rts_db -f backup_20260201.sql
```

## Maintenance

### Vacuum Database (optimize performance)
```sql
VACUUM ANALYZE;
```

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size('rta_rts_db'));
```
