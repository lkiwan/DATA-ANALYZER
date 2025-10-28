from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import pandas as pd
import numpy as np
import io
import json
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import chardet
import signal
from contextlib import redirect_stdout, redirect_stderr

from api.import_data import detect_delimiter, detect_encoding, import_dataframe
from api.cleaning import (
    handle_missing_values, remove_duplicates, clean_text, detect_outliers
)
from api.transformation import (
    transform_columns, filter_data, aggregate_data, pivot_data
)
from api.analysis import (
    calculate_statistics, calculate_correlation, generate_summary
)
from api.export_data import export_to_format
from utils.parser import parse_natural_language_query

app = FastAPI(title="Data Analyzer API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for datasets (session-based)
datasets: Dict[str, pd.DataFrame] = {}
original_datasets: Dict[str, pd.DataFrame] = {}  # Store original unmodified datasets
dataset_metadata: Dict[str, Dict[str, Any]] = {}

# Pydantic models for request bodies
class MissingValueConfig(BaseModel):
    dataset_id: str
    strategy: str  # mean, median, mode, constant, ffill, bfill, interpolate
    columns: Optional[List[str]] = None
    constant_value: Optional[Any] = None

class DuplicateConfig(BaseModel):
    dataset_id: str
    keep: str = "first"  # first, last, False
    columns: Optional[List[str]] = None

class TextCleanConfig(BaseModel):
    dataset_id: str
    columns: List[str]
    operation: str  # trim, upper, lower, title, replace, regex, split
    value: Optional[str] = None
    replacement: Optional[str] = None

class OutlierConfig(BaseModel):
    dataset_id: str
    method: str  # iqr, zscore
    columns: List[str]
    action: str  # remove, cap

class FilterConfig(BaseModel):
    dataset_id: str
    conditions: List[Dict[str, Any]]  # [{column, operator, value}]

class AggregateConfig(BaseModel):
    dataset_id: str
    group_by: List[str]
    aggregations: Dict[str, List[str]]  # {column: [functions]}

class PivotConfig(BaseModel):
    dataset_id: str
    index: str
    columns: str
    values: str
    aggfunc: str = "sum"

class TransformConfig(BaseModel):
    dataset_id: str
    operation: str  # rename, drop, add, reorder, cast
    params: Dict[str, Any]

class NLQueryConfig(BaseModel):
    dataset_id: str
    query: str

class CodeExecutionConfig(BaseModel):
    dataset_id: str
    code: str
    language: str  # 'python' or 'r'

# Health check
@app.get("/")
async def root():
    return {"message": "Data Analyzer API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Import endpoints
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and parse a data file"""
    try:
        contents = await file.read()

        # Detect file type and parse
        file_ext = file.filename.split('.')[-1].lower()

        if file_ext == 'csv':
            # Detect encoding
            encoding = detect_encoding(contents)
            # Detect delimiter
            delimiter = detect_delimiter(contents.decode(encoding))
            # Parse CSV
            df = pd.read_csv(io.BytesIO(contents), encoding=encoding, delimiter=delimiter)

        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(io.BytesIO(contents))

        elif file_ext == 'json':
            df = pd.read_json(io.BytesIO(contents))

        elif file_ext == 'parquet':
            df = pd.read_parquet(io.BytesIO(contents))

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {file_ext}")

        # Generate dataset ID
        dataset_id = f"dataset_{len(datasets)}"
        datasets[dataset_id] = df
        original_datasets[dataset_id] = df.copy()  # Store original copy
        dataset_metadata[dataset_id] = {"file_type": file_ext}

        # Convert NaN to None for JSON serialization
        preview_df = df.head(10).replace({np.nan: None})

        # Return preview and metadata
        return {
            "dataset_id": dataset_id,
            "filename": file.filename,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "preview": preview_df.to_dict(orient='records'),
            "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/datasets/{dataset_id}")
async def get_dataset(dataset_id: str, limit: int = 100, offset: int = 0):
    """Get dataset with pagination"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]
    total = len(df)

    # Apply pagination and convert NaN to None
    data_df = df.iloc[offset:offset+limit].replace({np.nan: None})
    data = data_df.to_dict(orient='records')

    return {
        "dataset_id": dataset_id,
        "total_rows": total,
        "columns": df.columns.tolist(),
        "data": data,
        "offset": offset,
        "limit": limit
    }

@app.get("/api/datasets/{dataset_id}/info")
async def get_dataset_info(dataset_id: str):
    """Get detailed dataset information"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]
    metadata = dataset_metadata.get(dataset_id, {})

    # Convert numpy types to Python native types for JSON serialization
    return {
        "dataset_id": dataset_id,
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "file_type": metadata.get("file_type", "unknown"),
        "column_names": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "missing_values": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
        "memory_usage": int(df.memory_usage(deep=True).sum()),
        "duplicate_rows": int(df.duplicated().sum()),
    }

@app.post("/api/datasets/{dataset_id}/reset")
async def reset_dataset(dataset_id: str):
    """Reset dataset to original uploaded state"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset_id not in original_datasets:
        raise HTTPException(status_code=404, detail="Original dataset not found")

    # Restore the original dataset
    datasets[dataset_id] = original_datasets[dataset_id].copy()

    return {
        "success": True,
        "message": "Dataset reset to original state",
        "rows": int(datasets[dataset_id].shape[0]),
        "columns": int(datasets[dataset_id].shape[1])
    }

# Cleaning endpoints
@app.post("/api/clean/missing")
async def handle_missing(config: MissingValueConfig):
    """Handle missing values"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = handle_missing_values(df, config.strategy, config.columns, config.constant_value)
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "message": f"Applied {config.strategy} strategy",
        "missing_values": df.isnull().sum().to_dict()
    }

@app.post("/api/clean/duplicates")
async def remove_dupes(config: DuplicateConfig):
    """Remove duplicate rows"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    original_len = len(df)
    df = remove_duplicates(df, config.keep, config.columns)
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "removed": original_len - len(df),
        "remaining_rows": len(df)
    }

@app.post("/api/clean/text")
async def clean_text_data(config: TextCleanConfig):
    """Clean text columns"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = clean_text(df, config.columns, config.operation, config.value, config.replacement)
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "message": f"Applied {config.operation} to {len(config.columns)} columns"
    }

@app.post("/api/clean/outliers")
async def handle_outliers(config: OutlierConfig):
    """Detect and handle outliers"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    outlier_info = detect_outliers(df, config.method, config.columns, config.action)
    datasets[config.dataset_id] = outlier_info["dataframe"]

    return {
        "success": True,
        "outliers_found": outlier_info["outliers_found"],
        "action": config.action
    }

# Transformation endpoints
@app.post("/api/transform/filter")
async def filter_dataset(config: FilterConfig):
    """Filter dataset based on conditions"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = filter_data(df, config.conditions)

    # Update the dataset in place
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "dataset_id": config.dataset_id,
        "rows": len(df)
    }

@app.post("/api/transform/aggregate")
async def aggregate_dataset(config: AggregateConfig):
    """Aggregate data with group by"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = aggregate_data(df, config.group_by, config.aggregations)

    # Update the dataset in place
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "dataset_id": config.dataset_id,
        "rows": len(df),
        "columns": df.columns.tolist()
    }

