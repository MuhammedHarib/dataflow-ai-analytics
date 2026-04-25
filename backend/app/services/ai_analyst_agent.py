# app/services/ai_analyst_agent.py
"""
MODULE 4 — AI DATA ANALYST AGENT
Multi-capability agent: executive summaries, KPI recommendations,
auto dashboard layout, trend explanations, ML opportunity detection.
Integrates with existing llm_service.py via separate prompt system.
"""

import json
import re
from typing import Optional


AGENT_SYSTEM_PROMPT = """You are an elite Enterprise Data Analytics AI Agent.
You analyze datasets and produce structured JSON intelligence reports.

Given a dataset profile, you MUST respond with ONLY valid JSON in this exact structure:
{
  "dataset_domain": "string — one of: sales, finance, marketing, operations, healthcare, hr, logistics, retail, other",
  "business_context": "2-3 sentence business context description",
  "executive_summary": "3-5 sentence executive summary for C-suite",
  "recommended_kpis": [
    {"name": "KPI name", "column": "column name or derived", "formula": "formula if calculated", "rationale": "why this KPI matters"}
  ],
  "key_findings": [
    {"finding": "specific finding text", "impact": "high|medium|low", "category": "trend|anomaly|correlation|insight"}
  ],
  "suggested_charts": [
    {"chart": "bar|line|pie|area|scatter|histogram|gauge|radar", "x": "x-axis column", "y": "y-axis column", "title": "chart title", "priority": 1}
  ],
  "dashboard_layout": [
    {"widget": "kpi|line_chart|bar_chart|pie_chart|gauge|radar|ranking_table", "metric": "column/measure name", "position": {"x":0,"y":0,"w":3,"h":2}}
  ],
  "ml_opportunities": [
    {"type": "regression|classification|clustering|forecasting|anomaly_detection", "target": "target column", "features": ["col1","col2"], "business_value": "description"}
  ],
  "data_quality_score": 0-100,
  "actionable_recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

CRITICAL: Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON."""


def build_agent_prompt(profile_context: str) -> str:
    return f"""Analyze this dataset profile and produce the full intelligence report:

{profile_context}

Return ONLY valid JSON matching the required structure."""


def parse_agent_response(raw: str) -> dict:
    """Extract and parse JSON from LLM agent response."""
    # Strip markdown fences
    text = re.sub(r"```json\s*", "", raw)
    text = re.sub(r"```\s*", "", text)
    text = text.strip()

    # Find JSON boundaries
    start = text.find("{")
    end   = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON found in agent response")

    return json.loads(text[start:end])


async def run_agent(profile_context: str, groq_client, model: str) -> dict:
    """
    Run the AI Analyst Agent using the existing Groq client.
    Returns structured intelligence report.
    """
    try:
        response = groq_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system",  "content": AGENT_SYSTEM_PROMPT},
                {"role": "user",    "content": build_agent_prompt(profile_context)},
            ],
            temperature=0.1,
            max_tokens=2000,
        )
        raw    = response.choices[0].message.content
        result = parse_agent_response(raw)
        result["__source__"] = "ai_agent"
        result["__model__"]  = model
        return result

    except json.JSONDecodeError as e:
        return _fallback_agent_report(profile_context, str(e))
    except Exception as e:
        return _fallback_agent_report(profile_context, str(e))


