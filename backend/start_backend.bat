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

REM If .env uses DB_HOST=db but Docker isn't available, warn and offer to switch
for /f "tokens=2 delims==" %%A in ('findstr "^DB_HOST=" .env 2^>nul') do set DB_HOST=%%A
if /i "%DB_HOST%"=="db" (
    docker --version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo.
        echo WARNING: Your backend .env sets DB_HOST=db but Docker is not available.
        echo Local backend start will not be able to connect to the database unless you have a local PostgreSQL and update .env to use DB_HOST=localhost.
        set /p changehost=Do you want to temporarily set DB_HOST=localhost in .env for this run? (y/N):
        if /i "%%changehost%%"=="y" (
            powershell -Command "(Get-Content .env) -replace 'DB_HOST=db','DB_HOST=localhost' | Set-Content .env"
            echo Modified .env to use localhost. Remember to restore DB_HOST=db if you switch back to Docker.
        ) else (
            echo Aborting backend start. Consider installing Docker and using start_project.bat, or edit backend\.env to set DB_HOST=localhost.
            pause
            exit /b 1
        )
    )
)

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
