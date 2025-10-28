@echo off
echo Installing backend dependencies...
cd data-analyzer\backend
python -m pip install -r requirements.txt
echo.
echo Backend dependencies installed successfully!
pause
