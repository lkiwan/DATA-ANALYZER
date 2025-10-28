import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

def transform_columns(
    df: pd.DataFrame,
    operation: str,
    params: Dict[str, Any]
) -> pd.DataFrame:
    """Transform columns (rename, drop, add, reorder, cast)"""
    df = df.copy()

    if operation == 'rename':
        # params: {"columns": {"old_name": "new_name"}}
        columns_map = params.get('columns', params)
        if isinstance(columns_map, dict):
            df = df.rename(columns=columns_map)

    elif operation == 'drop':
        # params: {"columns": ["col1", "col2"]}
        columns_to_drop = params.get('columns', [])
        df = df.drop(columns=columns_to_drop, errors='ignore')

    elif operation == 'add':
        # params: {"column": "new_col", "value": default_value or expression}
        col_name = params.get('column')
        value = params.get('value', None)
        if col_name:
            df[col_name] = value

    elif operation == 'reorder':
        # params: {"columns": ["col1", "col2", ...]}
        new_order = params.get('columns', [])
        # Keep only columns that exist
        new_order = [col for col in new_order if col in df.columns]
        # Add any missing columns at the end
        remaining = [col for col in df.columns if col not in new_order]
        df = df[new_order + remaining]

    elif operation == 'cast':
        # params: {"column": "col1", "dtype": "int"}
        col_name = params.get('column')
        dtype = params.get('dtype')
        if col_name and dtype and col_name in df.columns:
            try:
                if dtype == 'int':
                    # Handle European decimal format (comma as decimal separator)
                    if df[col_name].dtype == 'object':
                        df[col_name] = df[col_name].astype(str).str.replace(',', '.', regex=False)
                    df[col_name] = pd.to_numeric(df[col_name], errors='coerce').astype('Int64')
                elif dtype == 'float':
                    # Handle European decimal format (comma as decimal separator)
                    if df[col_name].dtype == 'object':
                        df[col_name] = df[col_name].astype(str).str.replace(',', '.', regex=False)
                    df[col_name] = pd.to_numeric(df[col_name], errors='coerce')
                elif dtype == 'string':
                    df[col_name] = df[col_name].astype(str)
                elif dtype == 'datetime':
                    df[col_name] = pd.to_datetime(df[col_name], errors='coerce')
                elif dtype == 'bool':
                    df[col_name] = df[col_name].astype(bool)
            except Exception as e:
                print(f"Error casting {col_name} to {dtype}: {e}")

    elif operation == 'calculate':
        # params: {"column": "new_col", "expression": "col1 + col2"}
        col_name = params.get('column')
        expression = params.get('expression')
        if col_name and expression:
            try:
                df[col_name] = df.eval(expression)
            except Exception as e:
                print(f"Error evaluating expression: {e}")

    elif operation == 'sort':
        # params: {"column": "col1", "ascending": True} or {"columns": ["col1", "col2"], "ascending": [True, False]}
        column = params.get('column')
        columns = params.get('columns')
        ascending = params.get('ascending', True)

        if column:
            # Single column sort
            if column in df.columns:
                df = df.sort_values(by=column, ascending=ascending).reset_index(drop=True)
        elif columns:
            # Multiple columns sort
            valid_columns = [col for col in columns if col in df.columns]
            if valid_columns:
                df = df.sort_values(by=valid_columns, ascending=ascending).reset_index(drop=True)

    return df

def filter_data(
    df: pd.DataFrame,
    conditions: List[Dict[str, Any]]
) -> pd.DataFrame:
    """Filter data based on conditions"""
    df = df.copy()

    for condition in conditions:
        column = condition.get('column')
        operator = condition.get('operator')
        value = condition.get('value')

        if column not in df.columns:
            continue

        try:
            # Convert value to appropriate type if column is numeric
            if pd.api.types.is_numeric_dtype(df[column]):
                try:
                    value = pd.to_numeric(value)
                except (ValueError, TypeError):
                    pass  # Keep original value if conversion fails

            if operator == 'equals' or operator == '==':
                df = df[df[column] == value]
            elif operator == 'not_equals' or operator == '!=':
                df = df[df[column] != value]
            elif operator == 'greater_than' or operator == '>':
                df = df[df[column] > value]
            elif operator == 'less_than' or operator == '<':
                df = df[df[column] < value]
            elif operator == 'greater_equal' or operator == '>=':
                df = df[df[column] >= value]
            elif operator == 'less_equal' or operator == '<=':
                df = df[df[column] <= value]
            elif operator == 'contains':
                df = df[df[column].astype(str).str.contains(str(value), na=False)]
            elif operator == 'not_contains':
                df = df[~df[column].astype(str).str.contains(str(value), na=False)]
            elif operator == 'starts_with':
                df = df[df[column].astype(str).str.startswith(str(value), na=False)]
            elif operator == 'ends_with':
                df = df[df[column].astype(str).str.endswith(str(value), na=False)]
            elif operator == 'is_null':
                df = df[df[column].isnull()]
            elif operator == 'not_null':
                df = df[df[column].notnull()]
            elif operator == 'in':
                if isinstance(value, list):
                    df = df[df[column].isin(value)]
            elif operator == 'not_in':
                if isinstance(value, list):
                    df = df[~df[column].isin(value)]
        except Exception as e:
            print(f"Error applying filter on {column}: {e}")

    return df.reset_index(drop=True)

