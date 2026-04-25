# app/api/v1/projects.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db.models import Project, Dataset, Dashboard, ChatSession

router = APIRouter(prefix="/projects", tags=["projects"])

DEFAULT_USER_ID = 1  # single-user for now; replace with JWT sub later


# ── Pydantic schemas ────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name:        str
    description: Optional[str] = None
    color:       Optional[str] = "#e05c2d"
    icon:        Optional[str] = "📊"

class ProjectUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    color:       Optional[str] = None
    icon:        Optional[str] = None

class ProjectOut(BaseModel):
    id:             int
    name:           str
    description:    Optional[str]
    color:          str
    icon:           str
    created_at:     datetime
    updated_at:     datetime
    dataset_count:  int = 0
    dashboard_count:int = 0
    chat_count:     int = 0

    class Config:
        from_attributes = True


# ── Routes ──────────────────────────────────────────────────────────

@router.get("/", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .filter(Project.user_id == DEFAULT_USER_ID)
        .order_by(Project.updated_at.desc())
        .all()
    )
    result = []
    for p in projects:
        result.append(ProjectOut(
            id=p.id, name=p.name, description=p.description,
            color=p.color, icon=p.icon,
            created_at=p.created_at, updated_at=p.updated_at,
            dataset_count=len(p.datasets),
            dashboard_count=len(p.dashboards),
            chat_count=len(p.chat_sessions),
        ))
    return result


@router.post("/", response_model=ProjectOut)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    p = Project(
        user_id=DEFAULT_USER_ID,
        name=body.name,
        description=body.description,
        color=body.color or "#e05c2d",
        icon=body.icon or "📊",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProjectOut(
        id=p.id, name=p.name, description=p.description,
        color=p.color, icon=p.icon,
        created_at=p.created_at, updated_at=p.updated_at,
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    return ProjectOut(
        id=p.id, name=p.name, description=p.description,
        color=p.color, icon=p.icon,
        created_at=p.created_at, updated_at=p.updated_at,
        dataset_count=len(p.datasets),
        dashboard_count=len(p.dashboards),
        chat_count=len(p.chat_sessions),
    )


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    if body.name        is not None: p.name        = body.name
    if body.description is not None: p.description = body.description
    if body.color       is not None: p.color       = body.color
    if body.icon        is not None: p.icon        = body.icon
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return ProjectOut(
        id=p.id, name=p.name, description=p.description,
        color=p.color, icon=p.icon,
        created_at=p.created_at, updated_at=p.updated_at,
        dataset_count=len(p.datasets),
        dashboard_count=len(p.dashboards),
        chat_count=len(p.chat_sessions),
    )


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    db.delete(p)
    db.commit()
    return {"deleted": True, "id": project_id}


@router.get("/{project_id}/summary")
def project_summary(project_id: int, db: Session = Depends(get_db)):
    """Returns sidebar tree data: datasets + dashboards + chat sessions."""
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")

    datasets = [
        {"id": d.id, "name": d.file_name, "rows": d.row_count,
         "session_id": d.session_id, "created_at": str(d.created_at)}
        for d in p.datasets
    ]
    dashboards = [
        {"id": d.id, "name": d.name, "scheme": d.scheme,
         "is_pinned": d.is_pinned, "updated_at": str(d.updated_at)}
        for d in p.dashboards
    ]
    chats = [
        {"id": c.id, "title": c.title or "Untitled chat",
         "dataset_id": c.dataset_id, "updated_at": str(c.updated_at)}
        for c in p.chat_sessions
    ]
    return {
        "id": p.id, "name": p.name, "color": p.color, "icon": p.icon,
        "datasets": datasets, "dashboards": dashboards, "chats": chats,
    }