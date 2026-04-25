# app/services/insight_engine.py
"""
MODULE 6 — AUTOMATED INSIGHT ENGINE
Trend detection, correlation detection, seasonality, anomaly detection, KPI monitoring.
Pure Python — no LLM required. Runs on pandas DataFrames.
"""

import pandas as pd
import numpy as np
from typing import Optional


def _safe(v):
    if isinstance(v, (np.integer,)):  return int(v)
    if isinstance(v, (np.floating,)): return None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
    if isinstance(v, float):          return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    return v


# ── Trend Detection ───────────────────────────────────────────────────────────
def detect_trends(df: pd.DataFrame) -> list[dict]:
    insights = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])]

    for col in num_cols[:10]:
        s = df[col].dropna().reset_index(drop=True)
        if len(s) < 10: continue
        half = len(s) // 2
        first_half  = s.iloc[:half].mean()
        second_half = s.iloc[half:].mean()
        if first_half == 0: continue
        change_pct = (second_half - first_half) / abs(first_half) * 100

        if abs(change_pct) >= 10:
            direction = "increased" if change_pct > 0 else "decreased"
            severity  = "high" if abs(change_pct) >= 30 else ("medium" if abs(change_pct) >= 15 else "low")
            insights.append({
                "type":      "trend",
                "column":    col,
                "direction": direction,
                "change_pct": round(change_pct, 1),
                "severity":  severity,
                "message":   f"{col} {direction} by {abs(change_pct):.1f}% in second half of dataset.",
            })

    return insights


# ── Correlation Detection ─────────────────────────────────────────────────────
def detect_correlations(df: pd.DataFrame) -> list[dict]:
    insights = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])][:8]
    if len(num_cols) < 2: return insights

    try:
        corr = df[num_cols].corr()
        for i, ca in enumerate(num_cols):
            for cb in num_cols[i+1:]:
                v = float(corr.loc[ca, cb])
                if np.isnan(v): continue
                if abs(v) >= 0.7:
                    rel = "strong positive" if v >= 0.7 else "strong negative"
                    insights.append({
                        "type":        "correlation",
                        "col_a":       ca,
                        "col_b":       cb,
                        "correlation": round(v, 3),
                        "severity":    "high" if abs(v) >= 0.85 else "medium",
                        "message":     f"{ca} and {cb} have a {rel} correlation ({v:.2f}).",
                    })
    except Exception:
        pass

    return insights[:10]


# ── Anomaly Detection ─────────────────────────────────────────────────────────
def detect_anomalies(df: pd.DataFrame) -> list[dict]:
    insights = []
    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])]

    for col in num_cols[:8]:
        s = df[col].dropna()
        if len(s) < 5: continue
        q1, q3 = s.quantile(0.25), s.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0: continue
        outliers = s[(s < q1 - 3*iqr) | (s > q3 + 3*iqr)]
        if len(outliers) > 0:
            pct = round(len(outliers) / len(s) * 100, 1)
            insights.append({
                "type":      "anomaly",
                "column":    col,
                "count":     int(len(outliers)),
                "pct":       pct,
                "examples":  [_safe(v) for v in outliers.head(3).values],
                "severity":  "high" if pct > 5 else "medium",
                "message":   f"{col} has {len(outliers)} extreme outliers ({pct}% of values).",
            })

    return insights


# ── Seasonality Detection ─────────────────────────────────────────────────────
def detect_seasonality(df: pd.DataFrame) -> list[dict]:
    insights = []
    date_cols = []
    for col in df.select_dtypes(include="object").columns:
        try:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().sum() / max(len(df), 1) > 0.8:
                date_cols.append((col, parsed))
        except Exception:
            pass

    if not date_cols: return insights

    num_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                if not any(k in c.lower() for k in ["id","index","key"])][:4]

    for date_col, dates in date_cols[:1]:
        for num_col in num_cols[:2]:
            try:
                tmp = df[[num_col]].copy()
                tmp["__month__"] = dates.dt.month
                monthly = tmp.groupby("__month__")[num_col].mean()
                if len(monthly) >= 3:
                    cv = monthly.std() / monthly.mean() if monthly.mean() != 0 else 0
                    if cv > 0.15:
                        peak_month = int(monthly.idxmax())
                        low_month  = int(monthly.idxmin())
                        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                        insights.append({
                            "type":       "seasonality",
                            "column":     num_col,
                            "date_col":   date_col,
                            "cv":         round(float(cv), 3),
                            "peak_month": months[peak_month-1],
                            "low_month":  months[low_month-1],
                            "severity":   "medium",
                            "message":    f"{num_col} shows seasonal variation. Peak: {months[peak_month-1]}, Low: {months[low_month-1]}.",
                        })
            except Exception:
                pass

    return insights


