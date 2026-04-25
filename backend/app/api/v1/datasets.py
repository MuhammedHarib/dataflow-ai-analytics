# app/api/v1/datasets.py
import io, json, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db.models import Dataset

router = APIRouter(prefix="/datasets", tags=["datasets"])

ALLOWED_TYPES = {
    ".csv": "csv", ".tsv": "tsv",
    ".xlsx": "xlsx", ".xls": "xls",
    ".json": "json", ".parquet": "parquet",
}

# ── Schemas ─────────────────────────────────────────────────────────

class DatasetRegister(BaseModel):
    project_id:  int
    file_name:   str
    session_id:  Optional[str] = None
    col_schema:  Optional[str] = None   # renamed from schema_json to avoid pydantic shadow
    row_count:   Optional[int] = 0
    col_count:   Optional[int] = 0
    size_bytes:  Optional[int] = 0

class DatasetOut(BaseModel):
    id:              int
    project_id:      int
    file_name:       str
    session_id:      Optional[str]
    col_schema:      Optional[str] = None   # ORM field: schema_json
    row_count:       int
    col_count:       int
    size_bytes:      int
    ai_session_id:   Optional[str] = None
    profile_context: Optional[str] = None
    created_at:      datetime

    model_config = {"from_attributes": True, "populate_by_name": True}

    @classmethod
    def from_orm_dataset(cls, d):
        return cls(
            id=d.id, project_id=d.project_id, file_name=d.file_name,
            session_id=d.session_id, col_schema=d.schema_json,
            row_count=d.row_count, col_count=d.col_count, size_bytes=d.size_bytes,
            ai_session_id=d.ai_session_id, profile_context=d.profile_context,
            created_at=d.created_at,
        )


# ── Routes ──────────────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=list[DatasetOut])
def list_datasets(project_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(Dataset)
        .filter(Dataset.project_id == project_id)
        .order_by(Dataset.created_at.desc())
        .all()
    )
    return [DatasetOut.from_orm_dataset(d) for d in rows]


