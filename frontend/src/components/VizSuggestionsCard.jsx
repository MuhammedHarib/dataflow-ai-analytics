// src/components/VizSuggestionsCard.jsx
import React from "react";

const CHART_META = {
  bar:       { icon: "▬", color: "rgba(130,180,255,0.7)",  label: "Bar Chart"    },
  line:      { icon: "╱", color: "rgba(104,211,145,0.7)",  label: "Line Chart"   },
  pie:       { icon: "◔", color: "rgba(246,173,85,0.7)",   label: "Pie Chart"    },
  area:      { icon: "◺", color: "rgba(129,230,217,0.7)",  label: "Area Chart"   },
  scatter:   { icon: "⁙", color: "rgba(183,148,244,0.7)",  label: "Scatter Plot" },
  histogram: { icon: "▨", color: "rgba(252,129,129,0.7)",  label: "Histogram"    },
};

const VizSuggestionsCard = ({ suggestions, onOpenVisual }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="viz-suggestions-card">
      <div className="viz-sugg-header">
        <span className="viz-sugg-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </span>
        <span className="viz-sugg-title">Recommended Visualizations</span>
        {onOpenVisual && (
          <button className="viz-open-btn" onClick={onOpenVisual} title="Open visual analytics">
            Open in Visual →
          </button>
        )}
      </div>

      <div className="viz-sugg-list">
        {suggestions.map((s, i) => {
          const meta = CHART_META[s.chart] || CHART_META.bar;
          return (
            <div key={i} className="viz-sugg-item">
              <span
                className="viz-sugg-chart-icon"
                style={{ color: meta.color }}
              >
                {meta.icon}
              </span>
              <div className="viz-sugg-body">
                <span className="viz-sugg-chart-label">{s.title || meta.label}</span>
                <span className="viz-sugg-reason">{s.reason}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VizSuggestionsCard;