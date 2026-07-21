@echo off
echo ========================================
echo RTA/RTS System - Database Setup
echo ========================================
echo.

echo Step 1: Creating database and user...
psql -U postgres -c "CREATE DATABASE rta_rts_db;"
psql -U postgres -c "CREATE USER rta_user WITH PASSWORD 'rta123';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rta_rts_db TO rta_user;"

echo.
echo Step 2: Running Django migrations...
pushd ..\backend
python manage.py migrate --noinput
popd

echo.
echo ========================================
echo Database setup complete!
echo ========================================
echo.
echo Database: rta_rts_db
echo User: rta_user
echo Password: rta123
echo.
pause
