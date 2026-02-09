@echo off
echo ========================================
echo RTA/RTS Backend - Starting Server
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

REM Check if requirements are installed
if not exist "venv\Lib\site-packages\django\" (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file with your database password!
    echo Press any key after editing .env file...
    pause
)

REM Create required directories
if not exist "logs\" mkdir logs
if not exist "media\" mkdir media
if not exist "staticfiles\" mkdir staticfiles

echo.
echo Starting Django development server...
echo Server will be available at: http://localhost:8000
echo.
echo If you see errors, check:
echo 1. PostgreSQL is running
echo 2. Database 'rta_rts_db' exists
echo 3. .env file has correct credentials
echo.
python manage.py runserver 0.0.0.0:8000

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start backend server!
    echo Check the error messages above.
    echo.
)

pause
