// src/components/dashboards/NewDashboardModal.jsx
import React, { useState } from "react";

const T = {
  overlay: "rgba(0,0,0,0.72)", bg: "#1a1d28",
  border: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.88)", muted: "rgba(255,255,255,0.38)",
  accent: "#e05c2d",
};

const SCHEMES = [
  { name:"Metric Flow", accent:"#e05c2d", desc:"Clean dark orange" },
  { name:"Neon Dark",   accent:"#00ffb4", desc:"Cyberpunk green"   },
  { name:"Ocean Blue",  accent:"#63b3ed", desc:"Deep blue calm"    },
  { name:"Solar Gold",  accent:"#f5a31a", desc:"Warm amber"        },
  { name:"Rose Quartz", accent:"#ec4899", desc:"Bold pink"         },
  { name:"Cyberpunk",   accent:"#ffff00", desc:"Max contrast"      },
];

const PRESETS = [
  "Sales dashboard — KPI cards for revenue, orders, customers. Monthly trend line chart, bar chart for top products, pie chart for region distribution.",
  "Operations dashboard — uptime, throughput, error rate KPIs. Time-series line chart, activity heatmap, ranking table.",
  "Executive summary — 4 KPI cards, large area trend, donut distribution, radar performance, ranking table.",
  "Financial overview — revenue, profit, expenses, margin KPIs. Composed chart, budget vs actual radar, cost center ranking.",
];

export default function NewDashboardModal({ projectId, onConfirm, onClose }) {
  const [name,   setName]   = useState("");
  const [desc,   setDesc]   = useState("");
  const [scheme, setScheme] = useState("Metric Flow");
  const [prompt, setPrompt] = useState("");
  const [err,    setErr]    = useState("");

  const submit = () => {
    if (!name.trim()) { setErr("Dashboard name is required."); return; }
    onConfirm({
      name: name.trim(),
      description: desc.trim() || null,
      scheme,
      // The prompt goes into layout_json so DashboardGenerator can pick it up
      layout: prompt.trim() ? { _prompt: prompt.trim(), widgets: [] } : null,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 28, width: 480,
        display: "flex", flexDirection: "column", gap: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        animation: "slideUp 0.18s ease", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>New Dashboard</div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: T.muted, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block",
            marginBottom: 6, fontWeight: 600 }}>Dashboard Name *</label>
          <input value={name} onChange={e => { setName(e.target.value); setErr(""); }}
            placeholder="e.g. Revenue Dashboard"
            autoFocus
            style={{ width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${err ? "#f97272" : T.border}`,
              borderRadius: 9, color: T.text, fontSize: 13,
              padding: "10px 12px", outline: "none" }}/>
          {err && <div style={{ fontSize: 11, color: "#f97272", marginTop: 4 }}>{err}</div>}
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block",
            marginBottom: 6, fontWeight: 600 }}>Description (optional)</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What does this dashboard show?"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.border}`, borderRadius: 9,
              color: T.text, fontSize: 13, padding: "10px 12px", outline: "none" }}/>
        </div>

        {/* Color scheme */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block",
            marginBottom: 8, fontWeight: 600 }}>Color Scheme</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
            {SCHEMES.map(sc => (
              <div key={sc.name} onClick={() => setScheme(sc.name)} style={{
                padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                background: scheme === sc.name ? `${sc.accent}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${scheme === sc.name ? sc.accent + "55" : T.border}`,
                transition: "all 0.12s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3,
                    background: sc.accent, boxShadow: `0 0 5px ${sc.accent}88` }}/>
                  <span style={{ fontSize: 11, fontWeight: 700,
                    color: scheme === sc.name ? sc.accent : T.text }}>{sc.name}</span>
                </div>
                <div style={{ fontSize: 10, color: T.muted }}>{sc.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Prompt */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block",
            marginBottom: 6, fontWeight: 600 }}>
            Describe your dashboard
            <span style={{ fontWeight: 400, marginLeft: 5 }}>(AI builds it for you)</span>
          </label>
          {/* Quick presets */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {["Sales","Operations","Executive","Financial"].map((p, i) => (
              <button key={p} onClick={() => setPrompt(PRESETS[i])} style={{
                fontSize: 10, padding: "3px 10px",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${T.border}`, borderRadius: 99,
                color: T.muted, cursor: "pointer" }}>{p}</button>
            ))}
          </div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. 4 KPI cards for revenue, orders, customers, conversion. Monthly line chart. Bar chart for top 5 products."
            rows={3}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.border}`, borderRadius: 9,
              color: T.text, fontSize: 12, padding: "10px 12px",
              outline: "none", resize: "none", fontFamily: "inherit" }}/>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9,
            background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`,
            color: T.muted, cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={submit} style={{ padding: "10px 24px", borderRadius: 9,
            background: SCHEMES.find(s => s.name === scheme)?.accent || T.accent,
            border: "none", color: "#000", cursor: "pointer",
            fontSize: 13, fontWeight: 800 }}>Create Dashboard</button>
        </div>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}