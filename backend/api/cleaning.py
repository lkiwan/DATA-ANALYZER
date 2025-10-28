import pandas as pd
import numpy as np
from typing import List, Optional, Any, Dict
from scipy import stats

def handle_missing_values(
    df: pd.DataFrame,
    strategy: str,
    columns: Optional[List[str]] = None,
    constant_value: Optional[Any] = None
) -> pd.DataFrame:
    """Handle missing values in dataframe"""
    df = df.copy()
    target_cols = columns if columns else df.columns.tolist()

    for col in target_cols:
        if col not in df.columns:
            continue

        if strategy == 'drop_rows':
            df = df.dropna(subset=[col])

        elif strategy == 'drop_columns':
            df = df.drop(columns=[col])

        elif strategy == 'mean':
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].fillna(df[col].mean(), inplace=True)

        elif strategy == 'median':
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].fillna(df[col].median(), inplace=True)

        elif strategy == 'mode':
            if not df[col].mode().empty:
                df[col].fillna(df[col].mode()[0], inplace=True)

        elif strategy == 'constant':
            df[col].fillna(constant_value, inplace=True)

        elif strategy == 'ffill':
            df[col].fillna(method='ffill', inplace=True)

        elif strategy == 'bfill':
            df[col].fillna(method='bfill', inplace=True)

        elif strategy == 'interpolate':
            if pd.api.types.is_numeric_dtype(df[col]):
                df[col].interpolate(inplace=True)

    return df

def remove_duplicates(
    df: pd.DataFrame,
    keep: str = 'first',
    columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """Remove duplicate rows"""
    df = df.copy()

    keep_param = keep if keep != 'False' else False
    subset = columns if columns else None

    df = df.drop_duplicates(subset=subset, keep=keep_param)
    return df.reset_index(drop=True)

def clean_text(
    df: pd.DataFrame,
    columns: List[str],
    operation: str,
    value: Optional[str] = None,
    replacement: Optional[str] = None
) -> pd.DataFrame:
    """Clean text columns"""
    df = df.copy()

    for col in columns:
        if col not in df.columns:
            continue

        # Convert to string if not already
        df[col] = df[col].astype(str)

        if operation == 'trim':
            df[col] = df[col].str.strip()

        elif operation == 'upper':
            df[col] = df[col].str.upper()

        elif operation == 'lower':
            df[col] = df[col].str.lower()

        elif operation == 'title':
            df[col] = df[col].str.title()

        elif operation == 'replace' and value is not None:
            df[col] = df[col].str.replace(value, replacement or '', regex=False)

        elif operation == 'regex' and value is not None:
            df[col] = df[col].str.replace(value, replacement or '', regex=True)

        elif operation == 'remove_numbers':
            df[col] = df[col].str.replace(r'\d+', '', regex=True)

        elif operation == 'remove_punctuation':
            df[col] = df[col].str.replace(r'[^\w\s]', '', regex=True)

    return df

def detect_outliers(
    df: pd.DataFrame,
    method: str,
    columns: List[str],
    action: str = 'remove'
) -> Dict:
    """Detect and handle outliers"""
    df = df.copy()
    outliers_found = {}

    for col in columns:
        if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
            continue

        if method == 'iqr':
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)

        elif method == 'zscore':
            z_scores = np.abs(stats.zscore(df[col].dropna()))
            outlier_mask = pd.Series(False, index=df.index)
            outlier_mask.loc[df[col].notna()] = z_scores > 3

        else:
            continue

        outliers_found[col] = int(outlier_mask.sum())

        if action == 'remove':
            df = df[~outlier_mask]

        elif action == 'cap':
            if method == 'iqr':
                df.loc[df[col] < lower_bound, col] = lower_bound
                df.loc[df[col] > upper_bound, col] = upper_bound

    return {
        "dataframe": df.reset_index(drop=True),
        "outliers_found": outliers_found
    }

def convert_data_types(
    df: pd.DataFrame,
    conversions: Dict[str, str]
) -> pd.DataFrame:
    """Convert column data types"""
    df = df.copy()

    for col, dtype in conversions.items():
        if col not in df.columns:
            continue

        try:
            if dtype == 'int':
                df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
            elif dtype == 'float':
                df[col] = pd.to_numeric(df[col], errors='coerce')
            elif dtype == 'string':
                df[col] = df[col].astype(str)
            elif dtype == 'datetime':
                df[col] = pd.to_datetime(df[col], errors='coerce')
            elif dtype == 'bool':
                df[col] = df[col].astype(bool)
            elif dtype == 'category':
                df[col] = df[col].astype('category')
        except Exception as e:
            print(f"Error converting {col} to {dtype}: {e}")

    return df
