@echo off
echo ========================================
echo Streamer Scheduler - Dependency Installer
echo ========================================
echo.

echo Installing Backend Dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo Installing Frontend Dependencies...
cd frontend
call npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/x-date-pickers date-fns react-icons
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Backend: cd backend && npm run dev
echo 2. Frontend: cd frontend && npm start
echo.
pause 