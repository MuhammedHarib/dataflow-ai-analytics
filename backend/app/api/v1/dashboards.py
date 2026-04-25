# app/api/v1/dashboards.py
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

from app.db.database import get_db
from app.db.models import Dashboard

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


# ── Schemas ─────────────────────────────────────────────────────────

class DashboardCreate(BaseModel):
    project_id:  int
    dataset_id:  Optional[int]  = None
    name:        str
    description: Optional[str]  = None
    scheme:      Optional[str]  = "Metric Flow"
    layout:      Optional[Any]  = None   # full widget layout dict

class DashboardUpdate(BaseModel):
    name:        Optional[str]  = None
    description: Optional[str]  = None
    scheme:      Optional[str]  = None
    layout:      Optional[Any]  = None
    is_pinned:   Optional[bool] = None

class DashboardOut(BaseModel):
    id:          int
    project_id:  int
    dataset_id:  Optional[int]
    name:        str
    description: Optional[str]
    scheme:      str
    layout:      Optional[Any]
    is_pinned:   bool
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


# ── Routes ──────────────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=list[DashboardOut])
def list_dashboards(project_id: int, db: Session = Depends(get_db)):
    dashboards = (
        db.query(Dashboard)
        .filter(Dashboard.project_id == project_id)
        .order_by(Dashboard.is_pinned.desc(), Dashboard.updated_at.desc())
        .all()
    )
    return [_to_out(d) for d in dashboards]


@router.post("/", response_model=DashboardOut)
def create_dashboard(body: DashboardCreate, db: Session = Depends(get_db)):
    d = Dashboard(
        project_id=body.project_id,
        dataset_id=body.dataset_id,
        name=body.name,
        description=body.description,
        scheme=body.scheme or "Metric Flow",
        layout_json=json.dumps(body.layout) if body.layout else None,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return _to_out(d)


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: int, db: Session = Depends(get_db)):
    d = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not d:
        raise HTTPException(404, "Dashboard not found")
    return _to_out(d)


@router.patch("/{dashboard_id}", response_model=DashboardOut)
def update_dashboard(dashboard_id: int, body: DashboardUpdate, db: Session = Depends(get_db)):
    d = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not d:
        raise HTTPException(404, "Dashboard not found")
    if body.name        is not None: d.name        = body.name
    if body.description is not None: d.description = body.description
    if body.scheme      is not None: d.scheme      = body.scheme
    if body.is_pinned   is not None: d.is_pinned   = body.is_pinned
    if body.layout      is not None: d.layout_json = json.dumps(body.layout)
    d.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(d)
    return _to_out(d)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: int, db: Session = Depends(get_db)):
    d = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not d:
        raise HTTPException(404, "Dashboard not found")
    db.delete(d)
    db.commit()
    return {"deleted": True, "id": dashboard_id}


# ── Helper ──────────────────────────────────────────────────────────

def _to_out(d: Dashboard) -> DashboardOut:
    layout = None
    if d.layout_json:
        try:
            layout = json.loads(d.layout_json)
        except Exception:
            layout = None
    return DashboardOut(
        id=d.id, project_id=d.project_id, dataset_id=d.dataset_id,
        name=d.name, description=d.description, scheme=d.scheme,
        layout=layout, is_pinned=d.is_pinned,
        created_at=d.created_at, updated_at=d.updated_at,
    )