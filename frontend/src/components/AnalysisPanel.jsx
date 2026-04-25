// src/components/AnalysisPanel.jsx
import React, { useState } from "react";

// ── Small helpers ─────────────────────────────────────────────────────────────
const fmt = (n, decimals = 2) =>
  n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals });

const pct = (n) => (n == null ? "—" : `${fmt(n, 1)}%`);

const MissingBar = ({ value }) => {
  const w = Math.min(parseFloat(value) || 0, 100);
  const color = w > 50 ? "#fc8181" : w > 20 ? "#f6ad55" : "#68d391";
  return (
    <div className="missing-bar-wrap">
      <div className="missing-bar-track">
        <div className="missing-bar-fill" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="missing-bar-label">{pct(value)}</span>
    </div>
  );
};

const StatCard = ({ label, value, sub }) => (
  <div className="stat-card">
    <span className="stat-card-value">{value}</span>
    <span className="stat-card-label">{label}</span>
    {sub && <span className="stat-card-sub">{sub}</span>}
  </div>
);

const SectionHeader = ({ icon, title }) => (
  <div className="analysis-section-header">
    <span className="analysis-section-icon">{icon}</span>
    <span className="analysis-section-title">{title}</span>
  </div>
);

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",   label: "Overview",    icon: "◈" },
  { id: "numeric",    label: "Numeric",     icon: "∑" },
  { id: "missing",    label: "Missing",     icon: "⊘" },
  { id: "categories", label: "Categories",  icon: "≡" },
  { id: "dates",      label: "Dates",       icon: "◷" },
];

