@echo off
echo ================================================
echo   Starting Data Analyzer Application
echo ================================================
echo.

echo [1/2] Starting Backend Server...
cd data-analyzer\backend
start "Data Analyzer Backend" python main.py
echo Backend started on http://localhost:8000
echo.

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Development Server...
cd ..\frontend
start "Data Analyzer Frontend" npm run dev
echo Frontend will start on http://localhost:5173
echo.

echo ================================================
echo   Application Started Successfully!
echo ================================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit (servers will keep running)...
pause > nul
