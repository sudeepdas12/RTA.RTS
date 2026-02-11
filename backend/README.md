# Backend Installation Guide

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

## Step-by-Step Installation

### 1. Setup PostgreSQL Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE rta_rts_db;
CREATE USER rta_user WITH PASSWORD 'your_secure_password';
ALTER ROLE rta_user SET client_encoding TO 'utf8';
ALTER ROLE rta_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE rta_user SET timezone TO 'Asia/Kathmandu';
GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;

# Exit PostgreSQL
\q

# Execute schema
cd ../database
psql -U postgres -d rta_rts_db -f schema.sql
```

### 2. Create Virtual Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy example environment file
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac

# Edit .env file with your settings
notepad .env              # Windows
nano .env                 # Linux
```

Edit the following variables in `.env`:
```
DEBUG=True
SECRET_KEY=your-very-secret-key-change-this
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.*

DB_NAME=rta_rts_db
DB_USER=rta_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 5. Create Required Directories

```bash
mkdir logs
mkdir media
mkdir staticfiles
```

### 6. Run Database Migrations (if needed)

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 8. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### 9. Run Development Server

```bash
python manage.py runserver
```

The server will start at: **http://localhost:8000**

### 10. Test API

Open your browser and go to:
- API Root: http://localhost:8000/api/
- Admin Panel: http://localhost:8000/admin/

## Production Deployment

### Using Gunicorn (Linux)

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Using Windows Service

1. Install `pywin32`:
```bash
pip install pywin32
```

2. Create a Windows service script or use Task Scheduler

### Using Nginx as Reverse Proxy

Create Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-server-name;

    location /static/ {
        alias /path/to/backend/staticfiles/;
    }

    location /media/ {
        alias /path/to/backend/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Troubleshooting

### Issue: Module not found

**Solution**: Ensure virtual environment is activated and all dependencies are installed.

```bash
pip install -r requirements.txt
```

### Issue: Database connection error

**Solution**: Check database credentials in `.env` file and ensure PostgreSQL is running.

```bash
# Check PostgreSQL status (Linux)
sudo systemctl status postgresql

# Check PostgreSQL status (Windows)
# Open Services and check PostgreSQL service
```

### Issue: Permission denied

**Solution**: Ensure proper file permissions:

```bash
chmod +x manage.py
chmod -R 755 backend/
```

### Issue: Port already in use

**Solution**: Use a different port:

```bash
python manage.py runserver 0.0.0.0:8001
```

## Default Login Credentials

**Username**: admin  
**Password**: admin123

⚠️ Change immediately after first login!

## API Documentation

Once the server is running, you can:
1. Access the browsable API at http://localhost:8000/api/
2. Use tools like Postman or curl to test endpoints
3. Check `README.md` for complete API endpoint documentation

## Maintenance

### Update Database Schema

```bash
python manage.py makemigrations
python manage.py migrate
```

### Backup Database

```bash
pg_dump -U rta_user -d rta_rts_db -f backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U rta_user -d rta_rts_db -f backup_20260201.sql
```

### View Logs

```bash
tail -f logs/debug.log
```