# ── KPI Monitoring ────────────────────────────────────────────────────────────
def monitor_kpis(df: pd.DataFrame) -> list[dict]:
    kpi_keywords = ["revenue","sales","profit","cost","amount","total","value","price","fee","gross","net"]
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    kpi_cols = [c for c in num_cols if any(k in c.lower() for k in kpi_keywords)][:6]

    alerts = []
    for col in kpi_cols:
        s = df[col].dropna()
        if len(s) < 4: continue
        recent = s.iloc[-max(1, len(s)//10):].mean()
        overall = s.mean()
        if overall == 0: continue
        deviation = (recent - overall) / abs(overall) * 100
        if abs(deviation) >= 15:
            direction = "above" if deviation > 0 else "below"
            alerts.append({
                "type":        "kpi_alert",
                "kpi":         col,
                "current":     _safe(recent),
                "baseline":    _safe(overall),
                "deviation_pct": round(deviation, 1),
                "direction":   direction,
                "severity":    "high" if abs(deviation) >= 30 else "medium",
                "message":     f"{col} is {abs(deviation):.1f}% {direction} baseline average.",
            })

    return alerts


def run_all_insights(df: pd.DataFrame) -> dict:
    """Run all insight detectors. Returns combined report."""
    trends       = detect_trends(df)
    correlations = detect_correlations(df)
    anomalies    = detect_anomalies(df)
    seasonality  = detect_seasonality(df)
    kpi_alerts   = monitor_kpis(df)

    all_insights = trends + correlations + anomalies + seasonality + kpi_alerts
    high_priority = [i for i in all_insights if i.get("severity") == "high"]

    return {
        "trends":        trends,
        "correlations":  correlations,
        "anomalies":     anomalies,
        "seasonality":   seasonality,
        "kpi_alerts":    kpi_alerts,
        "total_insights": len(all_insights),
        "high_priority":  len(high_priority),
        "summary_text":  _build_summary(trends, correlations, anomalies, kpi_alerts),
    }


def _build_summary(trends, correlations, anomalies, kpi_alerts) -> str:
    parts = []
    if trends:
        strongest = max(trends, key=lambda x: abs(x["change_pct"]))
        parts.append(strongest["message"])
    if correlations:
        parts.append(correlations[0]["message"])
    if anomalies:
        parts.append(anomalies[0]["message"])
    if kpi_alerts:
        parts.append(kpi_alerts[0]["message"])
    return " ".join(parts) if parts else "No significant insights detected."


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 7 — DASHBOARD AUTO-GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def auto_generate_dashboard(chart_data: dict, insights: dict, agent_report: dict) -> dict:
    """
    Automatically generate an optimized dashboard layout from:
    - chart_data (from analysis_service)
    - insights (from insight_engine)
    - agent_report (from ai_analyst_agent)
    """
    import uuid
    widgets = []

    kpis       = agent_report.get("recommended_kpis", [])
    layout_rec = agent_report.get("dashboard_layout", [])
    measures   = chart_data.get("__measures__", {})

    # Place recommended KPIs in row 0
    for i, kpi in enumerate(kpis[:4]):
        col_name = kpi.get("column", kpi.get("name", "value"))
        agg_data = measures.get(col_name, {}).get("agg", {})
        widgets.append({
            "id":       str(uuid.uuid4())[:8],
            "type":     "kpi",
            "title":    kpi["name"],
            "metric":   col_name,
            "position": {"x": i*3, "y": 0, "w": 3, "h": 2},
            "data":     agg_data,
            "config":   {"value": agg_data.get("sum", agg_data.get("avg", 0)),
                         "growth_rate_pct": measures.get(col_name, {}).get("growth_rate_pct", 0),
                         "format": measures.get(col_name, {}).get("format", "number")},
        })

    # Suggested charts from agent
    suggested = agent_report.get("suggested_charts", [])
    positions = [
        {"x": 0, "y": 2, "w": 8, "h": 4},
        {"x": 8, "y": 2, "w": 4, "h": 4},
        {"x": 0, "y": 6, "w": 6, "h": 4},
        {"x": 6, "y": 6, "w": 6, "h": 4},
    ]
    for i, sc in enumerate(suggested[:4]):
        chart_type = sc.get("chart", "bar")
        metric     = sc.get("y", sc.get("x", "value"))
        datasets   = chart_data.get(chart_type, [])
        match      = next((d for d in datasets if metric.lower() in d.get("id","").lower()), None)
        data       = match["data"] if match else (datasets[0]["data"] if datasets else [])
        widgets.append({
            "id":       str(uuid.uuid4())[:8],
            "type":     chart_type,
            "title":    sc.get("title", f"{metric} chart"),
            "metric":   metric,
            "position": positions[i] if i < len(positions) else {"x": 0, "y": 10+i*4, "w": 6, "h": 4},
            "data":     data,
            "xKey":     sc.get("x", "name"),
            "yKey":     sc.get("y", "value"),
        })

    # Insight alerts row at bottom
    high_alerts = [ins for ins in
                   (insights.get("kpi_alerts", []) + insights.get("anomalies", []))
                   if ins.get("severity") == "high"][:3]
    for i, alert in enumerate(high_alerts):
        widgets.append({
            "id":       str(uuid.uuid4())[:8],
            "type":     "alert_card",
            "title":    alert.get("kpi", alert.get("column", "Alert")),
            "metric":   alert.get("kpi", alert.get("column", "")),
            "position": {"x": i*4, "y": 14, "w": 4, "h": 2},
            "data":     alert,
            "config":   {"severity": alert.get("severity", "medium"),
                         "message":  alert.get("message", "")},
        })

    return {
        "id":         str(uuid.uuid4())[:8],
        "title":      f"Auto Dashboard — {agent_report.get('dataset_domain','Analytics').title()}",
        "auto":       True,
        "theme":      "neon_dark",
        "grid_cols":  12,
        "widgets":    widgets,
        "insights":   insights.get("summary_text", ""),
        "quality_score": agent_report.get("data_quality_score", 0),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 8 — COLLABORATION SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

import json as _json
from datetime import datetime as _dt

_shared_dashboards: dict  = {}   # dashboard_id → dashboard dict
_workspace_members: dict  = {}   # workspace_id → [user_ids]
_reports:           list  = []   # export records


def share_dashboard(dashboard: dict, owner: str = "user") -> str:
    """Create a shareable link token for a dashboard."""
    import hashlib, time
    token = hashlib.md5(f"{dashboard.get('id','')}{time.time()}".encode()).hexdigest()[:12]
    _shared_dashboards[token] = {
        "dashboard": dashboard,
        "owner":     owner,
        "shared_at": _dt.utcnow().isoformat(),
        "views":     0,
    }
    return token


def get_shared_dashboard(token: str) -> dict | None:
    entry = _shared_dashboards.get(token)
    if entry:
        entry["views"] += 1
        return entry["dashboard"]
    return None


def export_dashboard_json(dashboard: dict) -> str:
    """Export dashboard as JSON string."""
    return _json.dumps(dashboard, indent=2)


def schedule_report(dashboard_id: str, frequency: str, recipients: list[str]) -> dict:
    """Schedule a report (stub — would use Celery/cron in production)."""
    report = {
        "id":          f"report_{len(_reports)+1}",
        "dashboard_id": dashboard_id,
        "frequency":   frequency,
        "recipients":  recipients,
        "created_at":  _dt.utcnow().isoformat(),
        "next_run":    _dt.utcnow().isoformat(),
        "status":      "scheduled",
    }
    _reports.append(report)
    return report


def list_shared_dashboards() -> list[dict]:
    return [{"token": k, "title": v["dashboard"].get("title",""), "views": v["views"]}
            for k, v in _shared_dashboards.items()]


# ═══════════════════════════════════════════════════════════════════════════════
# MODULE 10 — PERFORMANCE OPTIMIZATION
# ═══════════════════════════════════════════════════════════════════════════════

import time as _time
import threading

_analysis_cache: dict = {}   # cache_key → {result, ts, ttl}
_cache_lock = threading.Lock()
_CACHE_TTL  = 1800   # 30 min default


def cache_key(file_name: str, operation: str) -> str:
    return f"{file_name}::{operation}"


def cache_get(key: str):
    with _cache_lock:
        entry = _analysis_cache.get(key)
        if not entry: return None
        if _time.time() - entry["ts"] > entry["ttl"]:
            del _analysis_cache[key]
            return None
        return entry["result"]


def cache_set(key: str, result, ttl: int = _CACHE_TTL):
    with _cache_lock:
        _analysis_cache[key] = {"result": result, "ts": _time.time(), "ttl": ttl}


def cache_invalidate(file_name: str):
    with _cache_lock:
        to_del = [k for k in _analysis_cache if k.startswith(f"{file_name}::")]
        for k in to_del:
            del _analysis_cache[k]


def cache_stats() -> dict:
    with _cache_lock:
        now = _time.time()
        live = [k for k, v in _analysis_cache.items() if now - v["ts"] <= v["ttl"]]
        return {"total_keys": len(_analysis_cache), "live_keys": len(live), "hit_keys": live}


def lazy_load_columns(df, column_subset: list[str]):
    """Return only needed columns for a specific analysis — reduces memory."""
    available = [c for c in column_subset if c in df.columns]
    return df[available] if available else df


def optimize_dataframe(df):
    """Downcast numeric types to reduce memory usage ~40%."""
    for col in df.select_dtypes(include=["int64"]).columns:
        try: df[col] = pd.to_numeric(df[col], downcast="integer")
        except: pass
    for col in df.select_dtypes(include=["float64"]).columns:
        try: df[col] = pd.to_numeric(df[col], downcast="float")
        except: pass
    return df