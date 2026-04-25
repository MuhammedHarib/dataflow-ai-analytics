// src/components/workspace/NewProjectModal.jsx
import React, { useState } from "react";

const T = {
  overlay: "rgba(0,0,0,0.72)",
  bg:      "#1a1d28",
  border:  "rgba(255,255,255,0.08)",
  text:    "rgba(255,255,255,0.88)",
  muted:   "rgba(255,255,255,0.38)",
  accent:  "#e05c2d",
};

const ICONS  = ["📊","🔥","📈","💡","🗂","🌐","🧩","⚡","🔬","🏆","📉","🎯","🔑","💹","🧪"];
const COLORS = ["#e05c2d","#5b8cff","#3ecfb2","#f0c040","#a68cff","#f97272","#34d399","#fb923c","#ec4899","#06b6d4"];

export default function NewProjectModal({ onConfirm, onClose }) {
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [icon,  setIcon]  = useState("📊");
  const [color, setColor] = useState("#e05c2d");
  const [err,   setErr]   = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setErr("Project name is required."); return; }
    onConfirm({ name: name.trim(), description: desc.trim() || null, icon, color });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: T.overlay,
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 28, width: 420,
        display: "flex", flexDirection: "column", gap: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        animation: "slideUp 0.18s ease",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>New Project</div>
          <button onClick={onClose} style={{ background: "none", border: "none",
            color: T.muted, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>

        {/* Icon + color row */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* Icon picker */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>Icon</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {ICONS.map(ic => (
                <div key={ic} onClick={() => setIcon(ic)} style={{
                  width: 32, height: 32, borderRadius: 7, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                  background: icon === ic ? `${color}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${icon === ic ? color + "66" : T.border}`,
                  transition: "all 0.1s",
                }}>{ic}</div>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>Color</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {COLORS.slice(0, 5).map(c => (
                <div key={c} onClick={() => setColor(c)} style={{
                  width: 24, height: 24, borderRadius: 6, cursor: "pointer",
                  background: c,
                  border: `2px solid ${color === c ? "#fff" : "transparent"}`,
                  boxShadow: `0 0 6px ${c}66`,
                  transition: "all 0.1s",
                }}/>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>&nbsp;</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {COLORS.slice(5).map(c => (
                <div key={c} onClick={() => setColor(c)} style={{
                  width: 24, height: 24, borderRadius: 6, cursor: "pointer",
                  background: c,
                  border: `2px solid ${color === c ? "#fff" : "transparent"}`,
                  boxShadow: `0 0 6px ${c}66`,
                  transition: "all 0.1s",
                }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Preview badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}18`, border: `1px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>{icon}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
            {name || <span style={{ color: T.muted }}>Project name…</span>}
          </div>
        </div>

        {/* Name input */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
            Name <span style={{ color: "#f97272" }}>*</span>
          </label>
          <input value={name} onChange={e => { setName(e.target.value); setErr(""); }}
            placeholder="e.g. Sales Analytics Q4"
            autoFocus
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${err ? "#f97272" : T.border}`,
              borderRadius: 9, color: T.text, fontSize: 13,
              padding: "10px 12px", outline: "none",
            }}/>
          {err && <div style={{ fontSize: 11, color: "#f97272", marginTop: 4 }}>{err}</div>}
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: 11, color: T.muted, display: "block", marginBottom: 6, fontWeight: 600 }}>
            Description <span style={{ color: T.muted, fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="What is this project about?"
            rows={2}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.border}`, borderRadius: 9,
              color: T.text, fontSize: 13, padding: "10px 12px",
              outline: "none", resize: "none", fontFamily: "inherit",
            }}/>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "10px 20px", borderRadius: 9,
            background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`,
            color: T.muted, cursor: "pointer", fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleSubmit} style={{
            padding: "10px 24px", borderRadius: 9,
            background: `linear-gradient(135deg, ${color}, ${color}bb)`,
            border: "none", color: "#fff",
            cursor: "pointer", fontSize: 13, fontWeight: 700,
            boxShadow: `0 4px 16px ${color}44`,
            transition: "all 0.12s",
          }}>Create Project</button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}