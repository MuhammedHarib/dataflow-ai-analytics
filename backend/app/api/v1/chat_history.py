# app/api/v1/chat_history.py
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

from app.db.database import get_db
from app.db.models import ChatSession, ChatMessage

router = APIRouter(prefix="/history", tags=["chat_history"])


# ── Schemas ─────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    project_id: Optional[int] = None   # None = standalone workspace chat (not tied to a project)
    dataset_id: Optional[int] = None
    session_id: Optional[str] = None   # in-memory key
    title:      Optional[str] = None

class MessageCreate(BaseModel):
    role:       str             # "user" | "assistant"
    content:    str
    has_chart:  bool            = False
    chart_json: Optional[Any]   = None

class MessageOut(BaseModel):
    id:         int
    session_id: int
    role:       str
    content:    str
    has_chart:  bool
    chart_json: Optional[Any]
    created_at: datetime

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id:         int
    project_id: int
    dataset_id: Optional[int]
    title:      Optional[str]
    session_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


# ── Sessions ─────────────────────────────────────────────────────────

@router.get("/sessions/{project_id}", response_model=list[SessionOut])
def list_sessions(project_id: int, db: Session = Depends(get_db)):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.project_id == project_id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [_session_out(s) for s in sessions]


@router.post("/sessions", response_model=SessionOut)
def create_session(body: SessionCreate, db: Session = Depends(get_db)):
    # No project_id = standalone workspace chat; return a transient session (not stored)
    if not body.project_id:
        from datetime import timezone
        now = datetime.utcnow()
        return SessionOut(
            id=-1, project_id=0, dataset_id=None,
            title=body.title or "Workspace chat",
            session_id=body.session_id,
            created_at=now, updated_at=now, message_count=0,
        )
    s = ChatSession(
        project_id=body.project_id,
        dataset_id=body.dataset_id,
        session_id=body.session_id,
        title=body.title or "New conversation",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _session_out(s)


@router.patch("/sessions/{session_id}/title")
def update_session_title(session_id: int, title: str, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    s.title = title
    s.updated_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()
    return {"deleted": True, "id": session_id}


# ── Messages ──────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/messages", response_model=list[MessageOut])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [_message_out(m) for m in msgs]


@router.post("/sessions/{session_id}/messages", response_model=MessageOut)
def add_message(session_id: int, body: MessageCreate, db: Session = Depends(get_db)):
    s = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")

    m = ChatMessage(
        session_id=session_id,
        role=body.role,
        content=body.content,
        has_chart=body.has_chart,
        chart_json=json.dumps(body.chart_json) if body.chart_json else None,
    )
    db.add(m)

    # Auto-title session from first user message
    if body.role == "user" and (not s.title or s.title == "New conversation"):
        s.title = body.content[:80] + ("…" if len(body.content) > 80 else "")

    s.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(m)
    return _message_out(m)


# ── Helpers ───────────────────────────────────────────────────────────

def _session_out(s: ChatSession) -> SessionOut:
    return SessionOut(
        id=s.id, project_id=s.project_id,
        dataset_id=s.dataset_id, title=s.title,
        session_id=s.session_id,
        created_at=s.created_at, updated_at=s.updated_at,
        message_count=len(s.messages),
    )

def _message_out(m: ChatMessage) -> MessageOut:
    chart = None
    if m.chart_json:
        try:
            chart = json.loads(m.chart_json)
        except Exception:
            chart = None
    return MessageOut(
        id=m.id, session_id=m.session_id, role=m.role,
        content=m.content, has_chart=m.has_chart, chart_json=chart,
        created_at=m.created_at,
    )