@app.post("/api/transform/pivot")
async def pivot_dataset(config: PivotConfig):
    """Create pivot table"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = pivot_data(df, config.index, config.columns, config.values, config.aggfunc)

    # Update the dataset in place
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "dataset_id": config.dataset_id,
        "shape": df.shape
    }

@app.post("/api/transform/columns")
async def transform_columns_endpoint(config: TransformConfig):
    """Transform columns (rename, drop, add, reorder, cast)"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    df = transform_columns(df, config.operation, config.params)
    datasets[config.dataset_id] = df

    return {
        "success": True,
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict()
    }

# Analysis endpoints
@app.get("/api/analyze/statistics/{dataset_id}")
async def get_statistics(dataset_id: str, columns: Optional[str] = None):
    """Calculate descriptive statistics"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]
    cols = columns.split(',') if columns else None

    stats = calculate_statistics(df, cols)
    return stats

@app.get("/api/analyze/correlation/{dataset_id}")
async def get_correlation(dataset_id: str):
    """Calculate correlation matrix"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]
    corr = calculate_correlation(df)
    return corr

@app.get("/api/analyze/summary/{dataset_id}")
async def get_summary(dataset_id: str):
    """Generate comprehensive summary"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]
    summary = generate_summary(df)
    return summary

# Natural Language Query
@app.post("/api/query/nl")
async def natural_language_query(config: NLQueryConfig):
    """Execute natural language query"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id]
    result = parse_natural_language_query(df, config.query)

    if result["success"]:
        # Update the dataset in place
        datasets[config.dataset_id] = result["dataframe"]

        return {
            "success": True,
            "dataset_id": config.dataset_id,
            "rows": len(result["dataframe"]),
            "query": config.query,
            "interpretation": result["interpretation"]
        }
    else:
        return {
            "success": False,
            "error": result["error"]
        }

