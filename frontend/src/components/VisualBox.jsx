// src/components/VisualBox.jsx
import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label
} from "recharts";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  PALETTE: [
    "rgba(130,180,255,0.9)", "rgba(104,211,145,0.9)",
    "rgba(246,173,85,0.9)",  "rgba(252,129,129,0.9)",
    "rgba(183,148,244,0.9)", "rgba(129,230,217,0.9)",
    "rgba(255,190,100,0.9)", "rgba(160,210,120,0.9)",
  ],
  grid:    "rgba(255,255,255,0.06)",
  axis:    "rgba(255,255,255,0.55)",   // was 0.38 — much more readable now
  axisLabel: "rgba(255,255,255,0.70)",
  tooltip: "rgba(10,10,18,0.97)",
};

// Bigger, more readable axis ticks
const axisStyle = { fontSize: 12, fill: T.axis, fontFamily: "inherit" };
const gridProps = { strokeDasharray: "3 3", stroke: T.grid };
const ttStyle   = {
  contentStyle: {
    background: T.tooltip, border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8, fontSize: 12, padding: "8px 12px",
  },
  labelStyle: { color: "rgba(255,255,255,0.8)", fontWeight: 600, marginBottom: 4 },
  itemStyle:  { color: "rgba(255,255,255,0.9)" },
};

