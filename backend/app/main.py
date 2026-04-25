# app/main.py  (v5 — safe, correct prefixes, DB optional)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Core routers (always required) ───────────────────────────────
from app.api.v1.chat import router as chat_router
from app.api.v1.file import router as file_router

# ── New project/dashboard routers (safe import — only if files exist) ──
try:
    from app.api.v1.projects     import router as projects_router
    from app.api.v1.dashboards   import router as dashboards_router
    from app.api.v1.chat_history import router as history_router
    from app.api.v1.datasets     import router as datasets_router
    _has_db_routers = True
except Exception as e:
    print(f"[WARN] DB routers not loaded (deploy db/ files to enable): {e}")
    _has_db_routers = False

# ── Enterprise router (safe import) ──────────────────────────────
try:
    from app.api.v1.enterprise import router as enterprise_router
    _has_enterprise = True
except Exception as e:
    print(f"[WARN] Enterprise module not loaded: {e}")
    _has_enterprise = False

# ── DB init (safe — only runs if db/ folder is deployed) ─────────
_init_db = None
try:
    from app.db.init_db import init_db as _init_db
except Exception:
    pass

app = FastAPI(title="AI Analytics Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    if _init_db:
        try:
            _init_db()
        except Exception as e:
            print(f"[WARN] DB init failed: {e}")
    print("[Server] Ready.")


# ── Always-on routers ─────────────────────────────────────────────
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(file_router, prefix="/api/v1/file", tags=["File"])

# ── DB-backed routers (only if deployed) ─────────────────────────
if _has_db_routers:
    app.include_router(projects_router,   prefix="/api/v1")
    app.include_router(dashboards_router, prefix="/api/v1")
    app.include_router(history_router,    prefix="/api/v1")
    app.include_router(datasets_router,   prefix="/api/v1")

if _has_enterprise:
    app.include_router(enterprise_router, prefix="/api/v1/enterprise")


@app.get("/")
def root():
    return {"status": "ok", "version": "2.0.0"}