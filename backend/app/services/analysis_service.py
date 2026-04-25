# app/services/analysis_service.py
"""
Analysis Engine — deterministic pandas computations.
Now includes compute_chart_data() which pre-aggregates real data
for every chart type so the frontend can render actual values.
"""

import pandas as pd
import numpy as np

MAX_NUMERIC_COLS = 20
MAX_CAT_COLS     = 10
MAX_CAT_VALUES   = 15   # more values for charts
MAX_CHART_POINTS = 50   # max points in a line/area chart


def _infer_dates(df):
    import warnings
    date_series = {}
    for col in df.select_dtypes(include="object").columns:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                full = pd.to_datetime(df[col], errors="coerce", format="mixed")
            if full.notna().sum() / max(df[col].notna().sum(), 1) > 0.8:
                date_series[col] = full
        except Exception:
            pass
    for col in df.select_dtypes(include=["datetime64"]).columns:
        date_series[col] = df[col]
    return date_series


def _granularity(series):
    s = series.dropna().sort_values()
    if len(s) < 2: return "unknown"
    days = s.diff().dropna().median().days
    if days <= 1:   return "day"
    if days <= 8:   return "week"
    if days <= 35:  return "month"
    if days <= 100: return "quarter"
    return "year"


def _iqr_outliers(s):
    q1, q3 = s.quantile(0.25), s.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0: return 0
    return int(((s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)).sum())


def _f(v, d=2):
    try:
        x = float(v)
        return None if (np.isnan(x) or np.isinf(x)) else round(x, d)
    except Exception:
        return None


def _safe(v):
    """Convert numpy types to Python natives for JSON serialisation."""
    if isinstance(v, (np.integer,)):  return int(v)
    if isinstance(v, (np.floating,)): return None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
    if isinstance(v, float):          return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    if isinstance(v, pd.Timestamp):   return str(v.date())
    return v


# ─────────────────────────────────────────────────────────────────────────────
# CHART DATA  — real aggregated values from the actual DataFrame
# Each entry: { chartType, title, xKey, yKey(s), data: [...], meta: {...} }
# ─────────────────────────────────────────────────────────────────────────────