@router.post("/project/{project_id}/upload", response_model=DatasetOut)
async def upload_dataset(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a file for a project. Supports CSV, TSV, XLSX, XLS, JSON, Parquet.
    - Parses rows → stores as chart_data_json (used by dashboard builder)
    - Computes AI profile_context → stored so project chat always has dataset knowledge
    - Creates an in-memory AI session (ai_session_id) → survives until server restart
    - One dataset per project — replaces any existing dataset.
    """
    try:
        import pandas as pd
    except ImportError:
        raise HTTPException(500, "pandas not installed: pip install pandas openpyxl pyarrow")

    filename = (file.filename or "upload").strip()
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type '{ext}'. Allowed: {', '.join(ALLOWED_TYPES)}")

    content  = await file.read()
    size_bytes = len(content)

    # ── Parse ──────────────────────────────────────────────────────
    try:
        buf   = io.BytesIO(content)
        ftype = ALLOWED_TYPES[ext]
        if   ftype == "csv":    df = pd.read_csv(buf, low_memory=False)
        elif ftype == "tsv":    df = pd.read_csv(buf, sep="\t", low_memory=False)
        elif ftype in ("xlsx", "xls"): df = pd.read_excel(buf)
        elif ftype == "json":   df = pd.read_json(buf)
        elif ftype == "parquet":df = pd.read_parquet(buf)
        else: raise HTTPException(400, "Unsupported type")
    except HTTPException: raise
    except Exception as e:
        raise HTTPException(422, f"Could not parse file: {e}")

    # ── Store rows (cap 8000) ───────────────────────────────────────
    MAX_ROWS = 8000
    df_store = df.head(MAX_ROWS).copy()
    headers  = [str(c) for c in df_store.columns]
    rows_raw = df_store.fillna("").to_dict("records")
    rows = []
    for row in rows_raw:
        clean = {}
        for k, v in row.items():
            if hasattr(v, "item"): v = v.item()
            elif hasattr(v, "isoformat"): v = v.isoformat()
            clean[str(k)] = v
        rows.append(clean)

    schema_obj      = {str(col): str(df[col].dtype) for col in df.columns}
    chart_data_json = json.dumps({"headers": headers, "rows": rows,
                                   "total_rows": len(df), "stored_rows": len(rows)},
                                  ensure_ascii=False)

    # ── Build AI profile_context + in-memory session ───────────────
    profile_context_str = None
    new_ai_session_id   = None
    try:
        from app.services.analysis_service import compute_profile, profile_to_llm_context
        from app.services.session_cache    import store_session
        profile                = compute_profile(df)
        profile_context_str    = profile_to_llm_context(profile, [], filename)
        new_ai_session_id      = str(uuid.uuid4())
        store_session(new_ai_session_id, df, profile_context_str, filename)
    except Exception as e:
        print(f"[datasets] AI profile build failed (non-fatal): {e}")

    # ── One dataset per project — replace existing ──────────────────
    for old in db.query(Dataset).filter(Dataset.project_id == project_id).all():
        db.delete(old)
    db.commit()

    d = Dataset(
        project_id      = project_id,
        file_name       = filename,
        schema_json     = json.dumps(schema_obj),
        row_count       = len(df),
        col_count       = len(df.columns),
        size_bytes      = size_bytes,
        chart_data_json = chart_data_json,
        profile_context = profile_context_str,
        ai_session_id   = new_ai_session_id,
    )
    db.add(d); db.commit(); db.refresh(d)
    return DatasetOut.from_orm_dataset(d)


@router.get("/{dataset_id}/chart-data")
def get_chart_data(dataset_id: int, db: Session = Depends(get_db)):
    """Return parsed rows for dashboard rendering."""
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d: raise HTTPException(404, "Dataset not found")
    if not d.chart_data_json:
        return {"headers": [], "rows": [], "total_rows": 0, "stored_rows": 0}
    return json.loads(d.chart_data_json)


@router.post("/{dataset_id}/revive-session")
def revive_session(dataset_id: int, db: Session = Depends(get_db)):
    """
    Rebuild the in-memory AI session from stored DB data.
    - Reconstructs DataFrame from chart_data_json
    - Recomputes profile_context if it is missing (e.g. datasets uploaded before this column existed)
    - Returns ai_session_id AND profile_context so the frontend can pass both to the AI
    """
    import uuid as _uuid
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d:
        raise HTTPException(404, "Dataset not found")

    if not d.chart_data_json:
        return {"ai_session_id": None, "profile_context": None, "revived": False}

    try:
        import pandas as pd
        from app.services.session_cache import get_session, store_session

        # Build DataFrame from stored rows
        chart_data = json.loads(d.chart_data_json)
        rows    = chart_data.get("rows", [])
        headers = chart_data.get("headers", [])
        df = pd.DataFrame(rows, columns=headers) if (rows and headers) else pd.DataFrame()

        # Recompute profile_context if missing (handles old datasets)
        profile_ctx = d.profile_context
        if not profile_ctx and not df.empty:
            try:
                from app.services.analysis_service import compute_profile, profile_to_llm_context
                profile     = compute_profile(df)
                profile_ctx = profile_to_llm_context(profile, [], d.file_name)
                d.profile_context = profile_ctx
                db.commit()
                db.refresh(d)   # ensure ORM reflects committed value
                print(f"[revive-session] Recomputed profile_context for dataset {dataset_id}")
            except Exception as pe:
                print(f"[revive-session] profile recompute failed: {pe}")
                profile_ctx = f"Dataset: {d.file_name}, {d.row_count} rows, {d.col_count} columns."

        # Check if in-memory session is already alive and valid
        if d.ai_session_id and get_session(d.ai_session_id):
            return {"ai_session_id": d.ai_session_id, "profile_context": profile_ctx, "revived": False}

        # (Re)build the in-memory session
        sid = d.ai_session_id or str(_uuid.uuid4())
        store_session(sid, df, profile_ctx or "", d.file_name)

        if sid != d.ai_session_id:
            d.ai_session_id = sid
            db.commit()

        return {"ai_session_id": sid, "profile_context": profile_ctx, "revived": True}

    except Exception as e:
        print(f"[revive-session] Failed: {e}")
        return {"ai_session_id": d.ai_session_id, "profile_context": d.profile_context, "revived": False, "error": str(e)}


@router.post("/register", response_model=DatasetOut)
def register_dataset(body: DatasetRegister, db: Session = Depends(get_db)):
    """Legacy: register a dataset from a chat-upload session."""
    d = Dataset(
        project_id=body.project_id, file_name=body.file_name,
        session_id=body.session_id, schema_json=body.col_schema,
        row_count=body.row_count or 0, col_count=body.col_count or 0,
        size_bytes=body.size_bytes or 0,
    )
    db.add(d); db.commit(); db.refresh(d)
    return DatasetOut.from_orm_dataset(d)


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d: raise HTTPException(404, "Dataset not found")
    db.delete(d); db.commit()
    return {"deleted": True, "id": dataset_id}


@router.patch("/{dataset_id}/session")
def update_session(dataset_id: int, session_id: str, db: Session = Depends(get_db)):
    d = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not d: raise HTTPException(404, "Dataset not found")
    d.session_id = session_id; db.commit()
    return {"ok": True}