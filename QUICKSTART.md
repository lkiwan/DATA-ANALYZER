# Quick Start Guide

## Prerequisites

Make sure you have installed:
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

## Installation Steps

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or use a virtual environment (recommended):

```bash
cd backend
python -m venv venv

# On Linux/Mac:
source venv/bin/activate

# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Use Startup Scripts (Easiest)

**On Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

**On Windows:**
```bash
start.bat
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Access the Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## First Steps

1. **Upload a file**: Click on the Upload tab and drag & drop a CSV, Excel, JSON, or Parquet file

2. **View your data**: Navigate to the Data tab to see your dataset

3. **Clean your data**: Go to the Clean tab to handle missing values and remove duplicates

4. **Analyze**: Visit the Analyze tab to generate statistics

5. **Query**: Use the NL Query tab to filter data using natural language (e.g., "filter where age > 30")

6. **Export**: Click the export buttons in the header to download your processed data

## Sample Commands for NL Query

Try these natural language queries:
- `filter where age > 30`
- `sort by salary desc`
- `top 10 rows`
- `select name, email, city`
- `show rows where price < 100`

## Common Issues

### Backend won't start
- Make sure Python dependencies are installed: `pip install -r requirements.txt`
- Check if port 8000 is already in use

### Frontend won't start
- Make sure Node dependencies are installed: `npm install`
- Check if port 3000 is already in use

### Connection errors
- Ensure backend is running before starting frontend
- Check browser console for detailed error messages

## Need Help?

Check the full README.md for comprehensive documentation of all features and API endpoints.