def compute_chart_data(df: pd.DataFrame) -> dict:
    """
    Pre-compute real chart-ready data from the DataFrame.
    Returns a dict keyed by chart type, each containing one or more
    ready-to-render datasets.
    """
    charts = {}
    num_cols  = [c for c in df.select_dtypes(include=[np.number]).columns]
    obj_cols  = df.select_dtypes(include="object").columns.tolist()
    date_info = _infer_dates(df)

    # ── 1. BAR — top categories by count for every categorical column ──────
    bar_datasets = []
    for col in obj_cols[:MAX_CAT_COLS]:
        vc = df[col].value_counts().head(MAX_CAT_VALUES)
        if len(vc) < 2: continue
        bar_datasets.append({
            "id":    col,
            "title": f"{col} — Top {len(vc)} values",
            "xKey":  "name",
            "yKey":  "value",
            "data":  [{"name": str(k), "value": int(v)} for k, v in vc.items()],
        })
    # Also: bar of numeric column stats (mean per category)
    if len(obj_cols) >= 1 and len(num_cols) >= 1:
        cat_col = obj_cols[0]
        for num_col in num_cols[:4]:
            try:
                grouped = (
                    df.groupby(cat_col)[num_col]
                    .mean()
                    .dropna()
                    .sort_values(ascending=False)
                    .head(15)
                )
                if len(grouped) >= 2:
                    bar_datasets.append({
                        "id":    f"{cat_col}__{num_col}",
                        "title": f"Avg {num_col} by {cat_col}",
                        "xKey":  "name",
                        "yKey":  "value",
                        "data":  [{"name": str(k), "value": _safe(v)} for k, v in grouped.items()],
                    })
            except Exception:
                pass
    charts["bar"] = bar_datasets

    # ── 2. LINE — numeric columns over time or over ordered index ──────────
    line_datasets = []
    if date_info:
        date_col_name = list(date_info.keys())[0]
        date_series   = date_info[date_col_name]
        df_dated = df.copy()
        df_dated["__date__"] = date_series
        df_dated = df_dated.dropna(subset=["__date__"]).sort_values("__date__")

        gran = _granularity(df_dated["__date__"])
        if gran in ("day", "week"):
            freq = "W"
        elif gran == "month":
            freq = "ME"
        elif gran == "quarter":
            freq = "QE"
        else:
            freq = "YE"

        df_dated = df_dated.set_index("__date__")
        for num_col in num_cols[:6]:
            try:
                resampled = df_dated[num_col].resample(freq).mean().dropna()
                # Cap to MAX_CHART_POINTS by sampling
                if len(resampled) > MAX_CHART_POINTS:
                    step = len(resampled) // MAX_CHART_POINTS
                    resampled = resampled.iloc[::step]
                pts = [{"x": str(idx.date()), "y": _safe(v)}
                       for idx, v in resampled.items() if _safe(v) is not None]
                if len(pts) >= 2:
                    line_datasets.append({
                        "id":    f"{num_col}_over_{date_col_name}",
                        "title": f"{num_col} over {date_col_name}",
                        "xKey":  "x",
                        "yKeys": ["y"],
                        "data":  pts,
                    })
            except Exception:
                pass

        # Multi-line: multiple numeric cols on same date axis
        if len(num_cols) >= 2:
            try:
                multi_cols = num_cols[:4]
                multi_data = {}
                for num_col in multi_cols:
                    resampled = df_dated[num_col].resample(freq).mean().dropna()
                    if len(resampled) > MAX_CHART_POINTS:
                        step = len(resampled) // MAX_CHART_POINTS
                        resampled = resampled.iloc[::step]
                    for idx, v in resampled.items():
                        key = str(idx.date())
                        if key not in multi_data:
                            multi_data[key] = {"x": key}
                        multi_data[key][num_col] = _safe(v)
                pts = list(multi_data.values())
                if len(pts) >= 2:
                    line_datasets.append({
                        "id":    "multi_line",
                        "title": f"Trends: {', '.join(multi_cols)}",
                        "xKey":  "x",
                        "yKeys": multi_cols,
                        "data":  pts,
                    })
            except Exception:
                pass

    # Fallback line: numeric col by row index (sampled)
    if not line_datasets and num_cols:
        for num_col in num_cols[:3]:
            s = df[num_col].dropna()
            if len(s) < 2: continue
            step = max(1, len(s) // MAX_CHART_POINTS)
            pts  = [{"x": str(i), "y": _safe(v)}
                    for i, v in enumerate(s.iloc[::step]) if _safe(v) is not None]
            if len(pts) >= 2:
                line_datasets.append({
                    "id":    f"{num_col}_index",
                    "title": f"{num_col} by row",
                    "xKey":  "x",
                    "yKeys": ["y"],
                    "data":  pts,
                })
    charts["line"] = line_datasets

    # ── 3. PIE — categorical distributions ────────────────────────────────
    pie_datasets = []
    for col in obj_cols[:MAX_CAT_COLS]:
        vc = df[col].value_counts().head(8)
        if len(vc) < 2: continue
        pie_datasets.append({
            "id":    col,
            "title": f"{col} distribution",
            "data":  [{"name": str(k), "value": int(v)} for k, v in vc.items()],
        })
    charts["pie"] = pie_datasets

    # ── 4. SCATTER — numeric vs numeric ───────────────────────────────────
    scatter_datasets = []
    clean_nums = [c for c in num_cols if "id" not in c.lower()]
    if len(clean_nums) >= 2:
        # Sample up to 500 rows for scatter
        sample = df[clean_nums[:6]].dropna().sample(min(500, len(df)), random_state=42)
        pairs = []
        for i in range(len(clean_nums[:4])):
            for j in range(i+1, len(clean_nums[:4])):
                xc, yc = clean_nums[i], clean_nums[j]
                pts = [{"x": _safe(row[xc]), "y": _safe(row[yc])}
                       for _, row in sample[[xc, yc]].iterrows()
                       if _safe(row[xc]) is not None and _safe(row[yc]) is not None]
                if len(pts) >= 5:
                    scatter_datasets.append({
                        "id":    f"{xc}_vs_{yc}",
                        "title": f"{xc} vs {yc}",
                        "xKey":  "x",
                        "yKey":  "y",
                        "xLabel": xc,
                        "yLabel": yc,
                        "data":  pts,
                    })
    charts["scatter"] = scatter_datasets

    # ── 5. HISTOGRAM — distribution of numeric columns ────────────────────
    histogram_datasets = []
    for col in clean_nums[:6]:
        s = df[col].dropna()
        if len(s) < 5: continue
        try:
            counts, bin_edges = np.histogram(s, bins=min(20, max(5, len(s)//20)))
            pts = [
                {
                    "bin":   f"{_safe(bin_edges[i])}–{_safe(bin_edges[i+1])}",
                    "count": int(counts[i]),
                    "start": _safe(bin_edges[i]),
                }
                for i in range(len(counts))
            ]
            histogram_datasets.append({
                "id":    col,
                "title": f"{col} distribution",
                "xKey":  "bin",
                "yKey":  "count",
                "data":  pts,
            })
        except Exception:
            pass
    charts["histogram"] = histogram_datasets

    # ── 6. AREA — same as line but flagged for area rendering ─────────────
    # Reuse line data, just mark as area
    area_datasets = []
    for ds in (line_datasets or [])[:3]:
        area_datasets.append({**ds, "id": "area_" + ds["id"]})
    charts["area"] = area_datasets

    # ── Meta: column picker options for the UI ─────────────────────────────
    charts["__meta__"] = {
        "numeric_cols":     num_cols,
        "categorical_cols": obj_cols,
        "date_cols":        list(date_info.keys()),
        "has_date":         len(date_info) > 0,
    }

    return charts


# ─────────────────────────────────────────────────────────────────────────────
# PROFILE  (unchanged — used for LLM context)
# ─────────────────────────────────────────────────────────────────────────────

def compute_profile(df: pd.DataFrame) -> dict:
    rows, cols = df.shape
    num_cols  = df.select_dtypes(include=[np.number]).columns.tolist()
    obj_cols  = df.select_dtypes(include="object").columns.tolist()
    bool_cols = df.select_dtypes(include="bool").columns.tolist()
    dt_cols   = df.select_dtypes(include=["datetime64"]).columns.tolist()

    miss       = df.isnull().sum()
    miss_pct   = (miss / rows * 100).round(2)
    total_miss = int(miss.sum())
    completeness = round((1 - total_miss / max(rows * cols, 1)) * 100, 2)
    top_missing  = {
        col: {"count": int(miss[col]), "pct": float(miss_pct[col])}
        for col in miss_pct[miss_pct > 0].sort_values(ascending=False).head(10).index
    }

    numeric_stats = {}
    for col in num_cols[:MAX_NUMERIC_COLS]:
        s = df[col].dropna()
        if not len(s): continue
        numeric_stats[col] = {
            "count":       int(s.count()),
            "min":         _f(s.min()),
            "max":         _f(s.max()),
            "mean":        _f(s.mean()),
            "median":      _f(s.median()),
            "std":         _f(s.std()),
            "q25":         _f(s.quantile(0.25)),
            "q75":         _f(s.quantile(0.75)),
            "outliers":    _iqr_outliers(s),
            "outlier_pct": round(_iqr_outliers(s) / max(len(s), 1) * 100, 2),
        }

    cat_by_card = sorted(
        {c: df[c].nunique() for c in obj_cols if df[c].nunique() > 1}.items(),
        key=lambda x: x[1]
    )[:MAX_CAT_COLS]
    categorical_summaries = {
        col: {
            "unique_values": int(df[col].nunique()),
            "top_values":    {str(k): int(v) for k, v in
                              df[col].value_counts().head(MAX_CAT_VALUES).items()},
        }
        for col, _ in cat_by_card
    }

    date_analysis = {}
    for col, parsed in _infer_dates(df).items():
        s = parsed.dropna()
        if not len(s): continue
        date_analysis[col] = {
            "min_date":        s.min().isoformat(),
            "max_date":        s.max().isoformat(),
            "date_range_days": int((s.max() - s.min()).days),
            "granularity":     _granularity(s),
            "null_count":      int(parsed.isna().sum()),
        }

    return {
        "overview": {
            "total_rows":      rows,
            "total_columns":   cols,
            "type_breakdown":  {
                "numeric": len(num_cols), "text": len(obj_cols),
                "boolean": len(bool_cols), "datetime": len(dt_cols),
            },
            "duplicate_rows": int(df.duplicated().sum()),
            "duplicate_pct":  round(int(df.duplicated().sum()) / max(rows, 1) * 100, 2),
        },
        "missingness": {
            "total_missing_cells":      total_miss,
            "overall_completeness_pct": completeness,
            "top_missing_columns":      top_missing,
        },
        "numeric_stats":         numeric_stats,
        "outlier_summary":       {c: s["outliers"] for c, s in numeric_stats.items() if s["outliers"] > 0},
        "categorical_summaries": categorical_summaries,
        "date_analysis":         date_analysis,
    }


def profile_to_llm_context(profile: dict, sample_rows: list, file_name: str) -> str:
    ov = profile["overview"]
    ms = profile["missingness"]

    lines = [
        f"FILE:{file_name}",
        f"SHAPE:{ov['total_rows']}r x {ov['total_columns']}c",
        f"TYPES: num={ov['type_breakdown']['numeric']} txt={ov['type_breakdown']['text']}"
        f" dt={ov['type_breakdown']['datetime']} bool={ov['type_breakdown']['boolean']}",
        f"DUPS:{ov['duplicate_rows']}({ov['duplicate_pct']}%)",
        f"COMPLETE:{ms['overall_completeness_pct']}% ({ms['total_missing_cells']} missing cells)",
    ]

    if ms["top_missing_columns"]:
        lines.append("MISSING:")
        for col, info in list(ms["top_missing_columns"].items())[:5]:
            lines.append(f" {col}:{info['count']}({info['pct']}%)")

    if profile["numeric_stats"]:
        lines.append("NUM:")
        for col, s in list(profile["numeric_stats"].items())[:MAX_NUMERIC_COLS]:
            out = f" {col}: min={s['min']} max={s['max']} mean={s['mean']} med={s['median']} std={s['std']}"
            if s["outliers"]: out += f" outliers={s['outliers']}"
            lines.append(out)

    if profile["categorical_summaries"]:
        lines.append("CAT:")
        for col, info in list(profile["categorical_summaries"].items())[:MAX_CAT_COLS]:
            top = " ".join(f"{k}={v}" for k, v in list(info["top_values"].items())[:5])
            lines.append(f" {col}(uniq={info['unique_values']}): {top}")

    if profile["date_analysis"]:
        lines.append("DATES:")
        for col, info in profile["date_analysis"].items():
            lines.append(
                f" {col}: {info['min_date'][:10]}→{info['max_date'][:10]}"
                f" ({info['date_range_days']}d ~{info['granularity']})"
            )

    if sample_rows:
        lines.append("SAMPLE(5 rows):")
        for row in sample_rows[:5]:
            lines.append(" " + " | ".join(f"{k}:{v}" for k, v in list(row.items())[:8]))

    lines.append("---ANSWER ONLY FROM ABOVE DATA---")
    return "\n".join(lines)


def get_relevant_section(question: str, profile_context: str) -> str:
    q = question.lower()
    sections = {
        "missing":   ["MISSING:", "COMPLETE:"],
        "duplicate": ["DUPS:"],
        "outlier":   ["NUM:"],
        "numeric":   ["NUM:"],
        "statistic": ["NUM:"],
        "mean":      ["NUM:"],
        "categor":   ["CAT:"],
        "distribut": ["CAT:"],
        "date":      ["DATES:"],
        "time":      ["DATES:"],
        "overview":  ["SHAPE:", "TYPES:", "DUPS:", "COMPLETE:"],
        "summary":   None,
        "all":       None,
    }

    wanted_headers = set()
    for keyword, headers in sections.items():
        if keyword in q:
            if headers is None:
                return profile_context
            wanted_headers.update(headers)

    if not wanted_headers:
        return profile_context

    lines    = profile_context.split("\n")
    preamble = lines[:5]
    body     = lines[5:]
    result   = list(preamble)
    in_wanted = False

    for line in body:
        stripped  = line.strip()
        is_header = any(stripped.startswith(h.rstrip(":") + ":") for h in
                        ["MISSING:", "NUM:", "CAT:", "DATES:", "DUPS:", "COMPLETE:", "SAMPLE"])
        if is_header:
            in_wanted = any(stripped.startswith(h) for h in wanted_headers)
        if in_wanted or not is_header:
            result.append(line)

    result.append("---ANSWER ONLY FROM ABOVE DATA---")
    return "\n".join(result)