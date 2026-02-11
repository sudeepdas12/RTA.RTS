@echo off
echo ========================================
echo RTA/RTS Frontend - Starting Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo.
echo Starting React development server...
echo Application will open at: http://localhost:3000
echo.
echo If browser doesn't open automatically, visit:
echo http://localhost:3000
echo.
call npm start

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start frontend server!
    echo Check the error messages above.
    echo.
)

pause
