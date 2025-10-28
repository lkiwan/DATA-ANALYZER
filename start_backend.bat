@echo off
echo Starting Backend Server...
cd data-analyzer\backend
start "Data Analyzer Backend" python main.py
echo Backend started on http://localhost:8000