def _fallback_agent_report(profile_context: str, error: str = "") -> dict:
    """
    Rule-based fallback when LLM fails.
    Extracts info from profile_context text.
    """
    lines = profile_context.split("\n")
    shape_line = next((l for l in lines if l.startswith("SHAPE:")), "SHAPE:0r x 0c")
    num_line   = next((l for l in lines if l.startswith("TYPES:")), "")
    file_line  = next((l for l in lines if l.startswith("FILE:")), "FILE:unknown")

    file_name = file_line.replace("FILE:", "").strip()

    # Detect numeric column names from NUM: section
    num_section = False
    num_cols    = []
    cat_cols    = []
    for line in lines:
        if line.startswith("NUM:"): num_section = True; continue
        if line.startswith("CAT:"): num_section = False
        if num_section and line.startswith(" "):
            col = line.strip().split(":")[0]
            num_cols.append(col)
        if line.startswith(" ") and "uniq=" in line:
            col = line.strip().split("(")[0]
            cat_cols.append(col)

    kpi_keywords = ["revenue","sales","profit","cost","amount","total","value","price","fee","gross","net"]
    kpi_cols = [c for c in num_cols if any(k in c.lower() for k in kpi_keywords)][:4]

    return {
        "dataset_domain":  "analytics",
        "business_context": f"Dataset '{file_name}' contains structured business data ready for analysis.",
        "executive_summary": f"This dataset contains measurable metrics including {', '.join(num_cols[:3]) or 'various numeric fields'}. Analysis reveals opportunities for operational insights and performance measurement.",
        "recommended_kpis": [{"name": c, "column": c, "formula": f"SUM({c})", "rationale": "Key financial metric"} for c in kpi_cols],
        "key_findings": [
            {"finding": f"Dataset contains {len(num_cols)} numeric and {len(cat_cols)} categorical columns", "impact": "high", "category": "insight"},
        ],
        "suggested_charts": [
            {"chart": "bar",  "x": cat_cols[0] if cat_cols else "category", "y": num_cols[0] if num_cols else "value", "title": "Category Analysis", "priority": 1},
            {"chart": "line", "x": "date",  "y": num_cols[0] if num_cols else "value", "title": "Trend Over Time", "priority": 2},
            {"chart": "pie",  "x": cat_cols[0] if cat_cols else "category", "y": "count", "title": "Distribution", "priority": 3},
        ],
        "dashboard_layout": [
            {"widget": "kpi",        "metric": kpi_cols[0] if kpi_cols else "value", "position": {"x":0,"y":0,"w":3,"h":2}},
            {"widget": "line_chart", "metric": num_cols[0] if num_cols else "value",  "position": {"x":3,"y":0,"w":9,"h":4}},
            {"widget": "bar_chart",  "metric": num_cols[1] if len(num_cols)>1 else (num_cols[0] if num_cols else "value"), "position": {"x":0,"y":4,"w":6,"h":4}},
            {"widget": "pie_chart",  "metric": cat_cols[0] if cat_cols else "category", "position": {"x":6,"y":4,"w":6,"h":4}},
        ],
        "ml_opportunities": [
            {"type": "forecasting", "target": num_cols[0] if num_cols else "value", "features": num_cols[1:4], "business_value": "Predict future values for planning"},
        ],
        "data_quality_score": 75,
        "actionable_recommendations": [
            "Establish baseline KPIs and track changes over time",
            "Investigate outliers in numeric columns for data quality issues",
            "Build forecasting model to project trends",
        ],
        "__source__": "fallback",
        "__error__":  error,
    }


def generate_executive_summary(agent_report: dict) -> str:
    """Generate a formatted executive summary from agent report."""
    domain   = agent_report.get("dataset_domain", "analytics").title()
    summary  = agent_report.get("executive_summary", "")
    kpis     = agent_report.get("recommended_kpis", [])
    findings = agent_report.get("key_findings", [])
    score    = agent_report.get("data_quality_score", 0)
    recs     = agent_report.get("actionable_recommendations", [])

    kpi_names   = ", ".join(k["name"] for k in kpis[:4]) if kpis else "N/A"
    high_impact = [f["finding"] for f in findings if f.get("impact") == "high"][:3]

    lines = [
        f"## Executive Summary — {domain} Analytics",
        "",
        summary,
        "",
        f"**Recommended KPIs:** {kpi_names}",
        f"**Data Quality Score:** {score}/100",
        "",
        "**Key Findings:**",
    ]
    for f in high_impact:
        lines.append(f"• {f}")
    lines.append("")
    lines.append("**Recommendations:**")
    for r in recs[:3]:
        lines.append(f"• {r}")

    return "\n".join(lines)