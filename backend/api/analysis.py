import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
from scipy import stats

def calculate_statistics(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Calculate descriptive statistics"""
    target_cols = columns if columns else df.select_dtypes(include=[np.number]).columns.tolist()

    stats_dict = {}

    for col in target_cols:
        if col not in df.columns:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            col_data = df[col].dropna()

            if len(col_data) > 0:
                stats_dict[col] = {
                    'count': int(len(col_data)),
                    'mean': float(col_data.mean()),
                    'median': float(col_data.median()),
                    'mode': float(col_data.mode()[0]) if not col_data.mode().empty else None,
                    'std': float(col_data.std()),
                    'var': float(col_data.var()),
                    'min': float(col_data.min()),
                    'max': float(col_data.max()),
                    'range': float(col_data.max() - col_data.min()),
                    'q25': float(col_data.quantile(0.25)),
                    'q50': float(col_data.quantile(0.50)),
                    'q75': float(col_data.quantile(0.75)),
                    'iqr': float(col_data.quantile(0.75) - col_data.quantile(0.25)),
                    'skewness': float(col_data.skew()),
                    'kurtosis': float(col_data.kurtosis()),
                }
        else:
            # Categorical statistics
            col_data = df[col].dropna()
            value_counts = col_data.value_counts()

            stats_dict[col] = {
                'count': int(len(col_data)),
                'unique': int(col_data.nunique()),
                'top': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                'freq': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
                'missing': int(df[col].isnull().sum()),
            }

    return stats_dict

def calculate_correlation(
    df: pd.DataFrame,
    method: str = 'pearson'
) -> Dict[str, Any]:
    """Calculate correlation matrix"""
    numeric_df = df.select_dtypes(include=[np.number])

    if numeric_df.empty:
        return {"error": "No numeric columns found"}

    corr_matrix = numeric_df.corr(method=method)

    return {
        'correlation_matrix': corr_matrix.to_dict(),
        'columns': corr_matrix.columns.tolist()
    }

def calculate_covariance(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate covariance matrix"""
    numeric_df = df.select_dtypes(include=[np.number])

    if numeric_df.empty:
        return {"error": "No numeric columns found"}

    cov_matrix = numeric_df.cov()

    return {
        'covariance_matrix': cov_matrix.to_dict(),
        'columns': cov_matrix.columns.tolist()
    }

def generate_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Generate comprehensive data summary"""
    summary = {
        'shape': {
            'rows': int(df.shape[0]),
            'columns': int(df.shape[1])
        },
        'columns': df.columns.tolist(),
        'dtypes': df.dtypes.astype(str).to_dict(),
        'missing_values': df.isnull().sum().to_dict(),
        'missing_percentage': (df.isnull().sum() / len(df) * 100).to_dict(),
        'duplicate_rows': int(df.duplicated().sum()),
        'memory_usage': int(df.memory_usage(deep=True).sum()),
    }

    # Numeric column summary
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if numeric_cols:
        summary['numeric_summary'] = df[numeric_cols].describe().to_dict()

    # Categorical column summary
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if categorical_cols:
        cat_summary = {}
        for col in categorical_cols:
            value_counts = df[col].value_counts()
            cat_summary[col] = {
                'unique_values': int(df[col].nunique()),
                'top_values': value_counts.head(10).to_dict(),
                'most_common': str(value_counts.index[0]) if len(value_counts) > 0 else None,
                'most_common_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0
            }
        summary['categorical_summary'] = cat_summary

    return summary

def calculate_frequency(
    df: pd.DataFrame,
    column: str,
    top_n: Optional[int] = None
) -> Dict[str, Any]:
    """Calculate frequency distribution"""
    if column not in df.columns:
        return {"error": f"Column {column} not found"}

    value_counts = df[column].value_counts()

    if top_n:
        value_counts = value_counts.head(top_n)

    return {
        'column': column,
        'frequencies': value_counts.to_dict(),
        'relative_frequencies': (value_counts / len(df)).to_dict()
    }

def calculate_percentiles(
    df: pd.DataFrame,
    column: str,
    percentiles: List[float] = [0.1, 0.25, 0.5, 0.75, 0.9]
) -> Dict[str, Any]:
    """Calculate percentiles for a column"""
    if column not in df.columns:
        return {"error": f"Column {column} not found"}

    if not pd.api.types.is_numeric_dtype(df[column]):
        return {"error": f"Column {column} is not numeric"}

    result = {}
    for p in percentiles:
        result[f'p{int(p*100)}'] = float(df[column].quantile(p))

    return result

def calculate_zscore(
    df: pd.DataFrame,
    column: str
) -> pd.Series:
    """Calculate z-scores for a column"""
    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
        return pd.Series()

    mean = df[column].mean()
    std = df[column].std()

    if std == 0:
        return pd.Series(0, index=df.index)

    return (df[column] - mean) / std

def cross_tabulation(
    df: pd.DataFrame,
    index_col: str,
    column_col: str,
    values_col: Optional[str] = None,
    aggfunc: str = 'count'
) -> Dict[str, Any]:
    """Create cross-tabulation (contingency table)"""
    if index_col not in df.columns or column_col not in df.columns:
        return {"error": "Invalid column names"}

    if values_col:
        result = pd.crosstab(
            df[index_col],
            df[column_col],
            values=df[values_col] if values_col in df.columns else None,
            aggfunc=aggfunc
        )
    else:
        result = pd.crosstab(df[index_col], df[column_col])

    return {
        'crosstab': result.to_dict(),
        'index_name': index_col,
        'column_name': column_col
    }
