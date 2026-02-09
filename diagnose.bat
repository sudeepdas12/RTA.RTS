@echo off
echo ========================================
echo RTA/RTS System - Diagnostic Check
echo ========================================
echo.

echo [1/8] Checking Python installation...
python --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Download from: https://www.python.org/downloads/
) else (
    echo [OK] Python is installed
)
echo.

echo [2/8] Checking Node.js installation...
node --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Download from: https://nodejs.org/
) else (
    echo [OK] Node.js is installed
)
echo.

echo [3/8] Checking npm installation...
npm --version 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
) else (
    echo [OK] npm is installed
)
echo.

echo [4/8] Checking PostgreSQL installation...
psql --version 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] psql command not found in PATH
    echo PostgreSQL might be installed but not in PATH
) else (
    echo [OK] PostgreSQL is installed
)
echo.

echo [5/8] Checking if PostgreSQL is running...
netstat -an | findstr ":5432" >nul
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not running on port 5432
    echo Please start PostgreSQL service
) else (
    echo [OK] PostgreSQL is running on port 5432
)
echo.

echo [6/8] Checking if port 8000 is available (Backend)...
netstat -an | findstr ":8000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 8000 is already in use
    echo Backend might already be running or blocked by another process
) else (
    echo [OK] Port 8000 is available
)
echo.

echo [7/8] Checking if port 3000 is available (Frontend)...
netstat -an | findstr ":3000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 3000 is already in use
    echo Frontend might already be running or blocked by another process
) else (
    echo [OK] Port 3000 is available
)
echo.

echo [8/8] Checking if database exists...
psql -U postgres -lqt 2>nul | findstr "rta_rts_db" >nul
if %errorlevel% neq 0 (
    echo [WARNING] Database 'rta_rts_db' not found
    echo Run: cd database ^&^& setup_database.bat
) else (
    echo [OK] Database 'rta_rts_db' exists
)
echo.

echo ========================================
echo Diagnostic Summary
echo ========================================
echo.
echo If you see any [ERROR] or [WARNING] above, please fix them first.
echo.
echo Common fixes:
echo 1. Install missing software (Python, Node.js, PostgreSQL)
echo 2. Start PostgreSQL service
echo 3. Run database setup: cd database ^&^& setup_database.bat
echo 4. Kill processes using ports 3000 or 8000
echo.
echo To kill a process on a port:
echo   netstat -ano ^| findstr :8000
echo   taskkill /PID [PID_NUMBER] /F
echo.
pause
