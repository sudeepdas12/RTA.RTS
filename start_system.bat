@echo off
echo ========================================
echo RTA/RTS System - Complete Startup
echo ========================================
echo.
echo This will start both backend and frontend servers.
echo.
echo PREREQUISITES:
echo - PostgreSQL installed and running
echo - Python 3.8+ installed
echo - Node.js 16+ installed
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause

echo.
echo Starting project using smart starter (prefers Docker Compose when available)...
call "%~dp0start_project.bat"

echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Login credentials:
echo Username: admin
echo Password: admin123
echo.
pause
