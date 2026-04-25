# app/db/models.py
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, Boolean, Float,
)
from sqlalchemy.orm import relationship
from app.db.database import Base


# ─── User ──────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(120), nullable=False, default="Default User")
    email      = Column(String(255), unique=True, nullable=False, default="user@local.dev")
    avatar_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects   = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


# ─── Project ────────────────────────────────────────────────────────
class Project(Base):
    __tablename__ = "projects"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    color       = Column(String(20), default="#e05c2d")   # accent color for the project card
    icon        = Column(String(10), default="📊")        # emoji icon
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner       = relationship("User", back_populates="projects")
    datasets    = relationship("Dataset",     back_populates="project", cascade="all, delete-orphan")
    dashboards  = relationship("Dashboard",   back_populates="project", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="project", cascade="all, delete-orphan")


# ─── Dataset ─────────────────────────────────────────────────────────
class Dataset(Base):
    __tablename__ = "datasets"

    id          = Column(Integer, primary_key=True, index=True)
    project_id  = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_name   = Column(String(300), nullable=False)
    file_path   = Column(String(512), nullable=True)   # server-side path
    session_id  = Column(String(100), nullable=True)   # in-memory session key
    schema_json = Column(Text, nullable=True)           # JSON: {col: type, ...}
    row_count   = Column(Integer, default=0)
    col_count   = Column(Integer, default=0)
    size_bytes       = Column(Integer, default=0)
    chart_data_json  = Column(Text, nullable=True)   # JSON: {headers, rows} for dashboard rendering
    profile_context  = Column(Text, nullable=True)   # LLM-formatted dataset profile string
    ai_session_id    = Column(String(120), nullable=True)  # in-memory session key
    created_at       = Column(DateTime, default=datetime.utcnow)

    project     = relationship("Project", back_populates="datasets")
    dashboards  = relationship("Dashboard", back_populates="dataset")
    chat_sessions = relationship("ChatSession", back_populates="dataset")


# ─── Dashboard ────────────────────────────────────────────────────────
class Dashboard(Base):
    __tablename__ = "dashboards"

    id          = Column(Integer, primary_key=True, index=True)
    project_id  = Column(Integer, ForeignKey("projects.id"), nullable=False)
    dataset_id  = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    name        = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    scheme      = Column(String(60), default="Metric Flow")  # color scheme name
    layout_json = Column(Text, nullable=True)                # full widget layout JSON
    thumbnail   = Column(String(512), nullable=True)         # base64 or URL
    is_pinned   = Column(Boolean, default=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project     = relationship("Project", back_populates="dashboards")
    dataset     = relationship("Dataset", back_populates="dashboards")


# ─── Chat Session ─────────────────────────────────────────────────────
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id          = Column(Integer, primary_key=True, index=True)
    project_id  = Column(Integer, ForeignKey("projects.id"), nullable=False)
    dataset_id  = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    title       = Column(String(300), nullable=True)       # auto-generated from first message
    session_id  = Column(String(100), nullable=True)       # in-memory session key
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project     = relationship("Project", back_populates="chat_sessions")
    dataset     = relationship("Dataset", back_populates="chat_sessions")
    messages    = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


# ─── Chat Message ──────────────────────────────────────────────────────
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id          = Column(Integer, primary_key=True, index=True)
    session_id  = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role        = Column(String(20), nullable=False)    # "user" | "assistant"
    content     = Column(Text, nullable=False)
    has_chart   = Column(Boolean, default=False)
    chart_json  = Column(Text, nullable=True)           # serialized chart spec if any
    created_at  = Column(DateTime, default=datetime.utcnow)

    session     = relationship("ChatSession", back_populates="messages")