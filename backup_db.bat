@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

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

if not exist "backups" mkdir backups
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%I"
set "BACKUP_FILE=backups\db_backup_%TS%.sql"

echo Creating backup: %BACKUP_FILE%
docker compose exec -T db pg_dump -U %DB_USER% -d %DB_NAME% > "%BACKUP_FILE%"
if errorlevel 1 (
  echo ERROR: Backup failed.
  if exist "%BACKUP_FILE%" del /q "%BACKUP_FILE%"
  exit /b 1
)

echo Backup completed successfully: %BACKUP_FILE%
exit /b 0
