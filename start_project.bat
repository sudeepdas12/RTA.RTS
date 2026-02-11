@echo off
echo ========================================
echo RTA/RTS - Start Project (smart)
echo ========================================

cd /d %~dp0




:done
n
n:end
npause
necho Docker not found. Falling back to local start.
necho Starting Backend...
nstart cmd /k "cd backend && start_backend.bat"
ntimeout /t 5
necho Starting Frontend...
nstart cmd /k "cd frontend && start_frontend.bat"nREM Prefer Docker Compose when available
ndocker --version >nul 2>&1
nif %ERRORLEVEL%==0 (
n  echo Docker detected. Starting services with docker-compose...
n  docker-compose up -d --build
n  if %ERRORLEVEL% neq 0 (
n    echo docker-compose failed. Trying 'docker compose'...
n    docker compose up -d --build
n    if %ERRORLEVEL% neq 0 (
n      echo Both docker-compose and 'docker compose' failed. Aborting.
n      pause
n      exit /b 1
n    )
n  )
n
n  echo Waiting for DB to be ready (up to 60s)...
n  set /a retries=0
n  :checkdb
n  set /a retries+=1
n  docker-compose logs db --tail=50 | findstr "database system is ready to accept connections" >nul 2>&1
n  if %ERRORLEVEL%==0 (
n    echo DB ready.
n  ) else (
n    if %retries% geq 12 (
n      echo DB did not become ready in time. Check 'docker-compose logs db'.
n      goto done
n    )
n    timeout /t 5 >nul
n    goto checkdb
n  )
n
n  echo Services started. Frontend: http://localhost:3000 Backend: http://localhost:8000
n  start "" "http://localhost:3000"
n  goto end
n)