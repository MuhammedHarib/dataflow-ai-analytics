// src/components/PreviewPanel.jsx
import React, { useState } from "react";

const TYPE_COLORS = {
  number:  { bg: "var(--type-number-bg)",  text: "var(--type-number-text)",  label: "NUM" },
  string:  { bg: "var(--type-string-bg)",  text: "var(--type-string-text)",  label: "STR" },
  date:    { bg: "var(--type-date-bg)",    text: "var(--type-date-text)",    label: "DATE" },
  bool:    { bg: "var(--type-bool-bg)",    text: "var(--type-bool-text)",    label: "BOOL" },
};

const TypeBadge = ({ type }) => {
  const style = TYPE_COLORS[type] || TYPE_COLORS.string;
  return (
    <span className="type-badge" style={{ background: style.bg, color: style.text }}>
      {style.label}
    </span>
  );
};

const MetaStat = ({ label, value }) => (
  <div className="meta-stat">
    <span className="meta-value">{value}</span>
    <span className="meta-label">{label}</span>
  </div>
);

const PreviewPanel = ({ preview, warnings = [], errors = [], status }) => {
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "columns"

  // ── Error / sample_required state ──────────────────────────────────────
  if (status === "error" || status === "sample_required") {
    return (
      <div className="preview-panel preview-panel--error">
        <div className="preview-error-header">
          <span className="preview-error-icon">
            {status === "sample_required" ? "⚠️" : "✕"}
          </span>
          <span className="preview-error-title">
            {status === "sample_required" ? "File Too Large" : "Upload Failed"}
          </span>
        </div>
        <div className="preview-error-list">
          {errors.map((err, i) => (
            <div key={i} className="preview-error-item">
              <div className="preview-error-code">{err.code}</div>
              <div className="preview-error-message">{err.message}</div>
              <div className="preview-error-hint">
                <span className="hint-icon">💡</span> {err.fix_hint}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const totalMissing = Object.values(preview.missing_values_by_column).reduce((a, b) => a + b, 0);
  const missingPct = preview.rows > 0
    ? ((totalMissing / (preview.rows * preview.columns)) * 100).toFixed(1)
    : 0;

  return (
    <div className="preview-panel">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="preview-header">
        <div className="preview-file-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className="preview-file-info">
          <span className="preview-file-name">{preview.file_name}</span>
          <span className="preview-file-meta">
            {preview.file_type} · {(preview.file_size_bytes / 1024).toFixed(1)} KB
          </span>
        </div>
        <span className="preview-status-badge">Preview ready</span>
      </div>

      {/* ── Warnings ────────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="preview-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="preview-warning-item">
              <span className="warning-dot" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* ── Meta stats ──────────────────────────────────────────────────── */}
      <div className="preview-meta-row">
        <MetaStat label="Rows" value={preview.rows.toLocaleString()} />
        <MetaStat label="Columns" value={preview.columns} />
        <MetaStat label="Missing" value={`${missingPct}%`} />
        <MetaStat label="Type" value={preview.file_type} />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="preview-tabs">
        <button
          className={`preview-tab ${activeTab === "preview" ? "active" : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Sample rows
        </button>
        <button
          className={`preview-tab ${activeTab === "columns" ? "active" : ""}`}
          onClick={() => setActiveTab("columns")}
        >
          Columns
        </button>
      </div>

      {/* ── Sample rows table ───────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="preview-table-wrap">
          <table className="preview-table">
            <thead>
              <tr>
                {preview.column_names.map((col) => (
                  <th key={col}>
                    <div className="th-inner">
                      <span className="th-name">{col}</span>
                      <TypeBadge type={preview.column_types[col]} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sample_rows.map((row, i) => (
                <tr key={i}>
                  {preview.column_names.map((col) => (
                    <td key={col}>
                      {row[col] === null || row[col] === undefined
                        ? <span className="null-cell">—</span>
                        : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Column details ──────────────────────────────────────────────── */}
      {activeTab === "columns" && (
        <div className="preview-columns-list">
          {preview.column_names.map((col) => {
            const missing = preview.missing_values_by_column[col] || 0;
            const missingPctCol = preview.rows > 0
              ? ((missing / preview.rows) * 100).toFixed(1)
              : 0;
            return (
              <div key={col} className="preview-col-row">
                <div className="col-row-left">
                  <TypeBadge type={preview.column_types[col]} />
                  <span className="col-name">{col}</span>
                </div>
                <div className="col-row-right">
                  {missing > 0 ? (
                    <span className="col-missing">
                      {missing} missing ({missingPctCol}%)
                    </span>
                  ) : (
                    <span className="col-complete">Complete</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="preview-footer">
        Showing {Math.min(preview.sample_rows.length, 20)} of {preview.rows.toLocaleString()} rows
        · Ask a question about this data below
      </div>
    </div>
  );
};

export default PreviewPanel;