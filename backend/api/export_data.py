import pandas as pd
import io
from typing import IO

def export_to_format(df: pd.DataFrame, format: str) -> IO:
    """Export dataframe to specified format"""
    output = io.BytesIO()

    if format == 'csv':
        csv_data = df.to_csv(index=False)
        output.write(csv_data.encode('utf-8'))

    elif format == 'json':
        json_data = df.to_json(orient='records', indent=2)
        output.write(json_data.encode('utf-8'))

    elif format == 'xlsx':
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Data')

    elif format == 'parquet':
        df.to_parquet(output, index=False)

    else:
        raise ValueError(f"Unsupported export format: {format}")

    output.seek(0)
    return output
