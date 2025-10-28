# Data Analyzer - Advanced Data Manipulation Tool

A comprehensive web application for data manipulation, cleaning, transformation, and analysis. Built with React + FastAPI + Pandas.

## ✨ Key Highlights

🤖 **AI Assistant** - Natural language to Python code generation
💻 **Custom Code Editor** - Execute Python directly on your data
🔄 **Data Reset** - Restore original data with one click
📊 **14 Data Types** - Precise type conversions (int8-64, uint8-64, float32/64)
🧹 **Smart Cleaning** - Handle missing values, duplicates, outliers
📈 **Statistical Analysis** - Comprehensive data insights
🔍 **Natural Language Queries** - Query data in plain English
💾 **Multi-format Support** - CSV, Excel, JSON, Parquet

## Features Overview

### 1. Data Import & Export
- **Upload**: CSV, Excel (.xlsx, .xls), JSON, Parquet
- **Auto-detection**: Automatically detects delimiter, header, and encoding
- **Export**: CSV, Excel, JSON, Parquet formats
- **Preview**: See first N rows before import
- **Session persistence**: Save/load previous datasets using localStorage

### 2. Data Cleaning
#### Missing Data
- Detect missing values across all columns
- Fill strategies:
  - Mean, median, mode (for numeric columns)
  - Constant value
  - Forward fill (ffill)
  - Backward fill (bfill)
  - Interpolation
- Drop rows/columns with missing values
- Visual indicators for missing data

#### Duplicates
- Detect duplicate rows
- Remove duplicates
- Keep first, last, or remove all duplicates
- Report duplicate count

#### Text Cleaning
- Trim whitespace
- Change case (upper, lower, title)
- Replace substrings
- Regex replace
- Remove numbers
- Remove punctuation

#### Outliers
- Detection methods:
  - IQR (Interquartile Range)
  - Z-score
- Actions:
  - Remove outliers
  - Cap outliers (clamp to bounds)

### 3. Data Transformation
#### Column Operations
- Rename columns
- Drop columns
- Add new columns
- Reorder columns
- Change data types (int, float, string, datetime, bool, category)

#### Row Operations
- Filter by conditions
- Sort by one or multiple columns
- Random sampling
- Slice by index range

#### Calculations
- Arithmetic operations between columns
- Apply custom formulas
- Cumulative operations (sum, mean, count)
- Rolling window calculations

#### Aggregations
- Group by columns
- Aggregate functions: sum, mean, median, count, min, max, std, variance
- Multi-level grouping
- Custom aggregations

#### Pivot & Unpivot
- Create pivot tables
- Unpivot (melt) from wide to long format

### 4. Data Merging & Joining
- Concatenate datasets vertically or horizontally
- Join types: inner, left, right, outer
- Match on specific columns

### 5. Statistical Analysis
- **Descriptive statistics**: mean, median, mode, std, variance, min, max, range
- **Frequency counts** and distributions
- **Correlation matrix** (Pearson, Spearman, Kendall)
- **Covariance matrix**
- **Quantiles & percentiles**
- **Z-scores**
- **Cross-tabulation** (contingency tables)
- **Summary reports**

### 6. Visualization
- Interactive data table with sorting
- Chart types:
  - Bar chart
  - Line chart
  - Scatter plot
  - Pie chart
  - Histogram
  - Box plot
  - Heatmap (correlation)
- Dynamic updates on data changes
- Export charts as PNG

### 7. AI Assistant 🤖
**NEW!** Intelligent code generation assistant that understands natural language:

**Features**:
- Natural language to Python code conversion
- Context-aware suggestions based on your dataset columns
- Smart pattern matching for common operations
- One-click code execution with "Run it" button
- Automatic code transfer to Code Editor

**Supported operations**:
- Filter data
- Sort and order
- Group and aggregate
- Handle missing values
- Remove duplicates
- Create/remove columns
- Detect outliers
- Type conversions
- Column renaming
- Statistical summaries

**Example interactions**:
```
"remove new_column" → Generates: df.drop(columns=['new_column'])
"filter data where age > 30" → Generates filter code with your columns
"handle missing values" → Generates multiple filling strategies
"sort by salary" → Generates sort code with your column names
```

### 8. Custom Code Editor
Execute custom Python code directly on your dataset:

