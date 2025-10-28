import pandas as pd
import numpy as np
import io
from typing import IO

def export_to_format(df: pd.DataFrame, format: str) -> IO:
    """Export dataframe to specified format"""
    output = io.BytesIO()

    # Create a copy to avoid modifying original
    df_export = df.copy()

    if format == 'csv':
        csv_data = df_export.to_csv(index=False)
        output.write(csv_data.encode('utf-8'))

    elif format == 'json':
        # Replace NaN with None for valid JSON
        df_export = df_export.replace({np.nan: None})
        json_data = df_export.to_json(orient='records', indent=2)
        output.write(json_data.encode('utf-8'))

    elif format == 'xlsx' or format == 'excel':
        # Clean dataframe for Excel export
        # Replace inf/-inf with NaN
        df_export = df_export.replace([np.inf, -np.inf], np.nan)

        # Convert datetime columns to string if they cause issues
        for col in df_export.columns:
            if pd.api.types.is_datetime64_any_dtype(df_export[col]):
                try:
                    df_export[col] = df_export[col].astype(str)
                except:
                    pass

        try:
            # Try with openpyxl first
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df_export.to_excel(writer, index=False, sheet_name='Data')
        except ImportError:
            # Fallback to xlsxwriter if openpyxl not available
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df_export.to_excel(writer, index=False, sheet_name='Data')

    elif format == 'parquet':
        # Replace inf/-inf for parquet compatibility
        df_export = df_export.replace([np.inf, -np.inf], np.nan)
        df_export.to_parquet(output, index=False)

    else:
        raise ValueError(f"Unsupported export format: {format}")

    output.seek(0)
    return output
