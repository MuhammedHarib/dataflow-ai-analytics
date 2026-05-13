// src/components/dashboards/NewDashboardModal.jsx
import React, { useState } from "react";
import {
  LayoutDashboard, X, FileText, AlignLeft, Palette,
  TrendingUp, Settings2, Users, DollarSign, Zap, Info, Lock, Plus,
} from "lucide-react";

const SCHEMES = [
  { name: "Metric Flow",  accent: "#e05c2d", desc: "Clean dark orange" },
  { name: "Neon Dark",    accent: "#00ffb4", desc: "Cyberpunk green"   },
  { name: "Ocean Blue",   accent: "#63b3ed", desc: "Deep blue calm"    },
  { name: "Solar Gold",   accent: "#f5a31a", desc: "Warm amber"        },
  { name: "Rose Quartz",  accent: "#ec4899", desc: "Bold pink"         },
  { name: "Cyberpunk",    accent: "#a855f7", desc: "Max contrast"      },
];

const PRESETS = [
  {
    label: "Sales",
    icon: TrendingUp,
    text: "Sales dashboard — KPI cards for revenue, orders, customers. Monthly trend line chart, bar chart for top products, pie chart for region distribution.",
  },
  {
    label: "Operations",
    icon: Settings2,
    text: "Operations dashboard — uptime, throughput, error rate KPIs. Time-series line chart, activity heatmap, ranking table.",
  },
  {
    label: "Executive",
    icon: Users,
    text: "Executive summary — 4 KPI cards, large area trend, donut distribution, radar performance, ranking table.",
  },
  {
    label: "Financial",
    icon: DollarSign,
    text: "Financial overview — revenue, profit, expenses, margin KPIs. Composed chart, budget vs actual radar, cost center ranking.",
  },
];

const S = {
  // Surfaces
  bg:          "#ffffff",
  bgSecondary: "#F9FAFB",
  border:      "#E5E7EB",
  borderFocus: "#6366f1",

  // Text
  text:        "#111827",
  textMuted:   "#6B7280",
  textLight:   "#9CA3AF",

  // Accent
  accent:      "#6366f1",
  accentBg:    "#EEF2FF",
  accentText:  "#4338CA",
};

const inputBase = {
  width: "100%",
  padding: "9px 12px 9px 36px",
  borderRadius: 10,
  border: `1px solid ${S.border}`,
  background: S.bgSecondary,
  fontSize: 13,
  color: S.text,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

function InputIcon({ icon: Icon }) {
  return (
    <div style={{
      position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
      color: S.textLight, pointerEvents: "none", display: "flex",
    }}>
      <Icon size={14} strokeWidth={1.8} />
    </div>
  );
}

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
      layout: prompt.trim() ? { _prompt: prompt.trim(), widgets: [] } : null,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.40)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, backdropFilter: "blur(6px)",
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: S.bg,
          borderRadius: 20,
          border: `1px solid ${S.border}`,
          width: "100%",
          maxWidth: 640,
          margin: "0 16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.14)",
          animation: "ndm-slideUp 0.18s ease",
          maxHeight: "92vh",
          overflow: "hidden",
        }}
      >

        {/* ── Header ── */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: `1px solid ${S.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: S.accentBg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <LayoutDashboard size={17} color={S.accent} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text }}>New Dashboard</div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 1 }}>
                Configure your analytics canvas
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: `1px solid ${S.border}`,
              background: S.bgSecondary,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: S.textMuted,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{
          padding: "22px 24px",
          display: "flex", flexDirection: "column", gap: 22,
          overflowY: "auto", flex: 1,
        }}>

          {/* Name + Description */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>
                <FileText size={12} strokeWidth={1.8} />
                Dashboard Name <span style={{ color: S.accent }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <InputIcon icon={FileText} />
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setErr(""); }}
                  placeholder="e.g. Revenue Dashboard"
                  autoFocus
                  style={{
                    ...inputBase,
                    borderColor: err ? "#ef4444" : S.border,
                  }}
                />
              </div>
              {err && (
                <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                  <Info size={11} /> {err}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>
                <AlignLeft size={12} strokeWidth={1.8} />
                Description
                <span style={{ fontSize: 10, fontWeight: 400, color: S.textLight }}>optional</span>
              </label>
              <div style={{ position: "relative" }}>
                <InputIcon icon={AlignLeft} />
                <input
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="What does this show?"
                  style={inputBase}
                />
              </div>
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <label style={labelStyle}>
              <Palette size={12} strokeWidth={1.8} />
              Color Scheme
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {SCHEMES.map(sc => {
                const active = scheme === sc.name;
                return (
                  <div
                    key={sc.name}
                    onClick={() => setScheme(sc.name)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 11,
                      cursor: "pointer",
                      background: active ? S.accentBg : S.bgSecondary,
                      border: `1.5px solid ${active ? S.accent : S.border}`,
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <div style={{
                        width: 11, height: 11, borderRadius: "50%",
                        background: sc.accent, flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: active ? S.accentText : S.text,
                      }}>{sc.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: S.textMuted }}>{sc.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Prompt */}
          <div>
            <label style={labelStyle}>
              <Zap size={12} strokeWidth={1.8} color={S.accent} />
              AI Layout Generator
              <span style={{
                fontSize: 10, fontWeight: 500,
                padding: "2px 8px", borderRadius: 99,
                background: S.accentBg, color: S.accent,
              }}>Optional</span>
            </label>

            {/* Preset chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {PRESETS.map(p => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    onClick={() => setPrompt(p.text)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 11, padding: "5px 12px",
                      background: S.bgSecondary,
                      border: `1px solid ${S.border}`,
                      borderRadius: 99,
                      color: S.textMuted,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    <Icon size={11} strokeWidth={1.8} />
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 13, top: 13,
                color: S.accent, pointerEvents: "none",
              }}>
                <Zap size={14} strokeWidth={1.8} />
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. 4 KPI cards for revenue, orders, customers, conversion. Monthly trend line. Bar chart for top 5 products."
                rows={3}
                style={{
                  width: "100%",
                  padding: "11px 13px 11px 36px",
                  borderRadius: 11,
                  border: `1px solid ${S.border}`,
                  background: S.bgSecondary,
                  fontSize: 12.5,
                  color: S.text,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  lineHeight: 1.6,
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
              <Info size={11} color={S.textLight} />
              <span style={{ fontSize: 11, color: S.textLight }}>
                AI auto-generates widgets from your description. Leave blank to start with an empty canvas.
              </span>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "15px 24px",
          borderTop: `1px solid ${S.border}`,
          background: S.bgSecondary,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: S.textLight }}>
            <Lock size={11} strokeWidth={1.8} />
            Saved automatically once created
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 10,
                border: `1px solid ${S.border}`,
                background: "transparent",
                color: S.textMuted,
                fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              style={{
                padding: "9px 22px", borderRadius: 10,
                border: "none",
                background: S.accent,
                color: "#fff",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              <Plus size={14} strokeWidth={2.5} color="#fff" />
              Create Dashboard
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes ndm-slideUp {
          from { transform: translateY(14px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#6B7280",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginBottom: 8,
};