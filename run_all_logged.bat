@echo off
echo ========================================
echo RTA/RTS - Run All (logged)
echo Logs will be written to logs\ in the workspace root.
echo ========================================

cd /d %~dp0

if not exist logs mkdir logs

echo Step 1: Running DB setup (logs/setup_db.log)...
if exist database\setup_database.bat (
  call database\setup_database.bat > logs\setup_db.log 2>&1
  echo DB setup finished. See logs\setup_db.log
) else (
  echo database\setup_database.bat not found. Skipping DB setup.
)

echo.
echo Step 2: Preparing backend (install + migrate). Logs: logs\backend_install.log, logs\backend_migrate.log
cd backend

if not exist venv (
  echo Creating virtualenv...
  python -m venv venv >> ..\logs\backend_install.log 2>&1
)

echo Activating virtualenv and installing requirements...
call venv\Scripts\activate
pip install -r requirements.txt >> ..\logs\backend_install.log 2>&1

echo Running migrations...
python manage.py migrate >> ..\logs\backend_migrate.log 2>&1

echo.
echo Step 3: Starting backend (logs\backend_run.log). This will run in this window and stream to the log.
python manage.py runserver 0.0.0.0:8000 > ..\logs\backend_run.log 2>&1

echo Backend exited. Check logs\backend_run.log for details.

echo To start the frontend separately in a new window, run:
echo start cmd /k "cd frontend && npm install && npm start"

pause
