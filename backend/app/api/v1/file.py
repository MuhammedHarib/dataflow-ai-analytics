# app/api/v1/file.py
import os
import uuid
from fastapi import APIRouter, UploadFile, File
from app.schemas.response_schema import FilePreviewResponse
from app.services.file_service import save_upload_file_tmp, validate_and_preview

router = APIRouter()


@router.get("/health")
async def file_health():
    return {"message": "File API working ✅"}


@router.post("/preview")
async def file_preview(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel file.
    Returns structured validation results + data preview (first 20 rows).
    """
    request_id = str(uuid.uuid4())
    tmp_path = None

    try:
        tmp_path, file_size_bytes = await save_upload_file_tmp(file)

        result = validate_and_preview(
            file_path=tmp_path,
            file_name=file.filename,
            file_size_bytes=file_size_bytes,
        )

        # Pop the internal _df key (not meant for the response)
        result.pop("_df", None)

        return FilePreviewResponse(
            status=result["status"],
            request_id=request_id,
            preview=result.get("preview"),
            warnings=result.get("warnings", []),
            errors=result.get("errors", []),
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)