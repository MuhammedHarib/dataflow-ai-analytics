// src/views/InsightsView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000/api/v1/enterprise";

export default function InsightsView({ sessionId }) {
  const [insights, setInsights] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const fetchInsights = async () => {
    if (!sessionId) return;
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("session_id", sessionId);
      const res = await axios.post(`${API}/insights`, fd);
      setInsights(res.data.insights);
    } catch (e) {
      setError("Failed to load insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (sessionId) fetchInsights(); }, [sessionId]);

  if (!sessionId) return (
    <div className="ev-root">
      <div className="ev-no-data">
        <div className="ev-no-data-icon">💡</div>
        <div className="ev-no-data-title">No Dataset Loaded</div>
        <div className="ev-no-data-hint">Upload a dataset in Chat to discover insights.</div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="ev-root">
      <div className="e-loading">Detecting insights…</div>
    </div>
  );

  return (
    <div className="ins-root">
      <div className="ins-header">
        Auto Insights
        {insights && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginLeft: 10 }}>
            {insights.total_insights} found · {insights.high_priority} high priority
          </span>
        )}
      </div>

      {error && <div className="ev-error">{error}</div>}

      {insights?.summary_text && (
        <div style={{
          padding: "12px 14px",
          background: "rgba(79,140,255,0.07)",
          borderRadius: 8,
          fontSize: 12,
          color: "rgba(255,255,255,0.7)",
          lineHeight: 1.6,
        }}>
          {insights.summary_text}
        </div>
      )}

      {[
        { key: "trends",       label: "📈 Trends"       },
        { key: "correlations", label: "🔗 Correlations" },
        { key: "anomalies",    label: "⚠️ Anomalies"    },
        { key: "seasonality",  label: "🌀 Seasonality"  },
        { key: "kpi_alerts",   label: "⚡ KPI Alerts"   },
      ].map(({ key, label }) => {
        const items = insights?.[key] || [];
        if (!items.length) return null;
        return (
          <div key={key} className="ins-section">
            <div className="ins-section-title">{label} ({items.length})</div>
            {items.map((item, i) => (
              <div key={i} className={`ins-card ${item.severity || "medium"}`}>
                <div className="ins-card-msg">{item.message}</div>
                <div className="ins-card-col">
                  {item.column || item.col_a || item.kpi || ""}
                  {item.change_pct != null && (
                    <span className={`ins-card-change ${item.change_pct >= 0 ? "pos" : "neg"}`}>
                      {" "}{item.change_pct >= 0 ? "▲" : "▼"} {Math.abs(item.change_pct)}%
                    </span>
                  )}
                  {item.correlation != null && (
                    <span className="ins-card-change pos"> r={item.correlation}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <button
        className="ev-btn sm"
        onClick={fetchInsights}
        style={{ alignSelf: "flex-start", marginTop: 8 }}
      >
        Refresh Insights
      </button>
    </div>
  );
}