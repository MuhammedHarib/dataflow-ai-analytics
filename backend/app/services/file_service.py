# app/services/file_service.py
"""
File Service — robust parsing for CSV, TSV, Excel files.

Handles:
- Auto-detect delimiter (tab, comma, pipe, semicolon)
- Auto-detect encoding (chardet fallback chain)
- Wide files (100+ columns) — no column limit
- Large files (1600+ rows) — no row limit on processing
- Complex date-time columns (mm:ss.S style ignored gracefully)
- BOM characters, Windows line endings
- Preview: 5 sample rows, capped column display
"""

import os
import uuid
import tempfile
import chardet
import pandas as pd
import numpy as np
from fastapi import UploadFile

# ── Limits ────────────────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB  = 50
MAX_FILE_SIZE     = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_PREVIEW_COLS  = 20   # columns shown in preview card (not processing limit)
MAX_PREVIEW_ROWS  = 5
ALLOWED_EXTENSIONS = {".csv", ".tsv", ".txt", ".xlsx", ".xls"}


async def save_upload_file_tmp(file: UploadFile) -> tuple[str, int]:
    """Save uploaded file to a temp path. Returns (tmp_path, size_bytes)."""
    suffix = os.path.splitext(file.filename or "upload")[1].lower() or ".csv"
    tmp    = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        return tmp.name, len(content)
    finally:
        tmp.close()


def _detect_encoding(path: str) -> str:
    """Detect file encoding using chardet, fall back to utf-8."""
    try:
        with open(path, "rb") as f:
            raw = f.read(65536)   # read first 64KB for detection
        result = chardet.detect(raw)
        enc    = result.get("encoding") or "utf-8"
        # Normalize common aliases
        enc = enc.replace("ISO-8859", "latin-1") if "ISO-8859" in enc else enc
        return enc
    except Exception:
        return "utf-8"


def _detect_delimiter(path: str, encoding: str) -> str:
    """Sniff delimiter from first few lines."""
    try:
        with open(path, "r", encoding=encoding, errors="replace") as f:
            sample = "".join(f.readline() for _ in range(5))
        counts = {
            "\t": sample.count("\t"),
            ",":  sample.count(","),
            ";":  sample.count(";"),
            "|":  sample.count("|"),
        }
        return max(counts, key=counts.get)
    except Exception:
        return ","


def _read_file(path: str, file_name: str) -> tuple[pd.DataFrame, list[str]]:
    """
    Read CSV/TSV/Excel into DataFrame.
    Returns (df, warnings).
    """
    warnings = []
    ext      = os.path.splitext(file_name)[1].lower()

    # ── Excel ─────────────────────────────────────────────────────────────
    if ext in (".xlsx", ".xls"):
        try:
            df = pd.read_excel(path, engine="openpyxl" if ext == ".xlsx" else "xlrd")
            return df, warnings
        except Exception as e:
            raise ValueError(f"Excel read failed: {e}")

    # ── CSV / TSV / TXT ───────────────────────────────────────────────────
    encoding  = _detect_encoding(path)
    delimiter = _detect_delimiter(path, encoding)

    if delimiter == "\t":
        warnings.append("Detected tab-separated (TSV) format.")

    # Try reading with detected settings
    for enc in [encoding, "utf-8", "latin-1", "cp1252"]:
        try:
            df = pd.read_csv(
                path,
                sep=delimiter,
                encoding=enc,
                encoding_errors="replace",
                on_bad_lines="warn",      # skip malformed rows with a warning
                low_memory=False,         # avoid mixed-type warnings on large files
                dtype_backend="numpy_nullable",
            )
            if enc != encoding:
                warnings.append(f"File re-read with {enc} encoding.")
            return df, warnings
        except Exception:
            continue

    raise ValueError("Could not parse file. Ensure it is a valid CSV, TSV, or Excel file.")


