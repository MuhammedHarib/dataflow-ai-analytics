# app/db/init_db.py
from sqlalchemy import text
from app.db.database import engine, SessionLocal
from app.db import models


def _run_migrations(conn):
    """
    Add columns that exist in the ORM but are missing from the actual SQLite file.
    Uses SQLAlchemy 2.0-compatible text() wrapper.
    ALTER TABLE is a no-op (caught exception) when the column already exists.
    """
    migrations = [
        ("datasets", "chart_data_json", "TEXT"),
        ("datasets", "profile_context", "TEXT"),
        ("datasets", "ai_session_id",   "VARCHAR(120)"),
    ]
    for table, column, col_type in migrations:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            print(f"[DB migration] Added {table}.{column}")
        except Exception:
            pass  # column already exists — fine


def init_db():
    """Create all tables, migrate missing columns, seed default user."""
    # 1. Create any brand-new tables
    models.Base.metadata.create_all(bind=engine)

    # 2. Add missing columns to existing tables (safe on every restart)
    with engine.begin() as conn:   # begin() auto-commits or rolls back
        _run_migrations(conn)

    # 3. Seed default user
    db = SessionLocal()
    try:
        existing = db.query(models.User).first()
        if not existing:
            db.add(models.User(id=1, name="Muhammad Harib", email="user@local.dev"))
            db.commit()
            print("[DB] Default user created.")
        else:
            print("[DB] Tables ready.")
    finally:
        db.close()