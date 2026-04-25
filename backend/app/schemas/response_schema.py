# app/schemas/response_schema.py
from pydantic import BaseModel
from typing import Optional, Any


class ErrorDetail(BaseModel):
    code:     str
    message:  str
    fix_hint: str


class PreviewData(BaseModel):
    file_name:                str
    file_type:                str
    file_size_bytes:          int
    rows:                     int
    columns:                  int
    column_names:             list[str]
    column_types:             dict[str, str]
    missing_values_by_column: dict[str, int]
    sample_rows:              list[dict]


class NumericColStats(BaseModel):
    count:       int
    min:         Optional[float]
    max:         Optional[float]
    mean:        Optional[float]
    median:      Optional[float]
    std:         Optional[float]
    q25:         Optional[float]
    q75:         Optional[float]
    outliers:    int
    outlier_pct: float


class OverviewStats(BaseModel):
    total_rows:     int
    total_columns:  int
    type_breakdown: dict[str, int]
    duplicate_rows: int
    duplicate_pct:  float


class MissingnessReport(BaseModel):
    total_missing_cells:      int
    overall_completeness_pct: float
    top_missing_columns:      dict[str, Any]


class DateColStats(BaseModel):
    min_date:        str
    max_date:        str
    date_range_days: int
    granularity:     str
    null_count:      int


class CatColStats(BaseModel):
    unique_values: int
    top_values:    dict[str, int]


class AnalysisData(BaseModel):
    overview:              OverviewStats
    missingness:           MissingnessReport
    numeric_stats:         dict[str, NumericColStats]
    outlier_summary:       dict[str, int]
    categorical_summaries: dict[str, CatColStats]
    date_analysis:         dict[str, DateColStats]


class VizSuggestion(BaseModel):
    chart:  str
    title:  str
    reason: str


class ChatResponse(BaseModel):
    status:           str
    request_id:       str
    message:          Optional[str]           = None
    answer:           Optional[str]           = None
    source:           Optional[str]           = None
    preview:          Optional[PreviewData]   = None
    analysis:         Optional[AnalysisData]  = None
    analysis_label:   Optional[str]           = None
    profile_context:  Optional[str]           = None
    session_id:       Optional[str]           = None
    chart_data:       Optional[dict]          = None   # real chart-ready data
    viz_suggestions:  list[VizSuggestion]     = []
    is_image_reply:   bool                    = False
    warnings:         list[str]               = []
    errors:           list[ErrorDetail]       = []


class FilePreviewResponse(BaseModel):
    status:     str
    request_id: str
    preview:    Optional[PreviewData] = None
    warnings:   list[str]            = []
    errors:     list[ErrorDetail]    = []