import pandas as pd
import chardet
import io
from typing import Optional

def detect_encoding(contents: bytes) -> str:
    """Detect file encoding"""
    result = chardet.detect(contents)
    return result['encoding'] or 'utf-8'

def detect_delimiter(sample: str, num_lines: int = 5) -> str:
    """Detect CSV delimiter"""
    lines = sample.split('\n')[:num_lines]

    # Common delimiters
    delimiters = [',', ';', '\t', '|']
    delimiter_counts = {}

    for delimiter in delimiters:
        counts = [line.count(delimiter) for line in lines if line.strip()]
        if counts and len(set(counts)) == 1 and counts[0] > 0:
            delimiter_counts[delimiter] = counts[0]

    if delimiter_counts:
        return max(delimiter_counts, key=delimiter_counts.get)

    return ','  # Default to comma

def import_dataframe(file_contents: bytes, file_type: str, **kwargs) -> pd.DataFrame:
    """Import dataframe based on file type"""
    if file_type == 'csv':
        encoding = kwargs.get('encoding', 'utf-8')
        delimiter = kwargs.get('delimiter', ',')
        return pd.read_csv(io.BytesIO(file_contents), encoding=encoding, delimiter=delimiter)

    elif file_type in ['xlsx', 'xls']:
        return pd.read_excel(io.BytesIO(file_contents))

    elif file_type == 'json':
        return pd.read_json(io.BytesIO(file_contents))

    elif file_type == 'parquet':
        return pd.read_parquet(io.BytesIO(file_contents))

    else:
        raise ValueError(f"Unsupported file type: {file_type}")