// Smart number formatter for Y axis
const fmtNum = (v) => {
  if (v === null || v === undefined) return "";
  if (Math.abs(v) >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v/1_000).toFixed(1)}k`;
  if (!Number.isInteger(v))     return Number(v.toFixed(2)).toString();
  return v;
};

// Smart label truncator for X axis
const fmtLabel = (v, maxLen = 14) => {
  const s = String(v ?? "");
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
};

// ── Chart type definitions ────────────────────────────────────────────────────
const CHART_TYPES = [
  { id: "bar",       label: "Bar",       icon: "▬", desc: "Compare categories"  },
  { id: "line",      label: "Line",      icon: "╱", desc: "Trends over time"    },
  { id: "pie",       label: "Pie",       icon: "◔", desc: "Part-to-whole"       },
  { id: "area",      label: "Area",      icon: "◺", desc: "Volume over time"    },
  { id: "scatter",   label: "Scatter",   icon: "⁙", desc: "Correlation"         },
  { id: "histogram", label: "Histogram", icon: "▨", desc: "Distribution"        },
];

const LAYOUTS = [
  { id: "1x1", label: "1×1", slots: 1 },
  { id: "1x2", label: "1×2", slots: 2 },
  { id: "2x2", label: "2×2", slots: 4 },
];

// ── Dataset selector ──────────────────────────────────────────────────────────
const DatasetPicker = ({ chartType, chartData, selectedId, onSelect }) => {
  const options = (chartData?.[chartType] || []).filter(d => d.data?.length > 0);
  if (!options.length) return null;
  return (
    <select className="vb-dataset-picker" value={selectedId || ""}
      onChange={e => onSelect(e.target.value)}
      onClick={e => e.stopPropagation()}>
      {options.map(opt => (
        <option key={opt.id} value={opt.id}>{opt.title}</option>
      ))}
    </select>
  );
};

// ── Chart renderers ───────────────────────────────────────────────────────────
const RealChart = ({ type, dataset }) => {
  if (!dataset || !dataset.data?.length) {
    return (
      <div className="vb-no-data">
        <span>No data available</span>
        <span className="vb-no-data-sub">Upload a dataset first</span>
      </div>
    );
  }

  const { data, xKey, yKey, yKeys, xLabel, yLabel } = dataset;
  // Use column names as axis labels if xLabel/yLabel not set
  const xName = xLabel || xKey || "X";
  const yName = yLabel || yKey || "Value";

  // Dynamic left margin — wider numbers need more space
  const maxVal = Math.max(...data.map(d => Math.abs(d[yKey || "value"] || d.y || 0)));
  const leftMargin = maxVal >= 1_000_000 ? 14 : maxVal >= 1_000 ? 10 : 4;

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: leftMargin, bottom: 60 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey || "name"} tick={axisStyle}
            angle={-38} textAnchor="end" interval={0}
            tickFormatter={v => fmtLabel(v, 13)}
            height={65}>
            <Label value={xName} position="insideBottom" offset={-8}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis tick={axisStyle} tickFormatter={fmtNum} width={52}>
            <Label value={yName} angle={-90} position="insideLeft" offset={10}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <Tooltip {...ttStyle} formatter={(v) => [fmtNum(v), yName]} />
          <Bar dataKey={yKey || "value"} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={T.PALETTE[i % T.PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line") {
    const keys = yKeys || [yKey || "y"];
    return (
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: leftMargin, bottom: 48 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey || "x"} tick={axisStyle}
            angle={-28} textAnchor="end" tickFormatter={v => fmtLabel(v, 12)} height={55}>
            <Label value={xName} position="insideBottom" offset={-8}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis tick={axisStyle} tickFormatter={fmtNum} width={52}>
            <Label value={yName} angle={-90} position="insideLeft" offset={10}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <Tooltip {...ttStyle} formatter={(v) => [fmtNum(v), yName]} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: T.axis }} />}
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k}
              stroke={T.PALETTE[i % T.PALETTE.length]}
              strokeWidth={2.5} dot={{ r: 3, fill: T.PALETTE[i] }}
              activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    const keys = yKeys || [yKey || "y"];
    return (
      <ResponsiveContainer width="100%" height={270}>
        <AreaChart data={data} margin={{ top: 10, right: 24, left: leftMargin, bottom: 48 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={T.PALETTE[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.PALETTE[i]} stopOpacity={0}   />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey || "x"} tick={axisStyle}
            angle={-28} textAnchor="end" tickFormatter={v => fmtLabel(v, 12)} height={55}>
            <Label value={xName} position="insideBottom" offset={-8}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis tick={axisStyle} tickFormatter={fmtNum} width={52}>
            <Label value={yName} angle={-90} position="insideLeft" offset={10}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <Tooltip {...ttStyle} formatter={(v) => [fmtNum(v), yName]} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: T.axis }} />}
          {keys.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k}
              stroke={T.PALETTE[i]} strokeWidth={2.5}
              fill={`url(#grad${i})`} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie") {
    const RADIAN = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
      if (percent < 0.04) return null;
      const r = innerRadius + (outerRadius - innerRadius) * 0.55;
      const x = cx + r * Math.cos(-midAngle * RADIAN);
      const y = cy + r * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="rgba(255,255,255,0.95)" textAnchor="middle"
          dominantBaseline="central" fontSize={11} fontWeight={700}>
          {`${(percent * 100).toFixed(1)}%`}
        </text>
      );
    };
    return (
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            cx="50%" cy="46%" outerRadius={100}
            labelLine={false} label={renderLabel}>
            {data.map((_, i) => <Cell key={i} fill={T.PALETTE[i % T.PALETTE.length]} />)}
          </Pie>
          <Tooltip {...ttStyle} formatter={(v) => [fmtNum(v), "Value"]} />
          <Legend wrapperStyle={{ fontSize: 12, color: T.axis }}
            formatter={v => fmtLabel(v, 20)} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <ScatterChart margin={{ top: 10, right: 24, left: leftMargin, bottom: 48 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="x" tick={axisStyle} tickFormatter={fmtNum} name={xName} width={52}>
            <Label value={xName} position="insideBottom" offset={-8}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis dataKey="y" tick={axisStyle} tickFormatter={fmtNum} name={yName} width={52}>
            <Label value={yName} angle={-90} position="insideLeft" offset={10}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <Tooltip {...ttStyle} cursor={{ strokeDasharray: "3 3" }}
            formatter={(v, n) => [fmtNum(v), n]} />
          <Scatter data={data} fill={T.PALETTE[0]} opacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "histogram") {
    return (
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: leftMargin, bottom: 60 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey={xKey || "bin"} tick={axisStyle}
            angle={-38} textAnchor="end" tickFormatter={v => fmtLabel(v, 12)} height={65}>
            <Label value={xName} position="insideBottom" offset={-8}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </XAxis>
          <YAxis tick={axisStyle} tickFormatter={fmtNum} width={52}>
            <Label value="Count" angle={-90} position="insideLeft" offset={10}
              style={{ fill: T.axisLabel, fontSize: 11, fontWeight: 600 }} />
          </YAxis>
          <Tooltip {...ttStyle} formatter={(v) => [fmtNum(v), "Count"]} />
          <Bar dataKey={yKey || "count"} fill={T.PALETTE[4]} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return <div className="vb-no-data">Unknown chart type</div>;
};

// ── Chart card (slot contents) ────────────────────────────────────────────────
const ChartCard = ({ type, chartData, slotId, onRemove, onDragFrom }) => {
  const options = (chartData?.[type] || []).filter(d => d.data?.length > 0);
  const [selId, setSelId] = useState(options[0]?.id || null);

  useEffect(() => {
    const opts = (chartData?.[type] || []).filter(d => d.data?.length > 0);
    setSelId(opts[0]?.id || null);
  }, [type, chartData]);

  const dataset = options.find(o => o.id === selId) || options[0];
  const meta    = CHART_TYPES.find(c => c.id === type);

  return (
    <div className="vb-slot-chart" draggable
      onDragStart={e => {
        e.dataTransfer.setData("slotChart", type);
        e.dataTransfer.setData("fromSlot", String(slotId));
        onDragFrom?.(type);
      }}>
      <div className="vb-chart-header">
        <span className="vb-chart-type-badge">
          <span style={{ marginRight: 5 }}>{meta?.icon}</span>{meta?.label}
        </span>
        {options.length > 1 && (
          <DatasetPicker chartType={type} chartData={chartData}
            selectedId={selId} onSelect={setSelId} />
        )}
        <button className="vb-slot-remove" onClick={() => onRemove(slotId)}>×</button>
      </div>
      {dataset && <div className="vb-chart-subtitle">{dataset.title}</div>}
      <RealChart type={type} dataset={dataset} />
    </div>
  );
};

// ── Drop Slot ─────────────────────────────────────────────────────────────────
const DropSlot = ({ slotId, chartType, chartData, draggingType, onDrop, onRemove, onDragFrom }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      className={`vb-slot ${isDragOver ? "vb-slot--dragover" : ""} ${!chartType ? "vb-slot--empty" : ""}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        e.preventDefault(); setIsDragOver(false);
        const t = e.dataTransfer.getData("chartType") || e.dataTransfer.getData("slotChart");
        if (t) onDrop(slotId, t);
      }}>
      {isDragOver && (
        <div className="vb-drop-ghost">
          <span className="vb-drop-ghost-icon">
            {CHART_TYPES.find(c => c.id === draggingType)?.icon || "◈"}
          </span>
          <span className="vb-drop-ghost-label">
            {CHART_TYPES.find(c => c.id === draggingType)?.label || "Drop here"}
          </span>
        </div>
      )}
      {!chartType && !isDragOver && (
        <div className="vb-slot-placeholder">
          <span className="vb-slot-plus">+</span>
          <span className="vb-slot-hint">Drop a chart here</span>
        </div>
      )}
      {chartType && !isDragOver && (
        <ChartCard type={chartType} chartData={chartData}
          slotId={slotId} onRemove={onRemove} onDragFrom={onDragFrom} />
      )}
    </div>
  );
};

// ── Right sidebar — chart picker ──────────────────────────────────────────────
const ChartPicker = ({ chartData, onDragStart }) => {
  const meta = chartData?.__meta__ || {};
  const getSuggestion = id => {
    switch (id) {
      case "bar":       return meta.categorical_cols?.[0] ? `e.g. ${meta.categorical_cols[0]}` : null;
      case "line":      return meta.has_date ? `over ${meta.date_cols?.[0]}` : null;
      case "pie":       return meta.categorical_cols?.[0] ? `e.g. ${meta.categorical_cols[0]}` : null;
      case "scatter":   return meta.numeric_cols?.length >= 2 ? `${meta.numeric_cols[0]} vs ${meta.numeric_cols[1]}` : null;
      case "histogram": return meta.numeric_cols?.[0] ? `e.g. ${meta.numeric_cols[0]}` : null;
      case "area":      return meta.has_date ? `over time` : null;
      default: return null;
    }
  };
  return (
    <aside className="vb-right-sidebar">
      <div className="vb-rs-header">
        <span className="vb-rs-title">Charts</span>
        <span className="vb-rs-hint">Drag onto canvas</span>
      </div>
      <div className="vb-rs-list">
        {CHART_TYPES.map(chart => {
          const available = (chartData?.[chart.id] || []).filter(d => d.data?.length > 0).length;
          const sugg = getSuggestion(chart.id);
          return (
            <div key={chart.id}
              className={`vb-chart-card ${!available ? "vb-chart-card--empty" : ""}`}
              draggable={!!available}
              onDragStart={e => {
                if (!available) return;
                e.dataTransfer.setData("chartType", chart.id);
                onDragStart?.(chart.id);
              }}
              title={!available ? "No compatible data for this chart type" : ""}>
              <span className="vb-chart-card-icon" style={{ opacity: available ? 1 : 0.35 }}>
                {chart.icon}
              </span>
              <div className="vb-chart-card-body">
                <span className="vb-chart-card-label">{chart.label}</span>
                <span className="vb-chart-card-desc">
                  {available ? (sugg || chart.desc) : "No data available"}
                </span>
              </div>
              {available > 0 && <span className="vb-chart-card-count">{available}</span>}
              <span className="vb-drag-handle" style={{ opacity: available ? 1 : 0.2 }}>⠿</span>
            </div>
          );
        })}
      </div>
      {meta.numeric_cols?.length > 0 && (
        <div className="vb-rs-cols">
          <div className="vb-rs-cols-title">Dataset columns</div>
          {meta.numeric_cols?.length > 0 && (
            <div className="vb-rs-col-group">
              <span className="vb-rs-col-type">Numeric</span>
              {meta.numeric_cols.slice(0, 8).map(c => (
                <span key={c} className="vb-rs-col-tag num">{c}</span>
              ))}
            </div>
          )}
          {meta.categorical_cols?.length > 0 && (
            <div className="vb-rs-col-group">
              <span className="vb-rs-col-type">Text</span>
              {meta.categorical_cols.slice(0, 6).map(c => (
                <span key={c} className="vb-rs-col-tag cat">{c}</span>
              ))}
            </div>
          )}
          {meta.date_cols?.length > 0 && (
            <div className="vb-rs-col-group">
              <span className="vb-rs-col-type">Date</span>
              {meta.date_cols.map(c => (
                <span key={c} className="vb-rs-col-tag date">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

// ── Main VisualBox ────────────────────────────────────────────────────────────
const VisualBox = ({ chartData, onBack }) => {
  const [layout, setLayout]     = useState("1x1");
  const [slots, setSlots]       = useState({});
  const [draggingType, setDrag] = useState(null);
  const [rsOpen, setRsOpen]     = useState(false);

  useEffect(() => {
    if (!chartData) return;
    const firstLine = (chartData.line || []).find(d => d.data?.length > 0);
    const firstBar  = (chartData.bar  || []).find(d => d.data?.length > 0);
    const initial   = firstLine ? "line" : firstBar ? "bar" : null;
    if (initial) setSlots({ 0: initial });
  }, [chartData]);

  const slotCount = LAYOUTS.find(l => l.id === layout).slots;

  const handleDrop   = (slotId, type) => { setSlots(p => ({ ...p, [slotId]: type })); setDrag(null); };
  const handleRemove = slotId => { setSlots(p => { const n = { ...p }; delete n[slotId]; return n; }); };
  const handleLayoutChange = nl => {
    const nc = LAYOUTS.find(l => l.id === nl).slots;
    setSlots(p => {
      const k = {};
      Object.entries(p).forEach(([i, v]) => { if (parseInt(i) < nc) k[i] = v; });
      return k;
    });
    setLayout(nl);
  };

  const hasData = chartData && Object.keys(chartData).some(
    k => k !== "__meta__" && (chartData[k] || []).some(d => d.data?.length > 0)
  );

  return (
    <div className="vb-root">
      <div className="vb-header">
        <button className="vb-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <div className="vb-header-center">
          <span className="vb-header-title">Visual Analytics</span>
          {!hasData && <span className="vb-header-warning">— upload a dataset in Chat first</span>}
        </div>
        <div className="vb-header-right">
          <div className="vb-layout-picker">
            {LAYOUTS.map(l => (
              <button key={l.id}
                className={`vb-layout-btn ${layout === l.id ? "active" : ""}`}
                onClick={() => handleLayoutChange(l.id)}>{l.label}</button>
            ))}
          </div>
          <button className={`vb-charts-toggle ${rsOpen ? "active" : ""}`}
            onClick={() => setRsOpen(o => !o)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            Charts
          </button>
        </div>
      </div>

      <div className="vb-body">
        <div className={`vb-canvas vb-canvas--${layout}`}>
          {Array.from({ length: slotCount }, (_, i) => (
            <DropSlot key={i} slotId={i}
              chartType={slots[i] || null}
              chartData={chartData}
              draggingType={draggingType}
              onDrop={handleDrop}
              onRemove={handleRemove}
              onDragFrom={setDrag} />
          ))}
        </div>
        <div className={`vb-right-sidebar-wrap ${rsOpen ? "vb-right-sidebar-wrap--open" : ""}`}>
          <ChartPicker chartData={chartData} onDragStart={setDrag} />
        </div>
      </div>
    </div>
  );
};

export default VisualBox;