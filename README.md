# Data Analyzer Application

A full-stack data analysis application with Python FastAPI backend and React frontend.

## Quick Start

### Option 1: Using run.py (Recommended)

Simply run the Python script to start both servers:

```bash
# From Windows PowerShell or WSL
python run.py
```

Or:

```bash
python3 run.py
```

The script will:
- Check if Python and npm are installed
- Optionally install dependencies
- Start the backend server on http://localhost:8000
- Start the frontend dev server on http://localhost:5173
- Monitor both processes and handle graceful shutdown with Ctrl+C

### Option 2: Using Batch Files (Windows Only)

```powershell
# Install dependencies (first time only)
.\install_backend_deps.bat

# Start both servers
.\start.bat

# Or start individually:
.\start_backend.bat
.\start_frontend.bat
```

## Manual Setup

### Backend Setup

```bash
cd data-analyzer/backend
pip install -r requirements.txt
python main.py
```

Backend will run on: http://localhost:8000

### Frontend Setup

```bash
cd data-analyzer/frontend
npm install
npm run dev
```

Frontend will run on: http://localhost:5173

## Features

- **Data Import**: Upload CSV, Excel, JSON, Parquet files
- **Data Cleaning**: Handle missing values, duplicates, outliers
- **Data Transformation**: Filter, aggregate, pivot, transform columns
- **Data Analysis**: Statistics, correlation, summaries
- **Natural Language Queries**: Query data using plain English
- **Custom Code Execution**: Run custom Python code on your datasets
- **AI Assistant**: Get code suggestions for data manipulation
- **Data Export**: Export to CSV, JSON, Excel, Parquet

## Project Structure

```
Data manupulation/
├── run.py                    # Main application runner
├── start.bat                 # Windows batch starter
├── data-analyzer/
│   ├── backend/
│   │   ├── main.py          # FastAPI application
│   │   ├── requirements.txt # Python dependencies
│   │   ├── api/             # API endpoints
│   │   └── utils/           # Utility functions
│   └── frontend/
│       ├── src/             # React source code
│       ├── package.json     # npm dependencies
│       └── vite.config.js   # Vite configuration
```

## Requirements

- Python 3.8+
- Node.js 16+
- npm 8+

## Stopping the Application

Press `Ctrl+C` in the terminal where `run.py` is running. The script will gracefully shut down both servers.

## Troubleshooting

### Port Already in Use

If you get port errors, check if another process is using ports 8000 or 5173:

```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Linux/WSL
lsof -i :8000
lsof -i :5173
```

### Module Not Found

Make sure all dependencies are installed:

```bash
# Backend
cd data-analyzer/backend
pip install -r requirements.txt

# Frontend
cd data-analyzer/frontend
npm install
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