// ── Main component ────────────────────────────────────────────────────────────
const AnalysisPanel = ({ analysis, label }) => {
  const [tab, setTab] = useState("overview");
  if (!analysis) return null;

  const { overview, missingness, numeric_stats, outlier_summary,
          categorical_summaries, date_analysis } = analysis;

  const hasNumeric    = Object.keys(numeric_stats || {}).length > 0;
  const hasCat        = Object.keys(categorical_summaries || {}).length > 0;
  const hasDates      = Object.keys(date_analysis || {}).length > 0;
  const hasOutliers   = Object.keys(outlier_summary || {}).length > 0;

  const visibleTabs = TABS.filter(t => {
    if (t.id === "numeric"    && !hasNumeric) return false;
    if (t.id === "categories" && !hasCat)     return false;
    if (t.id === "dates"      && !hasDates)   return false;
    return true;
  });

  return (
    <div className="analysis-panel">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="analysis-header">
        <div className="analysis-header-left">
          <span className="analysis-icon">⬡</span>
          <div>
            <div className="analysis-title">{label || "Dataset Analysis"}</div>
            <div className="analysis-subtitle">
              {fmt(overview.total_rows, 0)} rows · {overview.total_columns} columns
            </div>
          </div>
        </div>
        <div className="analysis-quality-badge"
          style={{
            background: missingness.overall_completeness_pct > 90
              ? "rgba(104,211,145,0.12)" : "rgba(246,173,85,0.12)",
            color: missingness.overall_completeness_pct > 90 ? "#68d391" : "#f6ad55",
            borderColor: missingness.overall_completeness_pct > 90
              ? "rgba(104,211,145,0.25)" : "rgba(246,173,85,0.25)",
          }}
        >
          {missingness.overall_completeness_pct}% complete
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="analysis-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            className={`analysis-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="analysis-body">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="analysis-overview">
            <div className="stat-cards-row">
              <StatCard label="Total Rows"    value={fmt(overview.total_rows, 0)} />
              <StatCard label="Columns"       value={overview.total_columns} />
              <StatCard label="Duplicates"    value={fmt(overview.duplicate_rows, 0)}
                sub={`${pct(overview.duplicate_pct)}`} />
              <StatCard label="Complete"      value={pct(missingness.overall_completeness_pct)} />
            </div>

            {/* Type breakdown */}
            <SectionHeader icon="◈" title="Column Types" />
            <div className="type-breakdown">
              {Object.entries(overview.type_breakdown)
                .filter(([, v]) => v > 0)
                .map(([type, count]) => (
                  <div key={type} className={`type-chip type-chip--${type}`}>
                    <span className="type-chip-count">{count}</span>
                    <span className="type-chip-label">{type}</span>
                  </div>
                ))}
            </div>

            {/* Outlier callout */}
            {hasOutliers && (
              <>
                <SectionHeader icon="⚡" title="Columns with Outliers" />
                <div className="outlier-list">
                  {Object.entries(outlier_summary).map(([col, count]) => (
                    <div key={col} className="outlier-row">
                      <span className="outlier-col">{col}</span>
                      <span className="outlier-count">{fmt(count, 0)} outliers</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {overview.duplicate_rows > 0 && (
              <div className="duplicate-warning">
                ⚠ {fmt(overview.duplicate_rows, 0)} duplicate rows detected
                ({pct(overview.duplicate_pct)} of dataset)
              </div>
            )}
          </div>
        )}

        {/* NUMERIC */}
        {tab === "numeric" && hasNumeric && (
          <div className="numeric-tab">
            <div className="numeric-table-wrap">
              <table className="numeric-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Std</th>
                    <th>Outliers</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(numeric_stats).map(([col, s]) => (
                    <tr key={col}>
                      <td className="numeric-col-name">{col}</td>
                      <td>{fmt(s.min)}</td>
                      <td>{fmt(s.max)}</td>
                      <td>{fmt(s.mean)}</td>
                      <td>{fmt(s.median)}</td>
                      <td>{fmt(s.std)}</td>
                      <td>
                        {s.outliers > 0
                          ? <span className="outlier-badge">{s.outliers}</span>
                          : <span className="clean-badge">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MISSING */}
        {tab === "missing" && (
          <div className="missing-tab">
            <div className="missing-summary">
              <span className="missing-total">
                {fmt(missingness.total_missing_cells, 0)} missing cells total
              </span>
              <span className="missing-completeness">
                {pct(missingness.overall_completeness_pct)} complete
              </span>
            </div>

            {Object.keys(missingness.top_missing_columns).length === 0 ? (
              <div className="all-complete">
                ✓ No missing values detected — dataset is complete!
              </div>
            ) : (
              <div className="missing-col-list">
                {Object.entries(missingness.top_missing_columns).map(([col, info]) => (
                  <div key={col} className="missing-col-row">
                    <span className="missing-col-name">{col}</span>
                    <MissingBar value={info.pct} />
                    <span className="missing-col-count">{fmt(info.count, 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES */}
        {tab === "categories" && hasCat && (
          <div className="cat-tab">
            {Object.entries(categorical_summaries).map(([col, info]) => (
              <div key={col} className="cat-col-block">
                <div className="cat-col-header">
                  <span className="cat-col-name">{col}</span>
                  <span className="cat-unique">{info.unique_values} unique</span>
                </div>
                <div className="cat-values">
                  {Object.entries(info.top_values).map(([val, count], i) => {
                    const maxCount = Object.values(info.top_values)[0];
                    const barW = Math.round((count / maxCount) * 100);
                    return (
                      <div key={i} className="cat-value-row">
                        <span className="cat-value-label" title={val}>
                          {String(val).length > 28 ? String(val).slice(0, 28) + "…" : val}
                        </span>
                        <div className="cat-bar-wrap">
                          <div className="cat-bar-fill" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="cat-value-count">{fmt(count, 0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DATES */}
        {tab === "dates" && hasDates && (
          <div className="dates-tab">
            {Object.entries(date_analysis).map(([col, info]) => (
              <div key={col} className="date-col-block">
                <div className="date-col-name">{col}</div>
                <div className="date-stats">
                  <div className="date-stat">
                    <span className="date-stat-label">From</span>
                    <span className="date-stat-value">{info.min_date.slice(0, 10)}</span>
                  </div>
                  <div className="date-timeline-line" />
                  <div className="date-stat">
                    <span className="date-stat-label">To</span>
                    <span className="date-stat-value">{info.max_date.slice(0, 10)}</span>
                  </div>
                </div>
                <div className="date-meta">
                  <span>{fmt(info.date_range_days, 0)} days span</span>
                  <span className="date-granularity">~{info.granularity} granularity</span>
                  {info.null_count > 0 && (
                    <span className="date-nulls">{info.null_count} nulls</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default AnalysisPanel;