def _sanitize_df(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    Clean up DataFrame:
    - Strip whitespace from column names
    - Remove completely empty rows/columns
    - Convert obviously numeric columns stored as strings
    """
    warnings = []

    # Strip column name whitespace and BOM
    df.columns = [str(c).strip().lstrip("\ufeff") for c in df.columns]

    # Drop fully empty rows and columns
    before_rows = len(df)
    df = df.dropna(how="all")
    df = df.loc[:, df.notna().any()]
    dropped = before_rows - len(df)
    if dropped > 0:
        warnings.append(f"Removed {dropped} fully empty rows.")

    # Attempt numeric coercion on object columns that look numeric
    for col in df.select_dtypes(include="object").columns:
        coerced = pd.to_numeric(df[col], errors="coerce")
        # Only convert if >60% of non-null values successfully parse
        valid    = coerced.notna().sum()
        non_null = df[col].notna().sum()
        if non_null > 0 and valid / non_null > 0.6:
            df[col] = coerced

    return df, warnings


def _build_preview(df: pd.DataFrame, file_name: str, file_size_bytes: int,
                   file_type: str) -> dict:
    """Build the preview data dict for the frontend PreviewPanel."""
    rows, total_cols = df.shape
    col_names        = df.columns.tolist()

    # Column types (use all columns for metadata, cap display)
    col_types = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        if "int" in dtype or "float" in dtype:
            col_types[col] = "numeric"
        elif "datetime" in dtype:
            col_types[col] = "datetime"
        elif "bool" in dtype:
            col_types[col] = "boolean"
        else:
            col_types[col] = "text"

    missing = {col: int(df[col].isna().sum()) for col in df.columns}

    # Sample rows — show first MAX_PREVIEW_COLS columns only to keep payload small
    display_cols = col_names[:MAX_PREVIEW_COLS]
    sample_df    = df[display_cols].head(MAX_PREVIEW_ROWS)

    # Serialize sample rows safely
    sample_rows = []
    for _, row in sample_df.iterrows():
        clean = {}
        for k, v in row.items():
            if pd.isna(v) if not isinstance(v, (list, dict)) else False:
                clean[str(k)] = None
            elif isinstance(v, (np.integer,)):
                clean[str(k)] = int(v)
            elif isinstance(v, (np.floating,)):
                clean[str(k)] = None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
            else:
                clean[str(k)] = str(v)
        sample_rows.append(clean)

    return {
        "file_name":                file_name,
        "file_type":                file_type,
        "file_size_bytes":          file_size_bytes,
        "rows":                     rows,
        "columns":                  total_cols,
        "column_names":             col_names,
        "column_types":             col_types,
        "missing_values_by_column": missing,
        "sample_rows":              sample_rows,
    }


def validate_and_preview(file_path: str, file_name: str,
                         file_size_bytes: int) -> dict:
    """
    Full validation + preview pipeline.
    Returns dict with keys: status, preview, _df, warnings, errors.
    """
    warnings = []
    errors   = []
    ext      = os.path.splitext(file_name)[1].lower()

    # ── Size check ────────────────────────────────────────────────────────
    if file_size_bytes > MAX_FILE_SIZE:
        return {
            "status":   "error",
            "warnings": warnings,
            "errors":   [{"code": "FILE_TOO_LARGE",
                          "message": f"File is {file_size_bytes/1024/1024:.1f} MB (limit {MAX_FILE_SIZE_MB} MB).",
                          "fix_hint": "Split the file or reduce its size."}],
        }

    # ── Extension check ───────────────────────────────────────────────────
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "status":   "error",
            "warnings": warnings,
            "errors":   [{"code": "UNSUPPORTED_FORMAT",
                          "message": f"File type '{ext}' is not supported.",
                          "fix_hint": "Upload a CSV, TSV, XLSX, or XLS file."}],
        }

    # ── Read ──────────────────────────────────────────────────────────────
    try:
        df, read_warnings = _read_file(file_path, file_name)
        warnings.extend(read_warnings)
    except ValueError as e:
        return {
            "status":   "error",
            "warnings": warnings,
            "errors":   [{"code": "PARSE_ERROR",
                          "message": str(e),
                          "fix_hint": "Check the file format and encoding."}],
        }
    except Exception as e:
        return {
            "status":   "error",
            "warnings": warnings,
            "errors":   [{"code": "READ_ERROR",
                          "message": f"Unexpected read error: {e}",
                          "fix_hint": "Try resaving the file as UTF-8 CSV."}],
        }

    # ── Sanitize ──────────────────────────────────────────────────────────
    try:
        df, san_warnings = _sanitize_df(df)
        warnings.extend(san_warnings)
    except Exception as e:
        warnings.append(f"Sanitization warning: {e}")

    # ── Empty check ───────────────────────────────────────────────────────
    if df.empty or len(df.columns) == 0:
        return {
            "status":   "error",
            "warnings": warnings,
            "errors":   [{"code": "EMPTY_FILE",
                          "message": "File is empty or has no valid columns.",
                          "fix_hint": "Ensure the file contains data rows with headers."}],
        }

    # ── Wide file warning ─────────────────────────────────────────────────
    if len(df.columns) > MAX_PREVIEW_COLS:
        warnings.append(
            f"Wide file: {len(df.columns)} columns detected. "
            f"Preview shows first {MAX_PREVIEW_COLS} columns; all columns are analyzed."
        )

    # ── Build preview ─────────────────────────────────────────────────────
    file_type = ext.lstrip(".")
    if ext in (".csv", ".tsv", ".txt"):
        file_type = "csv"

    preview = _build_preview(df, file_name, file_size_bytes, file_type)

    return {
        "status":   "ok",
        "preview":  preview,
        "_df":      df,
        "warnings": warnings,
        "errors":   [],
    }