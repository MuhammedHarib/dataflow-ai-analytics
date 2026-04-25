# app/services/advanced_visualization_service.py
"""
MODULE 5 — ADVANCED VISUALIZATION ENGINE
Extends existing chart_data with radar, gauge, stacked bar,
heatmap, correlation matrix, box plots.
Appends new chart types to the existing chart_data dict.
"""

import pandas as pd
import numpy as np
from typing import Optional


def _safe(v):
    if isinstance(v, (np.integer,)):  return int(v)
    if isinstance(v, (np.floating,)):
        return None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
    if isinstance(v, float):
        return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    return v


# ── Radar Chart ───────────────────────────────────────────────────────────────
def build_radar_data(df: pd.DataFrame) -> list[dict]:
    """
    Build radar chart datasets.
    Each radar shows normalized (0-100) performance across metrics.
    """
    datasets = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])][:8]
    cat_cols = df.select_dtypes(include="object").columns.tolist()

    if not num_cols:
        return datasets

    # Overall performance radar (all numeric metrics normalized)
    overall = []
    for col in num_cols:
        s   = df[col].dropna()
        mx  = float(s.max()) if len(s) else 1
        avg = float(s.mean()) if len(s) else 0
        overall.append({"metric": col[:14], "value": round(avg/mx*100, 1) if mx else 0, "fullMark": 100})
    datasets.append({"id": "overall_radar", "title": "Overall Performance Radar",
                     "data": overall, "keys": ["value"]})

    # Category comparison radar (top categories for first numeric col)
    if cat_cols and len(num_cols) >= 1:
        cat_col = cat_cols[0]
        num_col = num_cols[0]
        top_cats = df[cat_col].value_counts().head(5).index.tolist()
        try:
            grp  = df.groupby(cat_col)[num_cols[:5]].mean()
            mx_vals = {c: float(grp[c].max()) or 1 for c in num_cols[:5]}
            radar_rows = []
            for cat in top_cats:
                if cat in grp.index:
                    row = {"metric": str(cat)[:14]}
                    for nc in num_cols[:5]:
                        row[nc[:10]] = round(float(grp.loc[cat, nc]) / mx_vals[nc] * 100, 1)
                    radar_rows.append(row)
            if radar_rows:
                datasets.append({
                    "id":    f"{cat_col}_radar",
                    "title": f"{cat_col} Comparison Radar",
                    "data":  radar_rows,
                    "keys":  [nc[:10] for nc in num_cols[:5]],
                })
        except Exception:
            pass

    return datasets


# ── Gauge Chart ───────────────────────────────────────────────────────────────
def build_gauge_data(df: pd.DataFrame) -> list[dict]:
    """Build gauge datasets from KPI columns."""
    datasets = []
    kpi_keywords = ["revenue","sales","profit","cost","amount","total","rate",
                    "score","value","price","fee","gross","net","pct","percent"]
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index"])]

    gauge_cols = [c for c in num_cols if any(k in c.lower() for k in kpi_keywords)] or num_cols[:4]

    for col in gauge_cols[:6]:
        s = df[col].dropna()
        if not len(s): continue
        avg = float(s.mean())
        mx  = float(s.max()) if float(s.max()) != 0 else 1
        mn  = float(s.min())
        pct = round((avg - mn) / (mx - mn) * 100, 1) if mx != mn else 50

        datasets.append({
            "id":      col,
            "title":   f"{col} Gauge",
            "value":   _safe(avg),
            "min":     _safe(mn),
            "max":     _safe(mx),
            "pct":     pct,
            "data":    [{"name": "value", "value": pct}, {"name": "empty", "value": 100 - pct}],
            "thresholds": [
                {"at": 33, "color": "#fc8181", "label": "Low"},
                {"at": 66, "color": "#f6ad55", "label": "Medium"},
                {"at": 100,"color": "#68d391", "label": "High"},
            ],
        })

    return datasets


# ── Stacked Bar ───────────────────────────────────────────────────────────────
def build_stacked_bar_data(df: pd.DataFrame) -> list[dict]:
    """Build stacked bar datasets — category × multiple numeric cols."""
    datasets = []
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])]

    if not cat_cols or len(num_cols) < 2:
        return datasets

    for cat_col in cat_cols[:3]:
        num_subset = num_cols[:5]
        try:
            grp = df.groupby(cat_col)[num_subset].sum().head(10)
            rows = []
            for idx, row in grp.iterrows():
                entry = {"name": str(idx)[:16]}
                for nc in num_subset:
                    entry[nc[:12]] = _safe(row[nc])
                rows.append(entry)
            if rows:
                datasets.append({
                    "id":    f"{cat_col}_stacked",
                    "title": f"Stacked {cat_col}",
                    "xKey":  "name",
                    "yKeys": [nc[:12] for nc in num_subset],
                    "data":  rows,
                })
        except Exception:
            pass

    return datasets