**Features**:
- Full Python code editor with syntax highlighting
- Direct access to your dataset as `df` variable
- Pandas and NumPy libraries available
- Real-time code execution
- Automatic result preview in Data tab
- Code snippets from AI Assistant

**Available in code environment**:
- `df` - Your current dataset (pandas DataFrame)
- `pd` - Pandas library
- `np` - NumPy library

### 9. Natural Language Queries
Execute data operations using plain English commands:

**Supported patterns**:
```
"filter where age > 30"
"show rows where price < 100"
"select name, age, city"
"sort by salary desc"
"top 10 rows"
"bottom 5 rows"
"group by department and sum salary"
```

The system uses rule-based parsing to understand and execute your queries.

### 10. Data Reset Functionality
**NEW!** Restore your dataset to its original uploaded state:

**Features**:
- One-click reset button in header
- Restores data to original state before any transformations
- Confirmation dialog to prevent accidental resets
- Preserves original data in memory throughout session

### 11. Enhanced Type Conversions
Convert columns to precise data types:

**Integer types**: int8, int16, int32, int64
**Unsigned integers**: uint8, uint16, uint32, uint64
**Float types**: float32, float64
**Other types**: numeric (auto-detect), string, boolean, datetime

### 12. Statistical Transformations
- Log and square root transformations
- Standardization (z-score normalization)
- Min-max normalization
- Ranking and percentiles
- One-hot encoding
- Label encoding
- Binning (discretization)

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd data-analyzer/backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd data-analyzer/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage Guide

### Uploading Data

1. Click on the **Upload** tab
2. Drag and drop a file or click to browse
3. Supported formats: CSV, Excel, JSON, Parquet
4. The system will automatically:
   - Detect file encoding
   - Detect CSV delimiter
   - Parse the data
   - Show preview and metadata

### Viewing Data

1. Navigate to the **Data** tab
2. View dataset information:
   - Total rows and columns
   - Duplicate count
   - Memory usage
3. Browse data in the interactive table
4. Use the Refresh button to reload data after operations

### Cleaning Data

Navigate to the **Clean** tab:

#### Handle Missing Values:
- Click on a strategy button (Drop Rows, Fill with Mean, etc.)
- The operation applies to all columns with the appropriate data type
- View updated missing value counts after operation

#### Remove Duplicates:
- Click "Remove All Duplicates"
- See how many duplicates were removed
- Data table updates automatically

### Transforming Data

Navigate to the **Transform** tab (Note: Advanced transform UI can be extended):

Current implementation supports these operations via API:
- Filter data based on conditions
- Aggregate with group by
- Create pivot tables
- Sort and reorder
- Column transformations

### Analyzing Data

Navigate to the **Analyze** tab:

1. Click "Generate Statistics"
2. View comprehensive statistics for:
   - **Numeric columns**: count, mean, median, mode, std, variance, min, max, quartiles, IQR, skewness, kurtosis
   - **Categorical columns**: count, unique values, most frequent value, frequency count

### Natural Language Queries

Navigate to the **NL Query** tab:

1. Type your query in plain English
2. Examples:
   ```
   filter where age > 30
   show rows where city contains "New York"
   select name, email, phone
   sort by created_date desc
   top 20 rows
   group by category and sum amount
   ```
3. Click Execute or press Enter
4. View results and interpretation
5. New filtered dataset is automatically loaded

### Exporting Data

Click the export buttons in the header:
- **CSV**: Export as comma-separated values
- **Excel**: Export as .xlsx file
- **JSON**: Export as JSON array

Files download automatically to your browser's download folder.

## API Endpoints

### Data Import/Export
- `POST /api/upload` - Upload file
- `GET /api/datasets/{dataset_id}` - Get dataset with pagination
- `GET /api/datasets/{dataset_id}/info` - Get dataset info
- `GET /api/datasets` - List all datasets
- `DELETE /api/datasets/{dataset_id}` - Delete dataset
- `GET /api/export/{dataset_id}/{format}` - Export dataset

### Data Cleaning
- `POST /api/clean/missing` - Handle missing values
- `POST /api/clean/duplicates` - Remove duplicates
- `POST /api/clean/text` - Clean text columns
- `POST /api/clean/outliers` - Detect and handle outliers

