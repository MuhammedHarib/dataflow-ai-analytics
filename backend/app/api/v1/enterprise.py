# app/api/v1/enterprise.py
"""
ENTERPRISE API ENDPOINTS
New routes for all enterprise modules.
Mount at /api/v1/enterprise/
"""

import uuid
import json
from typing import Optional
from fastapi import APIRouter, Form, WebSocket, WebSocketDisconnect, HTTPException

from app.services.session_cache                  import get_session
from app.services.data_modeling_service          import build_semantic_model
from app.services.dashboard_engine               import build_dashboard_layout, get_themes
from app.services.advanced_visualization_service import extend_chart_data
from app.services.insight_engine                 import (
    run_all_insights,
    auto_generate_dashboard,
    share_dashboard,
    get_shared_dashboard,
    export_dashboard_json,
    schedule_report,
    list_shared_dashboards,
    cache_stats,
    optimize_dataframe,
)
from app.services.realtime_service import (
    manager, handle_websocket, create_stream_config, get_stream_types
)

router = APIRouter()


# ── Health ─────────────────────────────────────────────────────────────────────
@router.get("/health")
async def enterprise_health():
    return {"status": "ok", "modules": [
        "data_modeling", "dashboard_engine", "realtime", "ai_agent",
        "advanced_viz", "insight_engine", "auto_dashboard", "collaboration", "performance",
    ]}


# ── Module 1: Semantic Data Model ──────────────────────────────────────────────
@router.post("/semantic-model")
async def get_semantic_model(session_id: str = Form(...)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")
    df    = session["df"]
    model = build_semantic_model(df, session.get("file_name", ""))
    return {"status": "ok", "model": model}


# ── Module 2: Dashboard Builder ────────────────────────────────────────────────
@router.post("/dashboard/build")
async def build_dashboard(
    session_id:  str = Form(...),
    layout_type: str = Form("executive"),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")

    df         = session["df"]
    chart_data = session.get("chart_data", {})
    model      = build_semantic_model(df, session.get("file_name", ""))
    dashboard  = build_dashboard_layout(chart_data, model, layout_type)
    return {"status": "ok", "dashboard": dashboard}


@router.get("/dashboard/themes")
async def get_dashboard_themes():
    return {"themes": get_themes()}


@router.post("/dashboard/share")
async def share_dashboard_endpoint(dashboard_json: str = Form(...)):
    dashboard = json.loads(dashboard_json)
    token     = share_dashboard(dashboard)
    return {"status": "ok", "token": token, "url": f"/dashboard/shared/{token}"}


@router.get("/dashboard/shared/{token}")
async def get_shared(token: str):
    db = get_shared_dashboard(token)
    if not db:
        raise HTTPException(404, "Dashboard not found or link expired")
    return {"status": "ok", "dashboard": db}


@router.get("/dashboard/list")
async def list_dashboards():
    return {"dashboards": list_shared_dashboards()}


# ── Module 3: Real-time WebSocket ──────────────────────────────────────────────
@router.websocket("/realtime/{stream_type}")
async def realtime_ws(
    websocket:   WebSocket,
    stream_type: str,
    interval_ms: int = 1000,
    label:       str = None,
    y_label:     str = None,
    x_label:     str = "Time",
):
    stream_id = str(uuid.uuid4())[:8]
    config    = create_stream_config(
        stream_type=stream_type,
        label=label,
        interval_ms=interval_ms,
        y_axis_label=y_label,
        x_axis_label=x_label,
    )
    try:
        await handle_websocket(websocket, stream_id, config)
    except WebSocketDisconnect:
        manager.disconnect(stream_id)


@router.get("/realtime/types")
async def stream_types():
    return {"types": get_stream_types()}


# ── Module 5: Advanced Visualizations ─────────────────────────────────────────
@router.post("/advanced-charts")
async def get_advanced_charts(session_id: str = Form(...)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")

    df         = session["df"]
    chart_data = session.get("chart_data", {})
    extended   = extend_chart_data(df, chart_data)
    return {"status": "ok", "chart_data": extended}


# ── Module 6: Insight Engine ───────────────────────────────────────────────────
@router.post("/insights")
async def get_insights(session_id: str = Form(...)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")

    df       = session["df"]
    insights = run_all_insights(df)
    return {"status": "ok", "insights": insights}


# ── Module 7: Auto Dashboard ──────────────────────────────────────────────────
@router.post("/auto-dashboard")
async def auto_dashboard(
    session_id: str  = Form(...),
    agent_json: Optional[str] = Form(None),
):
    session = get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found or expired")

    df         = session["df"]
    chart_data = dict(session.get("chart_data", {}))
    insights   = run_all_insights(df)

    if agent_json:
        agent_report = json.loads(agent_json)
    else:
        from app.services.ai_analyst_agent import _fallback_agent_report
        agent_report = _fallback_agent_report(session.get("profile_context", ""))

    # Attach measures so widgets can bind to real data
    from app.services.data_modeling_service import define_measures
    measures = define_measures(df)
    chart_data["__measures__"] = {m["name"]: m for m in measures}

    dashboard = auto_generate_dashboard(chart_data, insights, agent_report)
    return {"status": "ok", "dashboard": dashboard}


# ── Module 8: Collaboration ────────────────────────────────────────────────────
@router.post("/reports/schedule")
async def schedule_report_endpoint(
    dashboard_id: str = Form(...),
    frequency:    str = Form("weekly"),
    recipients:   str = Form(""),
):
    recipient_list = [r.strip() for r in recipients.split(",") if r.strip()]
    report = schedule_report(dashboard_id, frequency, recipient_list)
    return {"status": "ok", "report": report}


@router.post("/reports/export")
async def export_report(dashboard_json: str = Form(...)):
    dashboard = json.loads(dashboard_json)
    exported  = export_dashboard_json(dashboard)
    return {"status": "ok", "json": exported}


# ── Module 10: Performance ─────────────────────────────────────────────────────
@router.get("/cache/stats")
async def get_cache_stats():
    return {"status": "ok", "cache": cache_stats()}