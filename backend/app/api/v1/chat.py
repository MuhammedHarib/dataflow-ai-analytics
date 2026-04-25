# app/api/v1/chat.py
import os, uuid, json
from typing import Optional
from fastapi import APIRouter, UploadFile, Form, File

from app.schemas.response_schema    import ChatResponse, AnalysisData, VizSuggestion
from app.services.file_service      import save_upload_file_tmp, validate_and_preview
from app.services.analysis_service  import compute_profile, compute_chart_data, profile_to_llm_context
from app.services.llm_service       import generate_ai_reply, generate_dataset_reply
from app.services.image_service     import analyze_image, is_image_file
from app.services.session_cache     import store_session, get_session
from app.utils.intent_detector      import detect_intent

router = APIRouter()

DEFAULT_QUESTION = (
    "Analyze this dataset completely. Identify the domain and professional field, "
    "assess data quality, provide key insights, data science opportunities, "
    "and recommend visualizations."
)


@router.get("/test")
async def test():
    return {"message": "Chat API working 🚀"}


@router.post("/", response_model=ChatResponse)
async def chat(
    message:         str                  = Form(""),
    file:            Optional[UploadFile] = File(None),
    session_id:      Optional[str]        = Form(None),
    profile_context: Optional[str]        = Form(None),
    history:         Optional[str]        = Form(None),
):
    request_id = str(uuid.uuid4())
    warnings   = []
    tmp_path   = None

    parsed_history = []
    if history:
        try:
            parsed_history = json.loads(history)
        except Exception:
            pass

    user_question = message.strip() or DEFAULT_QUESTION
    intent        = detect_intent(user_question)

    # ── Route A: Image upload ─────────────────────────────────────────────
    if file and is_image_file(file.content_type):
        try:
            image_bytes = await file.read()
            result      = analyze_image(image_bytes, file.content_type, user_question)
            if result.get("warning"):
                warnings.append(result["warning"])
            return ChatResponse(
                status="ok", request_id=request_id,
                answer=result["reply"], source=result["source"],
                is_image_reply=True, warnings=warnings, errors=[],
            )
        except Exception as e:
            return ChatResponse(
                status="error", request_id=request_id,
                errors=[{"code":"IMAGE_ERROR","message":str(e),
                         "fix_hint":"Ensure image is JPEG, PNG or WebP."}],
            )

    # ── Route B: Follow-up on existing session ────────────────────────────
    if not file and session_id:
        session = get_session(session_id)
        if session:
            df         = session["df"]
            stored_ctx = session["profile_context"]
            file_name  = session["file_name"]

            # Casual greeting or off-topic — don't dump dataset analysis
            if intent["is_casual"]:
                result = generate_ai_reply(user_question, parsed_history)
                return ChatResponse(
                    status="ok", request_id=request_id,
                    answer=result["reply"], source=result["source"],
                    warnings=warnings, errors=[],
                )

            if intent["row_slice"]:
                n       = min(intent["row_slice"], len(df))
                profile = compute_profile(df.head(n))
                ctx     = profile_to_llm_context(profile, [], file_name)
                result  = generate_dataset_reply(user_question, ctx, parsed_history)
                return ChatResponse(
                    status="ok", request_id=request_id,
                    answer=result["reply"], source=result["source"],
                    analysis=_build_analysis(profile),
                    analysis_label=f"Analysis — first {n:,} rows",
                    viz_suggestions=_parse_viz(result.get("viz_suggestions", [])),
                    warnings=[f"Showing first {n:,} of {len(df):,} rows."], errors=[],
                )

            if intent["wants_analysis"]:
                if not df.empty:
                    profile    = compute_profile(df)
                    chart_data = compute_chart_data(df)
                    ctx        = profile_to_llm_context(profile, [], file_name)
                    store_session(session_id, df, ctx, file_name, chart_data=chart_data)
                else:
                    # DataFrame empty — use profile_context from form as context
                    profile    = None
                    chart_data = {}
                    ctx        = stored_ctx or profile_context or ""
                result = generate_dataset_reply(user_question, ctx, parsed_history)
                return ChatResponse(
                    status="ok", request_id=request_id,
                    answer=result["reply"], source=result["source"],
                    analysis=_build_analysis(profile) if profile else None,
                    analysis_label="Full Dataset Analysis" if profile else None,
                    chart_data=chart_data or None,
                    viz_suggestions=_parse_viz(result.get("viz_suggestions", [])),
                    warnings=warnings, errors=[],
                )

            # Specific dataset question — use best available context
            ctx_to_use = stored_ctx or profile_context or ""
            result = generate_dataset_reply(user_question, ctx_to_use, parsed_history)
            return ChatResponse(
                status="ok", request_id=request_id,
                answer=result["reply"], source=result["source"],
                viz_suggestions=_parse_viz(result.get("viz_suggestions", [])),
                chart_data=session.get("chart_data"),
                warnings=warnings, errors=[],
            )

    # ── Route C: Profile context fallback ────────────────────────────────
    if not file and profile_context:
        # Casual message — don't force dataset analysis
        if intent["is_casual"]:
            result = generate_ai_reply(user_question, parsed_history)
            return ChatResponse(
                status="ok", request_id=request_id,
                answer=result["reply"], source=result["source"],
                warnings=warnings, errors=[],
            )
        result = generate_dataset_reply(user_question, profile_context, parsed_history)
        return ChatResponse(
            status="ok", request_id=request_id,
            answer=result["reply"], source=result["source"],
            viz_suggestions=_parse_viz(result.get("viz_suggestions", [])),
            warnings=warnings, errors=[],
        )

    # ── Route D: Plain chat ───────────────────────────────────────────────
    if not file:
        result = generate_ai_reply(user_question, parsed_history)
        return ChatResponse(
            status="ok", request_id=request_id,
            answer=result["reply"], source=result["source"],
            warnings=warnings, errors=[],
        )

    # ── Route E: New dataset upload ───────────────────────────────────────
    try:
        tmp_path, file_size_bytes = await save_upload_file_tmp(file)
        validation = validate_and_preview(
            file_path=tmp_path, file_name=file.filename,
            file_size_bytes=file_size_bytes,
        )
        warnings.extend(validation.get("warnings", []))

        if validation["status"] in ("error", "sample_required"):
            return ChatResponse(
                status=validation["status"], request_id=request_id,
                warnings=warnings, errors=validation.get("errors", []),
            )

        preview_data = validation["preview"]
        df           = validation.get("_df")

        if df is None or df.empty:
            return ChatResponse(
                status="error", request_id=request_id, warnings=warnings,
                errors=[{"code":"EMPTY_DATASET","message":"File is empty.",
                         "fix_hint":"Upload a file with at least one row."}],
            )

        profile    = compute_profile(df)
        chart_data = compute_chart_data(df)
        ctx        = profile_to_llm_context(
            profile=profile,
            sample_rows=preview_data["sample_rows"],
            file_name=file.filename,
        )

        new_session_id = str(uuid.uuid4())
        store_session(new_session_id, df, ctx, file.filename, chart_data=chart_data)

        result = generate_dataset_reply(user_question, ctx, parsed_history)
        if result.get("warning"):
            warnings.append(result["warning"])

        show_analysis = intent["wants_analysis"] or intent["row_slice"] is not None
        analysis      = _build_analysis(profile) if show_analysis else None

        return ChatResponse(
            status="ok", request_id=request_id,
            answer=result["reply"], source=result["source"],
            preview=preview_data,
            analysis=analysis,
            analysis_label="Full Dataset Analysis" if show_analysis else None,
            profile_context=ctx,
            session_id=new_session_id,
            chart_data=chart_data,
            viz_suggestions=_parse_viz(result.get("viz_suggestions", [])),
            warnings=warnings, errors=[],
        )

    except Exception as e:
        import traceback; traceback.print_exc()
        return ChatResponse(
            status="error", request_id=request_id, warnings=warnings,
            errors=[{"code":"PIPELINE_ERROR","message":f"Unexpected error: {str(e)}",
                     "fix_hint":"Check server logs."}],
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


def _build_analysis(profile):
    return AnalysisData(
        overview=profile["overview"],
        missingness=profile["missingness"],
        numeric_stats=profile["numeric_stats"],
        outlier_summary=profile["outlier_summary"],
        categorical_summaries=profile["categorical_summaries"],
        date_analysis=profile["date_analysis"],
    )

def _parse_viz(raw):
    result = []
    for item in raw:
        try:
            result.append(VizSuggestion(
                chart=item.get("chart","bar"),
                title=item.get("title","Chart"),
                reason=item.get("reason",""),
            ))
        except Exception:
            pass
    return result