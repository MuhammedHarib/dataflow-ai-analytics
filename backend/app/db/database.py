# app/db/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite — swap this single line for Postgres later:
# DATABASE_URL = "postgresql://user:pass@localhost/analyticsdb"
DATABASE_URL = "sqlite:///./analyticsdb.sqlite"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite only
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()