def sort_data(
    df: pd.DataFrame,
    columns: List[str],
    ascending: bool = True
) -> pd.DataFrame:
    """Sort data by columns"""
    df = df.copy()

    # Filter to only existing columns
    valid_columns = [col for col in columns if col in df.columns]

    if valid_columns:
        df = df.sort_values(by=valid_columns, ascending=ascending)

    return df.reset_index(drop=True)

def aggregate_data(
    df: pd.DataFrame,
    group_by: List[str],
    aggregations: Dict[str, List[str]]
) -> pd.DataFrame:
    """Aggregate data with group by"""
    df = df.copy()

    # Filter to existing columns
    valid_group_by = [col for col in group_by if col in df.columns]

    if not valid_group_by:
        return df

    # Build aggregation dictionary
    agg_dict = {}
    for col, funcs in aggregations.items():
        if col in df.columns:
            agg_dict[col] = funcs

    if not agg_dict:
        return df

    # Perform aggregation
    result = df.groupby(valid_group_by).agg(agg_dict)

    # Flatten column names if multi-level
    if isinstance(result.columns, pd.MultiIndex):
        result.columns = ['_'.join(col).strip('_') for col in result.columns.values]

    return result.reset_index()

def pivot_data(
    df: pd.DataFrame,
    index: str,
    columns: str,
    values: str,
    aggfunc: str = 'sum'
) -> pd.DataFrame:
    """Create pivot table"""
    df = df.copy()

    if index not in df.columns or columns not in df.columns or values not in df.columns:
        raise ValueError("Invalid column names for pivot")

    # Map aggfunc string to function
    agg_map = {
        'sum': 'sum',
        'mean': 'mean',
        'median': 'median',
        'count': 'count',
        'min': 'min',
        'max': 'max',
        'std': 'std',
        'var': 'var'
    }

    aggfunc = agg_map.get(aggfunc, 'sum')

    pivot_df = pd.pivot_table(
        df,
        values=values,
        index=index,
        columns=columns,
        aggfunc=aggfunc,
        fill_value=0
    )

    return pivot_df.reset_index()

def unpivot_data(
    df: pd.DataFrame,
    id_vars: List[str],
    value_vars: Optional[List[str]] = None,
    var_name: str = 'variable',
    value_name: str = 'value'
) -> pd.DataFrame:
    """Unpivot (melt) data from wide to long format"""
    df = df.copy()

    return pd.melt(
        df,
        id_vars=id_vars,
        value_vars=value_vars,
        var_name=var_name,
        value_name=value_name
    )

def merge_datasets(
    df1: pd.DataFrame,
    df2: pd.DataFrame,
    how: str = 'inner',
    left_on: Optional[str] = None,
    right_on: Optional[str] = None,
    on: Optional[str] = None
) -> pd.DataFrame:
    """Merge two datasets"""
    if on:
        return pd.merge(df1, df2, on=on, how=how)
    elif left_on and right_on:
        return pd.merge(df1, df2, left_on=left_on, right_on=right_on, how=how)
    else:
        return pd.merge(df1, df2, how=how)

def apply_formula(
    df: pd.DataFrame,
    column: str,
    formula: str
) -> pd.DataFrame:
    """Apply custom formula to create or update column"""
    df = df.copy()

    try:
        df[column] = df.eval(formula)
    except Exception as e:
        print(f"Error applying formula: {e}")

    return df

def normalize_column(
    df: pd.DataFrame,
    column: str,
    method: str = 'minmax'
) -> pd.DataFrame:
    """Normalize numeric column"""
    df = df.copy()

    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
        return df

    if method == 'minmax':
        # Min-max normalization to [0, 1]
        min_val = df[column].min()
        max_val = df[column].max()
        if max_val > min_val:
            df[column] = (df[column] - min_val) / (max_val - min_val)

    elif method == 'zscore':
        # Z-score standardization
        mean_val = df[column].mean()
        std_val = df[column].std()
        if std_val > 0:
            df[column] = (df[column] - mean_val) / std_val

    return df
