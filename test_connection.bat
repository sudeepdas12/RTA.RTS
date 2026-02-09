@echo off
echo ========================================
echo Testing Backend Server Connection
echo ========================================
echo.

echo Attempting to connect to http://localhost:8000...
echo.

curl -s http://localhost:8000/api/ >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Backend is running and accessible!
    echo URL: http://localhost:8000
    start http://localhost:8000/api/
) else (
    echo [ERROR] Cannot connect to backend at http://localhost:8000
    echo.
    echo Possible issues:
    echo 1. Backend server is not running
    echo 2. Firewall is blocking the connection
    echo 3. Server failed to start - check backend window for errors
    echo.
    echo Try:
    echo - Check if backend window shows any errors
    echo - Run: cd backend ^&^& python manage.py runserver
    echo - Check firewall settings
)

echo.
echo ========================================
echo Testing Frontend Server Connection
echo ========================================
echo.

echo Attempting to connect to http://localhost:3000...
echo.

curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Frontend is running and accessible!
    echo URL: http://localhost:3000
    start http://localhost:3000
) else (
    echo [ERROR] Cannot connect to frontend at http://localhost:3000
    echo.
    echo Possible issues:
    echo 1. Frontend server is not running
    echo 2. Firewall is blocking the connection
    echo 3. npm failed to start - check frontend window for errors
    echo.
    echo Try:
    echo - Check if frontend window shows any errors
    echo - Run: cd frontend ^&^& npm start
    echo - Check firewall settings
)

echo.
pause
