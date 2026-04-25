# app/services/data_modeling_service.py
"""
MODULE 1 — ADVANCED DATA MODELING ENGINE
Semantic data models: relationships, measures, hierarchies, aggregations.
Fully additive — does not modify existing analysis_service.py.
"""

import pandas as pd
import numpy as np
from typing import Optional


def _safe(v):
    if isinstance(v, (np.integer,)): return int(v)
    if isinstance(v, (np.floating,)):
        return None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
    if isinstance(v, float):
        return None if (np.isnan(v) or np.isinf(v)) else round(v, 4)
    return v


def _guess_format(col: str) -> str:
    col_l = col.lower()
    if any(k in col_l for k in ["price", "revenue", "sales", "cost", "amount", "fee", "pay", "value"]):
        return "currency"
    if any(k in col_l for k in ["rate", "pct", "percent", "ratio", "margin"]):
        return "percentage"
    if any(k in col_l for k in ["count", "qty", "quantity", "num", "total"]):
        return "integer"
    return "number"


def create_relationships(df: pd.DataFrame) -> list[dict]:
    """Auto-detect dimension→fact and potential FK relationships."""
    relationships = []
    cols      = df.columns.tolist()
    num_cols  = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols  = df.select_dtypes(include="object").columns.tolist()
    id_cols   = [c for c in cols if any(k in c.lower() for k in ["id","key","code","ref","no","num"])]

    # ID → ID potential joins
    for i, col_a in enumerate(id_cols[:8]):
        for col_b in id_cols[i+1:8]:
            try:
                shared = set(df[col_a].dropna().astype(str)) & set(df[col_b].dropna().astype(str))
                if len(shared) > 2:
                    relationships.append({
                        "from_col":    col_a,
                        "to_col":      col_b,
                        "type":        "potential_join",
                        "shared_keys": len(shared),
                        "confidence":  round(len(shared) / max(df[col_a].nunique(), 1), 2),
                    })
            except Exception:
                pass

    # Dimension → Fact (category explains numeric)
    for cat in cat_cols[:6]:
        for num in num_cols[:6]:
            try:
                grp = df.groupby(cat)[num].mean()
                if len(grp) >= 2:
                    relationships.append({
                        "from_col":    cat,
                        "to_col":      num,
                        "type":        "dimension_to_fact",
                        "cardinality": int(df[cat].nunique()),
                        "avg_per_dim": {str(k): _safe(v) for k, v in grp.head(5).items()},
                        "confidence":  0.85,
                    })
            except Exception:
                pass

    return relationships[:25]


def define_measures(df: pd.DataFrame) -> list[dict]:
    """Auto-define KPI measures from numeric columns."""
    measures  = []
    num_cols  = df.select_dtypes(include=[np.number]).columns.tolist()
    val_cols  = [c for c in num_cols if not any(k in c.lower() for k in ["id","index","key","row"])]

    for col in val_cols[:20]:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        # Growth rate if there are enough rows
        growth = None
        try:
            half    = len(s) // 2
            first_h = s.iloc[:half].mean()
            second_h = s.iloc[half:].mean()
            if first_h and first_h != 0:
                growth = round((second_h - first_h) / abs(first_h) * 100, 2)
        except Exception:
            pass

        measures.append({
            "name":    col,
            "column":  col,
            "format":  _guess_format(col),
            "agg": {
                "sum":    _safe(s.sum()),
                "avg":    _safe(s.mean()),
                "count":  int(s.count()),
                "min":    _safe(s.min()),
                "max":    _safe(s.max()),
                "median": _safe(s.median()),
                "std":    _safe(s.std()),
                "p75":    _safe(s.quantile(0.75)),
                "p25":    _safe(s.quantile(0.25)),
            },
            "growth_rate_pct": growth,
        })

    return measures


def create_hierarchy(df: pd.DataFrame) -> list[dict]:
    """Detect natural hierarchies — date, geography, product, org."""
    hierarchies = []
    cols_map    = {c.lower(): c for c in df.columns}

    # Date
    date_levels = []
    for lvl in ["year","quarter","month","week","date","day","hour"]:
        if lvl in cols_map: date_levels.append(cols_map[lvl])
    if date_levels:
        hierarchies.append({"name":"Date Hierarchy","levels":date_levels,"type":"temporal"})

    # Geography
    geo_levels = []
    for lvl in ["country","region","state","county","city","district","zip","zipcode","postal"]:
        if lvl in cols_map: geo_levels.append(cols_map[lvl])
    if geo_levels:
        hierarchies.append({"name":"Geography Hierarchy","levels":geo_levels,"type":"geographic"})

    # Product / Category
    prod_levels = []
    for lvl in ["department","category","subcategory","product_category","product_type","product","sku","variant","brand"]:
        if lvl in cols_map: prod_levels.append(cols_map[lvl])
    if prod_levels:
        hierarchies.append({"name":"Product Hierarchy","levels":prod_levels,"type":"product"})

    # Org
    org_levels = []
    for lvl in ["company","division","team","employee","manager","assigned"]:
        if lvl in cols_map: org_levels.append(cols_map[lvl])
    if org_levels:
        hierarchies.append({"name":"Org Hierarchy","levels":org_levels,"type":"organization"})

    # Cardinality-based auto hierarchy
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    sorted_cats = sorted(cat_cols, key=lambda c: df[c].nunique())
    if len(sorted_cats) >= 2:
        hierarchies.append({
            "name":   "Auto Hierarchy",
            "levels": sorted_cats[:5],
            "type":   "auto",
        })

    return hierarchies


def build_semantic_model(df: pd.DataFrame, file_name: str = "") -> dict:
    """
    Build complete semantic data model.
    Returns relationships, measures, hierarchies, KPI candidates, calculated columns.
    """
    relationships = create_relationships(df)
    measures      = define_measures(df)
    hierarchies   = create_hierarchy(df)

    kpi_keywords = ["revenue","sales","profit","cost","income","amount",
                    "total","count","rate","score","value","price","fee","tax","gross","net"]
    kpi_cols = [m for m in measures if any(k in m["name"].lower() for k in kpi_keywords)][:8]

    # Calculated column suggestions
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    calc_suggestions = []
    revenue_cols = [c for c in num_cols if any(k in c.lower() for k in ["revenue","sales","price","gross"])]
    cost_cols    = [c for c in num_cols if any(k in c.lower() for k in ["cost","expense","cogs"])]
    if revenue_cols and cost_cols:
        calc_suggestions.append({
            "name":    "Profit Margin %",
            "formula": f"({revenue_cols[0]} - {cost_cols[0]}) / {revenue_cols[0]} * 100",
            "type":    "calculated_column",
        })
    qty_cols  = [c for c in num_cols if any(k in c.lower() for k in ["qty","quantity","units","sold"])]
    price_cols = [c for c in num_cols if any(k in c.lower() for k in ["price","rate","unit_cost"])]
    if qty_cols and price_cols:
        calc_suggestions.append({
            "name":    "Total Value",
            "formula": f"{qty_cols[0]} * {price_cols[0]}",
            "type":    "calculated_column",
        })

    return {
        "file_name":          file_name,
        "relationships":      relationships,
        "measures":           measures,
        "hierarchies":        hierarchies,
        "kpi_candidates":     kpi_cols,
        "calculated_columns": calc_suggestions,
        "summary": {
            "total_measures":     len(measures),
            "total_hierarchies":  len(hierarchies),
            "total_relationships":len(relationships),
            "kpi_count":          len(kpi_cols),
        },
    }