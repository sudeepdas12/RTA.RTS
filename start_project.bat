@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo RTA/RTS - Start Project (smart)
echo ========================================

cd /d "%~dp0"

REM Prefer Docker Compose when available
docker --version >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Docker detected. Starting services...

  docker compose up -d --build >nul 2>&1
  if %ERRORLEVEL% neq 0 (
    echo 'docker compose' failed. Trying docker-compose...
    docker-compose up -d --build >nul 2>&1
    if %ERRORLEVEL% neq 0 (
      echo Both Docker Compose commands failed. Falling back to local start.
      goto local_start
    )
  )

  echo Waiting for services to initialize...
  timeout /t 5 /nobreak >nul
  echo Services started.
  echo Frontend: http://localhost:3000
  echo Backend:  http://localhost:8000
  start "" "http://localhost:3000"
  goto end
)

echo Docker not found. Falling back to local start.

:local_start
echo Starting Backend...
start "RTA Backend" cmd /k "cd /d ""%~dp0backend"" && call start_backend.bat"
timeout /t 5 /nobreak >nul
echo Starting Frontend...
start "RTA Frontend" cmd /k "cd /d ""%~dp0frontend"" && call start_frontend.bat"

:end
echo.
echo Startup command completed.
pause