# Custom Code Execution
@app.post("/api/execute/code")
async def execute_custom_code(config: CodeExecutionConfig):
    """Execute custom Python code on the dataset"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if config.language.lower() != 'python':
        raise HTTPException(status_code=400, detail="Only Python is supported")

    df = datasets[config.dataset_id].copy()

    try:
        # Create safe execution environment
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()

        # Safe namespace with only necessary modules
        safe_globals = {
            'pd': pd,
            'np': np,
            'df': df,
            '__builtins__': {
                'print': print,
                'len': len,
                'range': range,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'sum': sum,
                'min': min,
                'max': max,
                'abs': abs,
                'round': round,
                'int': int,
                'float': float,
                'str': str,
                'bool': bool,
                'list': list,
                'dict': dict,
                'set': set,
                'tuple': tuple,
            }
        }

        # Execute code with timeout and capture output
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            exec(config.code, safe_globals)

        # Get the modified dataframe if it exists
        modified_df = safe_globals.get('df', df)

        # Validate that df is still a DataFrame
        if not isinstance(modified_df, pd.DataFrame):
            raise Exception("The variable 'df' must remain a pandas DataFrame")

        # Update the dataset
        datasets[config.dataset_id] = modified_df

        output = stdout_capture.getvalue()
        errors = stderr_capture.getvalue()

        return {
            "success": True,
            "dataset_id": config.dataset_id,
            "rows": len(modified_df),
            "columns": len(modified_df.columns),
            "output": output if output else "Code executed successfully",
            "errors": errors if errors else None
        }

    except SyntaxError as e:
        return {
            "success": False,
            "error": f"Syntax Error: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Execution Error: {str(e)}"
        }

# Export endpoints
@app.get("/api/export/{dataset_id}/{format}")
async def export_dataset(dataset_id: str, format: str):
    """Export dataset in specified format"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[dataset_id]

    try:
        output = export_to_format(df, format)

        media_types = {
            'csv': 'text/csv',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'parquet': 'application/octet-stream'
        }

        return StreamingResponse(
            output,
            media_type=media_types.get(format, 'application/octet-stream'),
            headers={
                'Content-Disposition': f'attachment; filename="{dataset_id}.{format}"'
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Dataset management
@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    if dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    del datasets[dataset_id]
    return {"success": True, "message": "Dataset deleted"}

@app.get("/api/datasets")
async def list_datasets():
    """List all datasets"""
    result = []
    for dataset_id, df in datasets.items():
        result.append({
            "dataset_id": dataset_id,
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage": df.memory_usage(deep=True).sum()
        })
    return result

class DeleteRowsConfig(BaseModel):
    dataset_id: str
    row_indices: List[int]

@app.post("/api/datasets/delete-rows")
async def delete_rows(config: DeleteRowsConfig):
    """Delete specific rows by their indices"""
    if config.dataset_id not in datasets:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = datasets[config.dataset_id].copy()
    original_len = len(df)

    # Remove rows at specified indices
    df = df.drop(df.index[config.row_indices])
    df = df.reset_index(drop=True)

    datasets[config.dataset_id] = df

    return {
        "success": True,
        "deleted": len(config.row_indices),
        "remaining_rows": len(df),
        "message": f"Deleted {len(config.row_indices)} row(s)"
    }

# AI Assistant Model
class AIAssistantRequest(BaseModel):
    message: str
    dataset_id: Optional[str] = None

@app.post("/api/ai/assistant")
async def ai_assistant(request: AIAssistantRequest):
    """AI Assistant that generates code based on user intent"""
    message = request.message.lower()
    dataset_id = request.dataset_id
    
    # Get dataset info if available
    columns = []
    if dataset_id and dataset_id in datasets:
        columns = datasets[dataset_id].columns.tolist()
    
    # Generate response based on keywords and intent
    response_text = ""
    code = ""
    
    # Pattern matching for common requests
    if "filter" in message or "where" in message or "select" in message:
        col = columns[0] if columns else "column_name"
        response_text = "I can help you filter your data. Here's a code example:"
        code = f"""# Filter rows based on condition
# Modify the condition to match your needs
df_filtered = df[df['{col}'] > 100]
print(f"Filtered to {{len(df_filtered)}} rows")
print(df_filtered.head())"""
    
    elif "sort" in message or "order" in message:
        col = columns[0] if columns else "column_name"
        response_text = "Here's how to sort your data:"
        code = f"""# Sort data by column
df_sorted = df.sort_values(by='{col}', ascending=True)
print(df_sorted.head())"""
    
    elif "group" in message or "aggregate" in message:
        col1 = columns[0] if len(columns) > 0 else "category_column"
        col2 = columns[1] if len(columns) > 1 else "value_column"
        response_text = "Here's how to group and aggregate your data:"
        code = f"""# Group by and calculate aggregations
grouped = df.groupby('{col1}')['{col2}'].agg(['sum', 'mean', 'count'])
print(grouped)"""
    
    elif "missing" in message or "null" in message or "nan" in message:
        response_text = "Here's how to handle missing values:"
        code = """# Handle missing values
# Option 1: Drop rows with any missing values
df_clean = df.dropna()

# Option 2: Fill with mean (for numeric columns)
df_filled = df.fillna(df.mean(numeric_only=True))

# Option 3: Fill with a specific value
df_filled = df.fillna(0)

print(f"Original rows: {len(df)}, After cleaning: {len(df_clean)}")"""
    
    elif "duplicate" in message:
        response_text = "Here's how to handle duplicates:"
        code = """# Remove duplicate rows
df_unique = df.drop_duplicates()
print(f"Removed {len(df) - len(df_unique)} duplicate rows")
print(df_unique.head())"""

    elif ("remove" in message or "drop" in message or "delete" in message) and "column" in message:
        # Extract column name from message
        col_to_remove = None

        # First try to find column name from dataset columns
        for col in columns:
            if col.lower() in message.lower():
                col_to_remove = col
                break

        # If not found in dataset, try to extract from message pattern
        if not col_to_remove:
            # Look for patterns like "remove column_name" or "drop new_column"
            words = message.split()
            for i, word in enumerate(words):
                if word in ["remove", "drop", "delete"] and i + 1 < len(words):
                    potential_col = words[i + 1].strip('.,!?')
                    if potential_col != "column":
                        col_to_remove = potential_col
                        break

        if col_to_remove:
            response_text = f"Here's how to remove the '{col_to_remove}' column:"
            code = f"""# Drop the column
df = df.drop(columns=['{col_to_remove}'])
print(f"Removed column '{col_to_remove}'")
print("Remaining columns:", df.columns.tolist())
print(df.head())"""
        else:
            col = columns[0] if columns else "column_name"
            response_text = "Here's how to remove a column:"
            code = f"""# Drop single column
df = df.drop(columns=['{col}'])

# Or drop multiple columns
df = df.drop(columns=['col1', 'col2'])

print("Remaining columns:", df.columns.tolist())
print(df.head())"""

    elif "column" in message and ("add" in message or "create" in message):
        col1 = columns[0] if len(columns) > 0 else "column1"
        col2 = columns[1] if len(columns) > 1 else "column2"
        response_text = "Here's how to create a new column:"
        code = f"""# Create a new calculated column
df['new_column'] = df['{col1}'] + df['{col2}']
# Or apply a function
df['new_column'] = df['{col1}'].apply(lambda x: x * 2)
print(df[['{ col1}', '{col2}', 'new_column']].head())"""
    
    elif "statistic" in message or "summary" in message or "describe" in message:
        response_text = "Here's how to get statistical summary:"
        code = """# Get descriptive statistics
print(df.describe())

# For specific columns
print(df[['column1', 'column2']].describe())

# Count unique values
print(df['column_name'].value_counts())"""
    
    elif "visualiz" in message or "plot" in message or "chart" in message:
        col = columns[0] if columns else "column_name"
        response_text = "Note: Visualization requires matplotlib. Here's basic stats instead:"
        code = f"""# Get distribution information
print(df['{col}'].describe())
print(f"\\nValue counts:")
print(df['{col}'].value_counts().head(10))"""
    
    elif "merge" in message or "join" in message:
        response_text = "Here's how to merge datasets:"
        code = """# Merge two dataframes
# Note: You need to have df2 loaded
# df_merged = pd.merge(df, df2, on='common_column', how='inner')
# print(df_merged.head())

# For now, here's how to concat rows
# df_combined = pd.concat([df, df2], ignore_index=True)
print("Merge requires two datasets loaded")"""
    
    elif "export" in message or "save" in message:
        response_text = "Here's how to export your data:"
        code = """# Export to CSV
# df.to_csv('output.csv', index=False)

# Export to Excel
# df.to_excel('output.xlsx', index=False)

print("Use the Export button in the UI to download data")"""
    
    elif "column" in message and ("rename" in message):
        col = columns[0] if columns else "old_column"
        response_text = "Here's how to rename columns:"
        code = f"""# Rename columns
df = df.rename(columns={{'{col}': 'new_name'}})

# Rename multiple columns
df = df.rename(columns={{
    'old_name1': 'new_name1',
    'old_name2': 'new_name2'
}})
print(df.columns.tolist())"""
    
    elif "outlier" in message:
        col = columns[0] if columns else "numeric_column"
        response_text = "Here's how to detect and remove outliers:"
        code = f"""# Remove outliers using IQR method
Q1 = df['{col}'].quantile(0.25)
Q3 = df['{col}'].quantile(0.75)
IQR = Q3 - Q1
df_no_outliers = df[(df['{col}'] >= Q1 - 1.5*IQR) & (df['{col}'] <= Q3 + 1.5*IQR)]
print(f"Removed {{len(df) - len(df_no_outliers)}} outliers")"""
    
    elif "convert" in message or "type" in message:
        col = columns[0] if columns else "column_name"
        response_text = "Here's how to convert column types:"
        code = f"""# Convert column types
df['{col}'] = pd.to_numeric(df['{col}'], errors='coerce')  # To numeric
df['{col}'] = df['{col}'].astype(str)  # To string
df['{col}'] = pd.to_datetime(df['{col}'], errors='coerce')  # To datetime
print(df.dtypes)"""
    
    else:
        # Default response with available columns
        col_list = ", ".join(columns[:5]) if columns else "column1, column2"
        response_text = f"I can help you with data manipulation! Your dataset has columns: {col_list}. Try asking about filtering, sorting, grouping, or handling missing values."
        code = f"""# Explore your data
print("Dataset shape:", df.shape)
print("\\nColumn names:", df.columns.tolist())
print("\\nFirst few rows:")
print(df.head())
print("\\nData types:")
print(df.dtypes)
print("\\nMissing values:")
print(df.isnull().sum())"""
    
    return {
        "success": True,
        "message": response_text,
        "code": code,
        "columns": columns
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
