@echo off
echo ========================================
echo   DANG BUILD VA DEPLOY WAREFLOW LEN VPS
echo ========================================

cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Build frontend that bai!
    pause
    exit /b %ERRORLEVEL%
)

python deploy.py
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Deploy len VPS that bai!
    pause
    exit /b %ERRORLEVEL%
)

echo ========================================
echo   DEPLOY THANH CONG!
echo ========================================
