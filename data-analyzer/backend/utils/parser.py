import pandas as pd
import re
from typing import Dict, Any

def parse_natural_language_query(df: pd.DataFrame, query: str) -> Dict[str, Any]:
    """
    Parse natural language queries and execute them on the dataframe

    Supported patterns:
    - "filter where [column] [operator] [value]"
    - "show rows where [column] [operator] [value]"
    - "select [column1], [column2]"
    - "sort by [column] [asc/desc]"
    - "group by [column] and [aggregate] [column]"
    - "top [n] rows"
    - "bottom [n] rows"
    """
    query = query.lower().strip()
    result_df = df.copy()
    interpretation = []

    try:
        # Pattern: filter/show rows where column operator value
        # Updated to handle more natural language variations like "show me all rows where Y is greater than 100"
        filter_pattern = r'(?:filter|show|get|select|display|find)\s+.*?where\s+(\w+)\s+(?:is\s+)?(>|<|>=|<=|==|!=|=|equals?|greater\s+than|less\s+than|contains?|not\s+null|null)\s*(.+)?'
        match = re.search(filter_pattern, query)

        if match:
            column = match.group(1).strip()
            operator = match.group(2).strip()
            value = match.group(3).strip().strip('"\'')

            # Find closest matching column name
            column = find_closest_column(df, column)

            if column not in df.columns:
                return {
                    "success": False,
                    "error": f"Column '{column}' not found",
                    "dataframe": df
                }

            # Try to convert value to appropriate type
            # First, check if the column is already numeric
            if df[column].dtype in ['int64', 'float64']:
                try:
                    value = float(value) if '.' in value else int(value)
                except:
                    pass
            # If column is object type, try to convert it to numeric (handles European decimals with commas)
            elif df[column].dtype == 'object':
                # Try to convert the column to numeric, replacing commas with dots
                try:
                    result_df[column] = pd.to_numeric(
                        result_df[column].astype(str).str.replace(',', '.', regex=False),
                        errors='coerce'
                    )
                    # Convert filter value to numeric
                    value = float(value) if '.' in value else int(value)
                except:
                    pass

            # Apply filter
            if operator in ['>', 'greater than']:
                result_df = result_df[result_df[column] > value]
                interpretation.append(f"Filtered rows where {column} > {value}")

            elif operator in ['<', 'less than']:
                result_df = result_df[result_df[column] < value]
                interpretation.append(f"Filtered rows where {column} < {value}")

            elif operator in ['>=']:
                result_df = result_df[result_df[column] >= value]
                interpretation.append(f"Filtered rows where {column} >= {value}")

            elif operator in ['<=']:
                result_df = result_df[result_df[column] <= value]
                interpretation.append(f"Filtered rows where {column} <= {value}")

            elif operator in ['==', '=', 'equals']:
                result_df = result_df[result_df[column] == value]
                interpretation.append(f"Filtered rows where {column} equals {value}")

            elif operator in ['!=']:
                result_df = result_df[result_df[column] != value]
                interpretation.append(f"Filtered rows where {column} != {value}")

            elif operator == 'contains':
                result_df = result_df[result_df[column].astype(str).str.contains(str(value), case=False, na=False)]
                interpretation.append(f"Filtered rows where {column} contains '{value}'")

            return {
                "success": True,
                "dataframe": result_df,
                "interpretation": " | ".join(interpretation)
            }

        # Pattern: select columns
        select_pattern = r'select\s+(?:columns?\s+)?(.+?)(?:\s+from|\s+where|$)'
        match = re.search(select_pattern, query)

        if match:
            columns_str = match.group(1).strip()
            columns = [c.strip() for c in columns_str.split(',')]

            # Find closest matching columns
            matched_columns = [find_closest_column(df, col) for col in columns]
            matched_columns = [col for col in matched_columns if col in df.columns]

            if matched_columns:
                result_df = result_df[matched_columns]
                interpretation.append(f"Selected columns: {', '.join(matched_columns)}")

                return {
                    "success": True,
                    "dataframe": result_df,
                    "interpretation": " | ".join(interpretation)
                }

        # Pattern: sort by column
        sort_pattern = r'sort\s+by\s+(\w+)(?:\s+(asc|desc|ascending|descending))?'
        match = re.search(sort_pattern, query)

        if match:
            column = match.group(1).strip()
            order = match.group(2).strip() if match.group(2) else 'asc'

            column = find_closest_column(df, column)

            if column in df.columns:
                ascending = order in ['asc', 'ascending']
                result_df = result_df.sort_values(by=column, ascending=ascending)
                interpretation.append(f"Sorted by {column} ({'ascending' if ascending else 'descending'})")

                return {
                    "success": True,
                    "dataframe": result_df,
                    "interpretation": " | ".join(interpretation)
                }

        # Pattern: top/bottom N rows
        top_pattern = r'(?:top|first)\s+(\d+)(?:\s+rows)?'
        match = re.search(top_pattern, query)

        if match:
            n = int(match.group(1))
            result_df = result_df.head(n)
            interpretation.append(f"Showing top {n} rows")

            return {
                "success": True,
                "dataframe": result_df,
                "interpretation": " | ".join(interpretation)
            }

        bottom_pattern = r'(?:bottom|last)\s+(\d+)(?:\s+rows)?'
        match = re.search(bottom_pattern, query)

        if match:
            n = int(match.group(1))
            result_df = result_df.tail(n)
            interpretation.append(f"Showing bottom {n} rows")

            return {
                "success": True,
                "dataframe": result_df,
                "interpretation": " | ".join(interpretation)
            }

        # Pattern: group by and aggregate
        group_pattern = r'group\s+by\s+(\w+)(?:\s+and\s+(sum|mean|count|avg|average|max|min)\s+(\w+))?'
        match = re.search(group_pattern, query)

        if match:
            group_col = find_closest_column(df, match.group(1).strip())

            if group_col in df.columns:
                if match.group(2) and match.group(3):
                    agg_func = match.group(2).strip()
                    agg_col = find_closest_column(df, match.group(3).strip())

                    if agg_func in ['avg', 'average']:
                        agg_func = 'mean'

                    if agg_col in df.columns:
                        result_df = result_df.groupby(group_col)[agg_col].agg(agg_func).reset_index()
                        interpretation.append(f"Grouped by {group_col} and calculated {agg_func} of {agg_col}")
                else:
                    result_df = result_df.groupby(group_col).size().reset_index(name='count')
                    interpretation.append(f"Grouped by {group_col} with count")

                return {
                    "success": True,
                    "dataframe": result_df,
                    "interpretation": " | ".join(interpretation)
                }

        # If no pattern matched
        return {
            "success": False,
            "error": "Could not understand the query. Try patterns like: 'filter where age > 30', 'select name, age', 'sort by age desc', 'top 10 rows'",
            "dataframe": df
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing query: {str(e)}",
            "dataframe": df
        }

def find_closest_column(df: pd.DataFrame, column_query: str) -> str:
    """Find the closest matching column name"""
    column_query = column_query.lower().strip()

    # Exact match (case-insensitive)
    for col in df.columns:
        if col.lower() == column_query:
            return col

    # Partial match
    for col in df.columns:
        if column_query in col.lower() or col.lower() in column_query:
            return col

    # Return original if no match
    return column_query
