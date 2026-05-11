@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if "%~1"=="" (
  echo Usage: restore_db_safe.bat ^<path_to_backup_sql^> [--clean]
  exit /b 1
)

set "BACKUP_FILE=%~1"
set "RESTORE_FLAG=%~2"

if /I "%RESTORE_FLAG%"=="--clean" (
  echo WARNING: --clean will DROP and recreate the public schema.
  echo This operation is destructive and cannot be undone.
  set /p CONFIRM=Type YES to continue: 
  if /I not "%CONFIRM%"=="YES" (
    echo Aborted. No changes were made.
    exit /b 1
  )
)

if /I "%RESTORE_FLAG%"=="--clean" (
  call restore_db.bat "%BACKUP_FILE%" --clean
) else (
  call restore_db.bat "%BACKUP_FILE%"
)

exit /b %ERRORLEVEL%
