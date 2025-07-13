@echo off
echo Starting Streamer Scheduler Backend Development Server...

REM Check if .env file exists, if not copy from example
if not exist ".env" (
    echo Creating .env file from example...
    copy "env.example" ".env"
    echo Please update the .env file with your actual credentials
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Start the development server
echo Starting development server...
npm run dev 