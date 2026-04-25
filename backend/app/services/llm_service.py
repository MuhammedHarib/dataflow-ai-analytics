# app/services/llm_service.py
"""
LLM Service — Groq-backed, token-optimized.

Optimizations:
- History capped at 6 turns; older turns summarized
- Smart section injection for follow-ups
- Dynamic max_tokens (800 short / 1800 full analysis)
- Temperature 0.2 for dataset queries

Dataset system prompt follows the full Data Analyst + Data Scientist framework:
  1. Dataset Understanding
  2. Domain Identification
  3. Field Identification
  4. Data Processing / Statistics
  5. Key Insights
  6. Data Science Opportunities
  7. Visualization Suggestions (returned as structured JSON block)
"""

import os
import re
import json
from dotenv import load_dotenv
from groq import Groq
from app.services.analysis_service import get_relevant_section

load_dotenv()

client            = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL             = "llama-3.3-70b-versatile"
MAX_HISTORY_TURNS = 6

# ── System prompts ────────────────────────────────────────────────────────────

SYSTEM_PLAIN = (
    "You are a precise AI assistant. "
    "Use markdown formatting. Be concise but complete."
)

SYSTEM_DATASET = """You are an expert Data Analyst and Data Scientist.
A DATASET PROFILE is provided. Respond ONLY using facts from that profile.

## CRITICAL RULES:
1. NEVER invent column names, statistics, or values not in the profile.
2. Cite exact numbers when answering statistical questions.
3. If information is not in the profile, say so explicitly.
4. Use markdown: headings, bullet points, bold for column names.
5. Build on prior conversation turns.

## WHEN ASKED FOR A SUMMARY OR FULL ANALYSIS, structure your response as:

### Dataset Overview
Brief description of shape, completeness, types.

### Domain & Field
Identify the business domain (Sales, Finance, Healthcare, Marketing, etc.) and professional field.
Explain your reasoning based on column names and values.

### Data Quality Assessment
Completeness %, duplicates, outliers, any issues detected.

### Key Insights
3–7 actionable insights derived strictly from the profile statistics.

### Data Science Opportunities
What models could be built: forecasting, classification, clustering, recommendations.
Be specific about which columns would be features vs targets.

### Recommended Visualizations
List 3–5 chart recommendations. For each:
- Chart type
- Which columns to use
- What insight it reveals

At the END of your response, append a JSON block (inside ```json fences) with this exact structure:
```json
{
  "viz_suggestions": [
    {"chart": "bar",       "title": "...", "reason": "..."},
    {"chart": "line",      "title": "...", "reason": "..."},
    {"chart": "pie",       "title": "...", "reason": "..."}
  ]
}
```
Use chart types from: bar, line, pie, scatter, histogram, area
Only include this JSON block when answering a summary/analysis question."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _trim_history(history: list) -> tuple[list, str]:
    if len(history) <= MAX_HISTORY_TURNS * 2:
        return history, ""
    older  = history[:-(MAX_HISTORY_TURNS * 2)]
    recent = history[-(MAX_HISTORY_TURNS * 2):]
    topics = [t["content"][:60] for t in older if t["role"] == "user"]
    return recent, "[Earlier: " + "; ".join(topics[:4]) + "]"


def _dynamic_max_tokens(question: str, wants_analysis: bool = False) -> int:
    if wants_analysis: return 1800
    if len(question) < 80: return 800
    return 1200


def _build_messages(system: str, history: list, new_user_msg: str) -> list:
    recent, summary = _trim_history(history)
    msgs = [{"role": "system", "content": system}]
    if summary:
        msgs.append({"role": "user",      "content": summary})
        msgs.append({"role": "assistant", "content": "Understood, I have context from earlier."})
    for turn in recent:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            msgs.append({"role": turn["role"], "content": turn["content"]})
    msgs.append({"role": "user", "content": new_user_msg})
    return msgs


def _extract_viz_suggestions(reply: str) -> tuple[str, list]:
    """
    Extract the ```json viz_suggestions block from reply text.
    Returns (clean_reply_without_json, viz_suggestions_list).
    """
    pattern = r"```json\s*(\{[\s\S]*?\})\s*```"
    match   = re.search(pattern, reply)
    if not match:
        return reply, []
    try:
        data = json.loads(match.group(1))
        suggestions = data.get("viz_suggestions", [])
        clean_reply = reply[:match.start()].rstrip() + reply[match.end():]
        return clean_reply.strip(), suggestions
    except Exception:
        return reply, []


# ── Public API ────────────────────────────────────────────────────────────────

def generate_ai_reply(message: str, history: list = None) -> dict:
    try:
        msgs = _build_messages(SYSTEM_PLAIN, history or [], message)
        res  = client.chat.completions.create(
            model=MODEL, messages=msgs,
            temperature=0.7,
            max_tokens=_dynamic_max_tokens(message),
        )
        return {"reply": res.choices[0].message.content, "source": "Groq",
                "warning": None, "viz_suggestions": []}
    except Exception as e:
        print(f"Groq Error (plain): {e}"); raise


def generate_dataset_reply(
    user_question:   str,
    profile_context: str,
    history:         list = None,
) -> dict:
    history     = history or []
    is_analysis = len(user_question) > 80 or any(
        w in user_question.lower()
        for w in ["analyz", "summar", "overview", "all", "full", "statistic",
                  "insight", "domain", "field", "opportunit", "recommend"]
    )

    relevant_profile    = get_relevant_section(user_question, profile_context)
    system_with_profile = f"{SYSTEM_DATASET}\n\nDATASET PROFILE:\n{relevant_profile}"
    user_message        = f"Question: {user_question}"

    try:
        msgs = _build_messages(system_with_profile, history, user_message)
        res  = client.chat.completions.create(
            model=MODEL, messages=msgs,
            temperature=0.2,
            max_tokens=_dynamic_max_tokens(user_question, wants_analysis=is_analysis),
        )
        raw_reply = res.choices[0].message.content
        clean_reply, viz_suggestions = _extract_viz_suggestions(raw_reply)

        return {
            "reply":           clean_reply,
            "source":          "Groq",
            "warning":         None,
            "viz_suggestions": viz_suggestions,
        }
    except Exception as e:
        print(f"Groq Error (dataset): {e}"); raise