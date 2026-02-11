@echo off
echo ========================================
echo RTA/RTS - Run all: diagnostics, start, test
echo ========================================

cd /d %~dp0

echo Step 1: Running diagnostics...
if exist diagnose.bat (
  call diagnose.bat
) else (
  echo diagnose.bat not found. Skipping diagnostics.
)

echo.
echo Step 2: Setting up database (if not exists)...
if exist database\setup_database.bat (
  call database\setup_database.bat
) else (
  echo database\setup_database.bat not found. Please ensure PostgreSQL is running and create the database manually.
)

echo.
echo Step 3: Checking for port conflicts (8000, 3000)...
netstat -ano | findstr ":8000" >nul 2>&1
set PORT8000_INUSE=%ERRORLEVEL%
netstat -ano | findstr ":3000" >nul 2>&1
set PORT3000_INUSE=%ERRORLEVEL%

if %PORT8000_INUSE%==0 ( 
  echo Port 8000 appears in use.
  if exist fix_ports.bat (call fix_ports.bat) else echo fix_ports.bat not found.
) else echo Port 8000 free.

if %PORT3000_INUSE%==0 ( 
  echo Port 3000 appears in use.
  if exist fix_ports.bat (call fix_ports.bat) else echo fix_ports.bat not found.
) else echo Port 3000 free.

echo.
echo Step 4: Starting backend and frontend windows...
if exist start_system.bat (
  call start_system.bat
) else (
  echo start_system.bat not found. You can run start_system.bat manually.
)

echo Waiting 8 seconds for servers to initialize...
timeout /t 8 /nobreak >nul

echo Step 5: Testing HTTP connectivity...
REM Test scripts have been removed as part of repo cleanup. If you need automated connectivity checks, re-add test scripts or run manual checks (curl/Invoke-WebRequest).

echo All done. If the web UI did not open, check the backend and frontend console windows for errors.
pause
