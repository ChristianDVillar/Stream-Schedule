@echo off
echo ========================================
echo Streamer Scheduler - Application Starter
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting Frontend Development Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Application Started!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul 