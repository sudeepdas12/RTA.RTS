@echo off
echo ========================================
echo RTA/RTS - Start Project (clean)
echo ========================================

cd /d %~dp0

REM Prefer Docker Compose when available
docker --version >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Docker detected. Starting services with docker-compose...
  docker-compose up -d --build
  if %ERRORLEVEL% neq 0 (
    echo docker-compose failed. Trying 'docker compose'...
    docker compose up -d --build
    if %ERRORLEVEL% neq 0 (
      echo Both docker-compose and 'docker compose' failed. Aborting.
      pause
      exit /b 1
    )
  )

  echo Waiting for DB to be ready (up to 60s)...
  set /a retries=0
  :checkdb
  set /a retries+=1
  docker-compose logs db --tail=50 | findstr "database system is ready to accept connections" >nul 2>&1
  if %ERRORLEVEL%==0 (
    echo DB ready.
  ) else (
    if %retries% geq 12 (
      echo DB did not become ready in time. Check 'docker-compose logs db'.
      goto done
    )
    timeout /t 5 >nul
    goto checkdb
  )

  echo Services started. Frontend: http://localhost:3000 Backend: http://localhost:8000
  start "" "http://localhost:3000"
  goto end
)

:done
pause

:end

echo Docker not found. Falling back to local start.
echo Starting Backend...
start cmd /k "cd backend && start_backend.bat"
timeout /t 5
echo Starting Frontend...
start cmd /k "cd frontend && start_frontend.bat"
