@echo off
setlocal EnableExtensions

echo ========================================
echo RTA/RTS - Start Project (distribution)
echo ========================================

cd /d "%~dp0"

REM Non-interactive starter for packaging/CI/installer use.
REM Exits with non-zero code only when startup command fails.

docker --version >nul 2>&1
if %ERRORLEVEL%==0 (
  docker compose up -d --build >nul 2>&1
  if %ERRORLEVEL%==0 (
    echo Services started via 'docker compose'.
    echo Frontend: http://localhost:3000
    echo Backend:  http://localhost:8000
    exit /b 0
  )

  docker-compose up -d --build >nul 2>&1
  if %ERRORLEVEL%==0 (
    echo Services started via 'docker-compose'.
    echo Frontend: http://localhost:3000
    echo Backend:  http://localhost:8000
    exit /b 0
  )
)

echo Docker Compose not available or failed. Falling back to local startup windows...
start "RTA Backend" cmd /k "cd /d ""%~dp0backend"" && call start_backend.bat"
timeout /t 5 /nobreak >nul
start "RTA Frontend" cmd /k "cd /d ""%~dp0frontend"" && call start_frontend.bat"
echo Local backend/frontend launch initiated.
exit /b 0