# ── Heatmap ───────────────────────────────────────────────────────────────────
def build_heatmap_data(df: pd.DataFrame) -> list[dict]:
    """Build heatmap — categorical row × categorical col, value = count or mean."""
    datasets = []
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])]

    if len(cat_cols) < 2:
        return datasets

    for i in range(min(2, len(cat_cols)-1)):
        row_col = cat_cols[i]
        col_col = cat_cols[i+1]
        val_col = num_cols[0] if num_cols else None

        try:
            r_vals = df[row_col].value_counts().head(8).index.tolist()
            c_vals = df[col_col].value_counts().head(8).index.tolist()

            cells = []
            for rv in r_vals:
                for cv in c_vals:
                    mask = (df[row_col] == rv) & (df[col_col] == cv)
                    if val_col:
                        val = float(df.loc[mask, val_col].mean()) if mask.sum() > 0 else 0
                    else:
                        val = int(mask.sum())
                    cells.append({
                        "x":     str(cv)[:12],
                        "y":     str(rv)[:12],
                        "value": _safe(val),
                    })

            if cells:
                all_vals = [c["value"] for c in cells if c["value"] is not None]
                datasets.append({
                    "id":    f"{row_col}_{col_col}_heatmap",
                    "title": f"{row_col} × {col_col} Heatmap",
                    "xVals": [str(v)[:12] for v in c_vals],
                    "yVals": [str(v)[:12] for v in r_vals],
                    "min":   min(all_vals) if all_vals else 0,
                    "max":   max(all_vals) if all_vals else 1,
                    "data":  cells,
                })
        except Exception:
            pass

    return datasets


# ── Correlation Matrix ────────────────────────────────────────────────────────
def build_correlation_matrix(df: pd.DataFrame) -> list[dict]:
    """Pearson correlation matrix for numeric columns."""
    datasets = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])][:12]

    if len(num_cols) < 2:
        return datasets

    try:
        corr = df[num_cols].corr(method="pearson")
        cells = []
        for row_c in num_cols:
            for col_c in num_cols:
                val = corr.loc[row_c, col_c]
                cells.append({
                    "x":     col_c[:12],
                    "y":     row_c[:12],
                    "value": _safe(val),
                    "color": _corr_color(float(val) if not np.isnan(val) else 0),
                })
        datasets.append({
            "id":     "correlation_matrix",
            "title":  "Correlation Matrix",
            "cols":   [c[:12] for c in num_cols],
            "min":    -1,
            "max":    1,
            "data":   cells,
        })
    except Exception:
        pass

    return datasets


def _corr_color(v: float) -> str:
    if v >= 0.7:  return "#68d391"
    if v >= 0.4:  return "#9ae6b4"
    if v >= 0.1:  return "rgba(255,255,255,0.15)"
    if v >= -0.1: return "rgba(255,255,255,0.07)"
    if v >= -0.4: return "#feb2b2"
    return "#fc8181"


# ── Box Plot ──────────────────────────────────────────────────────────────────
def build_box_plot_data(df: pd.DataFrame) -> list[dict]:
    """Box plot data — Q1, median, Q3, whiskers, outliers per numeric column."""
    datasets = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])][:10]

    rows = []
    for col in num_cols:
        s = df[col].dropna()
        if len(s) < 5: continue
        q1, med, q3 = float(s.quantile(0.25)), float(s.median()), float(s.quantile(0.75))
        iqr   = q3 - q1
        lo    = float(s[s >= q1 - 1.5*iqr].min())
        hi    = float(s[s <= q3 + 1.5*iqr].max())
        rows.append({
            "name":    col[:14],
            "min":     _safe(lo),
            "q1":      _safe(q1),
            "median":  _safe(med),
            "q3":      _safe(q3),
            "max":     _safe(hi),
            "mean":    _safe(float(s.mean())),
            "outliers":[_safe(float(v)) for v in s[(s < lo) | (s > hi)].head(20)],
        })

    if rows:
        datasets.append({
            "id":    "box_plots",
            "title": "Distribution Box Plots",
            "data":  rows,
        })

    return datasets


# ── Main extender function ────────────────────────────────────────────────────
def extend_chart_data(df: pd.DataFrame, existing_chart_data: dict) -> dict:
    """
    Extend existing chart_data with advanced chart types.
    Non-destructive — only adds new keys.
    """
    extended = dict(existing_chart_data)

    extended["radar"]       = build_radar_data(df)
    extended["gauge"]       = build_gauge_data(df)
    extended["stacked_bar"] = build_stacked_bar_data(df)
    extended["heatmap"]     = build_heatmap_data(df)
    extended["correlation"] = build_correlation_matrix(df)
    extended["box_plot"]    = build_box_plot_data(df)

    # Update meta
    meta = extended.get("__meta__", {})
    meta["advanced_charts"] = ["radar","gauge","stacked_bar","heatmap","correlation","box_plot"]
    extended["__meta__"] = meta

    return extended