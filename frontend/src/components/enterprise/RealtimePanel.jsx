// src/components/enterprise/RealtimePanel.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const PALETTE = ["#00ffb4","#4f8cff","#ffd93d","#ff6b6b","#c77dff","#00d4ff"];
const STREAM_TYPES = {
  stock:   { label: "Stock Prices",    icon: "📈", unit: "USD"   },
  sales:   { label: "Live Sales",      icon: "🛒", unit: "units" },
  iot:     { label: "IoT Sensor",      icon: "🌡️", unit: "°C"   },
  traffic: { label: "Web Traffic",     icon: "🌐", unit: "req/s" },
  revenue: { label: "Revenue Stream",  icon: "💰", unit: "USD"   },
  custom:  { label: "Custom Stream",   icon: "⚡", unit: ""      },
};

const ttStyle = {
  contentStyle: { background: "rgba(5,7,18,0.97)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: "rgba(255,255,255,0.5)" },
  itemStyle:    { color: "rgba(255,255,255,0.9)" },
};

// ── Single stream chart ───────────────────────────────────────────────────────
const StreamChart = ({ stream, color }) => {
  const data     = stream.history || [];
  const current  = stream.current ?? 0;
  const trend    = stream.trend || "flat";
  const changePct = stream.change_pct ?? 0;
  const xLabel   = stream.x_axis_label || "Time";
  const yLabel   = stream.y_axis_label || stream.unit || "Value";

  return (
    <div className="rt-stream-card">
      <div className="rt-stream-header">
        <div className="rt-stream-info">
          <span className="rt-stream-icon">{STREAM_TYPES[stream.stream_type]?.icon || "⚡"}</span>
          <div>
            <div className="rt-stream-label">{stream.label || stream.stream_type}</div>
            <div className="rt-stream-yunit">{yLabel}</div>
          </div>
        </div>
        <div className="rt-stream-current">
          <span className="rt-current-val" style={{ color }}>
            {typeof current === "number" ? current.toLocaleString(undefined, { maximumFractionDigits: 2 }) : current}
          </span>
          <span className={`rt-change ${trend}`}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
            {" "}{Math.abs(changePct).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="rt-chart-area">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 16 }}>
            <defs>
              <linearGradient id={`rg_${stream.stream_type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3"/>
            <XAxis dataKey="x" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }}
              label={{ value: xLabel, position: "insideBottom", offset: -6, fill: "rgba(255,255,255,0.3)", fontSize: 9 }}/>
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.25)" }}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
              label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 9 }}/>
            <Tooltip {...ttStyle} formatter={(v) => [v, yLabel]}/>
            <Area dataKey="y" stroke={color} fill={`url(#rg_${stream.stream_type})`} strokeWidth={2} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rt-stream-stats">
        <span>Tick #{stream.tick || 0}</span>
        <span>{data.length} points</span>
      </div>
    </div>
  );
};

// ── Controls panel ────────────────────────────────────────────────────────────
const StreamControls = ({ onAddStream, onPause, onResume, paused, streams }) => {
  const [selType, setSelType]       = useState("stock");
  const [interval, setInterval]     = useState(1000);
  const [xLabel, setXLabel]         = useState("Time");
  const [yLabel, setYLabel]         = useState("");
  const [customVal, setCustomVal]   = useState("");
  const [userVals, setUserVals]     = useState([]);

  const addVal = () => {
    const n = parseFloat(customVal);
    if (!isNaN(n)) { setUserVals(v => [...v, n]); setCustomVal(""); }
  };

  return (
    <div className="rt-controls">
      <div className="rt-ctrl-title">Stream Controls</div>

      <div className="rt-ctrl-group">
        <label className="rt-ctrl-label">Stream Type</label>
        <select className="rt-ctrl-select" value={selType} onChange={e => setSelType(e.target.value)}>
          {Object.entries(STREAM_TYPES).map(([k,v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      <div className="rt-ctrl-group">
        <label className="rt-ctrl-label">X Axis Label</label>
        <input className="rt-ctrl-input" value={xLabel} onChange={e => setXLabel(e.target.value)} placeholder="e.g. Time"/>
      </div>

      <div className="rt-ctrl-group">
        <label className="rt-ctrl-label">Y Axis Label</label>
        <input className="rt-ctrl-input" value={yLabel} onChange={e => setYLabel(e.target.value)} placeholder="e.g. USD, °C, units"/>
      </div>

      <div className="rt-ctrl-group">
        <label className="rt-ctrl-label">Update Interval (ms)</label>
        <input className="rt-ctrl-input" type="number" value={interval} min="200" step="100"
          onChange={e => setInterval(parseInt(e.target.value)||1000)}/>
      </div>

      <div className="rt-ctrl-group">
        <label className="rt-ctrl-label">Custom Values</label>
        <div className="rt-val-row">
          <input className="rt-ctrl-input" type="number" value={customVal}
            onChange={e => setCustomVal(e.target.value)} placeholder="Enter value"/>
          <button className="rt-add-val-btn" onClick={addVal}>+</button>
        </div>
        {userVals.length > 0 && (
          <div className="rt-val-chips">
            {userVals.slice(-5).map((v,i) => (
              <span key={i} className="rt-val-chip">{v}</span>
            ))}
            {userVals.length > 5 && <span className="rt-val-more">+{userVals.length-5}</span>}
          </div>
        )}
      </div>

      <button className="rt-add-stream-btn"
        onClick={() => onAddStream({ type: selType, interval, xLabel, yLabel, userVals: [...userVals] })}>
        + Add Stream
      </button>

      {streams.length > 0 && (
        <div className="rt-pause-row">
          <button className={`rt-pause-btn ${paused ? "resume" : ""}`}
            onClick={() => paused ? onResume() : onPause()}>
            {paused ? "▶ Resume All" : "⏸ Pause All"}
          </button>
        </div>
      )}

      <div className="rt-active-count">
        {streams.length} active stream{streams.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

// ── Main Realtime Panel ───────────────────────────────────────────────────────
const RealtimePanel = ({ wsBaseUrl = "ws://localhost:8000/api/v1/enterprise/realtime" }) => {
  const [streams, setStreams]     = useState({});   // stream_id → stream state
  const [paused, setPaused]       = useState(false);
  const [ctrlOpen, setCtrlOpen]   = useState(true);
  const socketsRef = useRef({});

  const connectStream = useCallback(({ type, interval, xLabel, yLabel, userVals }) => {
    const streamId = `s_${Date.now()}`;
    const url      = `${wsBaseUrl}/${type}?interval_ms=${interval}&x_label=${encodeURIComponent(xLabel)}&y_label=${encodeURIComponent(yLabel)}`;

    try {
      const ws = new WebSocket(url);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "tick") {
            setStreams(prev => ({
              ...prev,
              [streamId]: { ...msg, stream_id: streamId },
            }));
          }
        } catch {}
      };

      ws.onopen = () => {
        // Send user values if any
        if (userVals?.length) {
          userVals.forEach(v => {
            ws.send(JSON.stringify({ action: "add_value", value: v }));
          });
        }
        if (xLabel) ws.send(JSON.stringify({ action: "set_labels", x_label: xLabel, y_label: yLabel }));
      };

      ws.onerror = () => {
        // Fallback: simulate locally when no WS server
        _startLocalSimulation(streamId, type, interval, xLabel, yLabel, userVals);
      };

      ws.onclose = () => { delete socketsRef.current[streamId]; };
      socketsRef.current[streamId] = ws;
    } catch (err) {
      _startLocalSimulation(streamId, type, interval, xLabel, yLabel, userVals);
    }
  }, [wsBaseUrl]);

  const _startLocalSimulation = useCallback((streamId, type, interval, xLabel, yLabel, userVals) => {
    let tick = 0;
    let history = [];
    let prev = type === "stock" ? 150 : type === "revenue" ? 5000 : 50;

    const timer = setInterval(() => {
      const now  = new Date();
      let val;
      if (userVals?.length) {
        val = userVals[tick % userVals.length];
      } else {
        const drift = (Math.random() - 0.48) * (type === "stock" ? prev*0.008 : type === "revenue" ? 200 : 3);
        val = Math.max(0, prev + drift);
        prev = val;
      }
      val = Math.round(val * 100) / 100;

      const point = { x: now.toTimeString().slice(0,8), y: val, ts: now.toISOString() };
      history = [...history.slice(-60), point];
      const prevVal = history[history.length-2]?.y ?? val;
      const change = val - prevVal;

      setStreams(prev_s => ({
        ...prev_s,
        [streamId]: {
          stream_id:    streamId,
          stream_type:  type,
          label:        STREAM_TYPES[type]?.label || type,
          unit:         yLabel || STREAM_TYPES[type]?.unit || "",
          x_axis_label: xLabel,
          y_axis_label: yLabel || STREAM_TYPES[type]?.unit || "Value",
          history,
          current: val,
          change,
          change_pct: prevVal ? change/prevVal*100 : 0,
          trend: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
          tick: ++tick,
        },
      }));
    }, interval);

    socketsRef.current[streamId] = { close: () => clearInterval(timer), _timer: timer, _local: true };
  }, []);

  const removeStream = useCallback((streamId) => {
    const sock = socketsRef.current[streamId];
    if (sock) sock.close();
    delete socketsRef.current[streamId];
    setStreams(prev => { const n = {...prev}; delete n[streamId]; return n; });
  }, []);

  const pauseAll = useCallback(() => {
    Object.values(socketsRef.current).forEach(ws => {
      if (!ws._local) ws.send?.(JSON.stringify({ action: "pause" }));
    });
    setPaused(true);
  }, []);

  const resumeAll = useCallback(() => {
    Object.values(socketsRef.current).forEach(ws => {
      if (!ws._local) ws.send?.(JSON.stringify({ action: "resume" }));
    });
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(socketsRef.current).forEach(ws => ws.close?.());
    };
  }, []);

  const streamEntries = Object.entries(streams);

  return (
    <div className="rt-root">
      <div className="rt-header">
        <div className="rt-header-left">
          <span className="rt-dot" />
          <span className="rt-title">Live Analytics</span>
          <span className="rt-count">{streamEntries.length} streams</span>
        </div>
        <button className="rt-ctrl-toggle" onClick={() => setCtrlOpen(o => !o)}>
          {ctrlOpen ? "Hide Controls" : "Show Controls"}
        </button>
      </div>

      <div className="rt-body">
        <div className="rt-streams">
          {streamEntries.length === 0 && (
            <div className="rt-empty">
              <div className="rt-empty-icon">📡</div>
              <div className="rt-empty-title">No active streams</div>
              <div className="rt-empty-hint">Add a stream from the controls panel →</div>
            </div>
          )}
          {streamEntries.map(([id, stream], i) => (
            <div key={id} className="rt-stream-wrap">
              <StreamChart stream={stream} color={PALETTE[i % PALETTE.length]} />
              <button className="rt-remove-stream" onClick={() => removeStream(id)}>×</button>
            </div>
          ))}
        </div>

        {ctrlOpen && (
          <StreamControls
            onAddStream={connectStream}
            onPause={pauseAll}
            onResume={resumeAll}
            paused={paused}
            streams={streamEntries}
          />
        )}
      </div>
    </div>
  );
};

export default RealtimePanel;