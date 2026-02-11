@echo off
echo ========================================
echo Fixing Common Issues
echo ========================================
echo.

echo Checking and killing processes on ports 8000 and 3000...
echo.

echo Checking port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 8000...
    taskkill /PID %%a /F 2>nul
)

echo.
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3000...
    taskkill /PID %%a /F 2>nul
)

echo.
echo Ports should now be available.
echo.
echo You can now run: start_system.bat
echo.
pause