### Data Transformation
- `POST /api/transform/filter` - Filter data
- `POST /api/transform/aggregate` - Aggregate with group by
- `POST /api/transform/pivot` - Create pivot table
- `POST /api/transform/columns` - Transform columns

### Data Analysis
- `GET /api/analyze/statistics/{dataset_id}` - Calculate statistics
- `GET /api/analyze/correlation/{dataset_id}` - Calculate correlation
- `GET /api/analyze/summary/{dataset_id}` - Generate summary

### Natural Language
- `POST /api/query/nl` - Execute natural language query

### AI Assistant
- `POST /api/ai/assistant` - Generate Python code from natural language

### Code Execution
- `POST /api/execute/code` - Execute custom Python code on dataset

### Dataset Management
- `POST /api/datasets/{dataset_id}/reset` - Reset dataset to original state
- `POST /api/datasets/delete-rows` - Delete specific rows by indices

## Project Structure

```
data-analyzer/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── api/
│   │   ├── import_data.py     # Data import utilities
│   │   ├── cleaning.py        # Cleaning operations
│   │   ├── transformation.py  # Transformation operations
│   │   ├── analysis.py        # Statistical analysis
│   │   └── export_data.py     # Export utilities
│   └── utils/
│       └── parser.py          # Natural language parser
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Main application component
│       ├── index.css          # Global styles
│       ├── components/
│       │   ├── Button.jsx
│       │   ├── Card.jsx
│       │   └── Input.jsx
│       └── lib/
│           ├── api.js         # API client
│           └── utils.js       # Utility functions
└── README.md
```

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computing
- **SciPy**: Scientific computing
- **scikit-learn**: Machine learning utilities
- **openpyxl**: Excel file handling
- **pyarrow**: Parquet file handling

### Frontend
- **React**: UI library
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Data visualization
- **Axios**: HTTP client
- **Lucide React**: Icon library

## Data Operation Examples

### Example 1: Clean and Analyze Sales Data

1. **Upload** sales.csv
2. **Clean**:
   - Fill missing prices with median
   - Remove duplicate orders
3. **Transform**:
   - Group by product category
   - Calculate sum of sales
4. **Analyze**:
   - Generate statistics
   - View correlation between price and quantity
5. **Export** as Excel

### Example 2: Filter Customer Data

1. **Upload** customers.json
2. **NL Query**: "filter where age > 25 and city contains Chicago"
3. **View** filtered results
4. **Export** as CSV

### Example 3: Pivot Transaction Data

1. **Upload** transactions.xlsx
2. **Transform**:
   - Create pivot table: Index=Month, Columns=Product, Values=Revenue
3. **Visualize** with bar chart
4. **Export** as JSON

## Advanced Features

### Session Persistence
- Datasets are stored in memory during the session
- Current dataset ID is saved to localStorage
- Automatically loads last dataset on page refresh

### Error Handling
- Comprehensive error messages
- Visual feedback for operations
- API error details displayed to user

### Performance Optimization
- Pagination for large datasets
- Efficient data operations with Pandas
- Minimal re-renders with React hooks

## Troubleshooting

### Backend Issues

**Port already in use**:
```bash
# Change port in main.py
uvicorn.run(app, host="0.0.0.0", port=8001)
```

**Module not found**:
```bash
pip install -r requirements.txt
```

### Frontend Issues

**Dependencies not installed**:
```bash
npm install
```

**Port already in use**:
```bash
# Change port in vite.config.js
server: {
  port: 3001
}
```

**API connection errors**:
- Ensure backend is running on port 8000
- Check proxy configuration in vite.config.js

## Future Enhancements

Potential additions:
- **Advanced visualizations**: 3D plots, geographic maps
- **Machine learning**: Predictive modeling, clustering
- **Real-time collaboration**: Multi-user editing
- **Data versioning**: Track changes over time
- **SQL query builder**: Visual query interface
- **Scheduled operations**: Automated data processing
- **Cloud storage integration**: S3, Google Drive
- **API authentication**: User accounts and permissions

## Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available for educational and commercial use.

## Support

For issues, questions, or contributions:
- Create an issue on the repository
- Check the API documentation at `/docs`
- Review the code comments for implementation details

---

Built with React, FastAPI, and Pandas. Designed for comprehensive data manipulation and analysis.
