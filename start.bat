@echo off
echo Starting Data Analyzer Application...
echo.

echo Starting FastAPI backend on port 8000...
start cmd /k "cd backend && python main.py"

timeout /t 3 /nobreak >nul

echo Starting React frontend on port 3000...
start cmd /k "cd frontend && npm run dev"

echo.
echo Application started!
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Close the terminal windows to stop the servers.
pause
