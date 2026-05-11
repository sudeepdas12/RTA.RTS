@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: restore_db.bat ^<path_to_backup_sql^> [--clean]
  exit /b 1
)

set "BACKUP_FILE=%~1"
if not exist "%BACKUP_FILE%" (
  echo ERROR: Backup file not found: %BACKUP_FILE%
  exit /b 1
)

set "ENV_FILE=backend\.env"
if not exist "%ENV_FILE%" (
  echo ERROR: %ENV_FILE% not found.
  exit /b 1
)

set "DB_NAME="
set "DB_USER="
for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  if /I "%%A"=="DB_NAME" set "DB_NAME=%%B"
  if /I "%%A"=="DB_USER" set "DB_USER=%%B"
)

if "%DB_NAME%"=="" (
  echo ERROR: DB_NAME not found in %ENV_FILE%.
  exit /b 1
)
if "%DB_USER%"=="" (
  echo ERROR: DB_USER not found in %ENV_FILE%.
  exit /b 1
)

echo Restoring database %DB_NAME% from %BACKUP_FILE%
if /I "%~2"=="--clean" (
  echo Cleaning schema before restore...
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U %DB_USER% -d %DB_NAME% -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  if errorlevel 1 (
    echo ERROR: Schema cleanup failed.
    exit /b 1
  )
)

docker compose exec -T db psql -v ON_ERROR_STOP=1 -U %DB_USER% -d %DB_NAME% < "%BACKUP_FILE%"
if errorlevel 1 (
  echo ERROR: Restore failed.
  exit /b 1
)

echo Restore completed successfully.
exit /b 0
