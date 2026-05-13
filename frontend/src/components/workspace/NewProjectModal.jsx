// src/components/workspace/NewProjectModal.jsx
import React, { useState } from "react";
import {
  FolderOpen, X, FileText, AlignLeft, Smile, Palette,
  LayoutDashboard, TrendingUp, BarChart2, DollarSign, Globe,
  Cpu, Target, FlaskConical, Users, Zap, Info, Plus,
} from "lucide-react";

// ── Design tokens ────────────────────────────────────────────────
const S = {
  bg:          "#ffffff",
  bgSecondary: "#F9FAFB",
  border:      "#E5E7EB",
  borderFocus: "#6366f1",
  text:        "#111827",
  textMuted:   "#6B7280",
  textLight:   "#9CA3AF",
  accent:      "#6366f1",
  accentBg:    "#EEF2FF",
};

// ── Icon registry — Lucide icons mapped to an id ─────────────────
const ICONS = [
  { id: "dashboard",  Icon: LayoutDashboard },
  { id: "trending",   Icon: TrendingUp      },
  { id: "bar",        Icon: BarChart2       },
  { id: "dollar",     Icon: DollarSign      },
  { id: "globe",      Icon: Globe           },
  { id: "cpu",        Icon: Cpu             },
  { id: "target",     Icon: Target          },
  { id: "flask",      Icon: FlaskConical    },
  { id: "users",      Icon: Users           },
  { id: "zap",        Icon: Zap             },
];

// ── Accent palette ────────────────────────────────────────────────
const COLORS = [
  "#6366f1", "#e05c2d", "#3ecfb2", "#f0c040",
  "#ec4899", "#5b8cff", "#34d399", "#f97272",
  "#a855f7", "#06b6d4",
];

// ── Shared sub-styles ────────────────────────────────────────────
const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: S.textMuted,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginBottom: 8,
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
      position: "absolute", left: 11, top: "50%",
      transform: "translateY(-50%)",
      color: S.textLight, pointerEvents: "none", display: "flex",
    }}>
      <Icon size={14} strokeWidth={1.8} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function NewProjectModal({ onConfirm, onClose }) {
  const [name,  setName]  = useState("");
  const [desc,  setDesc]  = useState("");
  const [iconId, setIconId] = useState("dashboard");
  const [color, setColor] = useState("#6366f1");
  const [err,   setErr]   = useState("");

  const handleSubmit = () => {
    if (!name.trim()) { setErr("Project name is required."); return; }
    onConfirm({ name: name.trim(), description: desc.trim() || null, icon: iconId, color });
  };

  const ActiveIcon = ICONS.find(i => i.id === iconId)?.Icon ?? LayoutDashboard;

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
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: S.bg,
          borderRadius: 20,
          border: `1px solid ${S.border}`,
          width: "100%",
          maxWidth: 540,
          margin: "0 16px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.14)",
          animation: "npm-slideUp 0.18s ease",
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
              <FolderOpen size={17} color={S.accent} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text }}>New Project</div>
              <div style={{ fontSize: 12, color: S.textMuted, marginTop: 1 }}>
                Set up your analytics workspace
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
          display: "flex", flexDirection: "column", gap: 20,
          overflowY: "auto", flex: 1,
        }}>

          {/* Live Preview Badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: S.bgSecondary,
            borderRadius: 12,
            border: `1px solid ${S.border}`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: color + "18",
              border: `1px solid ${color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              <ActiveIcon size={20} color={color} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: name.trim() ? S.text : S.textLight,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {name.trim() || "Project name…"}
              </div>
              <div style={{ fontSize: 12, color: S.textLight, marginTop: 2 }}>
                {desc.trim() || "No description"}
              </div>
            </div>
            <div style={{
              marginLeft: "auto", flexShrink: 0,
              fontSize: 11, color: S.textLight,
              padding: "3px 9px",
              background: S.bg,
              border: `1px solid ${S.border}`,
              borderRadius: 99,
            }}>
              Preview
            </div>
          </div>

          {/* Name */}
          <div>
            <div style={labelStyle}>
              <FileText size={12} strokeWidth={1.8} />
              Project Name <span style={{ color: S.accent }}>*</span>
            </div>
            <div style={{ position: "relative" }}>
              <InputIcon icon={FileText} />
              <input
                value={name}
                onChange={e => { setName(e.target.value); setErr(""); }}
                placeholder="e.g. Sales Analytics Q4"
                autoFocus
                style={{
                  ...inputBase,
                  borderColor: err ? "#ef4444" : S.border,
                }}
              />
            </div>
            {err && (
              <div style={{
                fontSize: 11, color: "#ef4444", marginTop: 5,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Info size={11} /> {err}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <div style={labelStyle}>
              <AlignLeft size={12} strokeWidth={1.8} />
              Description
              <span style={{
                fontSize: 10, fontWeight: 400,
                color: S.textLight, textTransform: "none", letterSpacing: 0,
              }}>optional</span>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 11, top: 11,
                color: S.textLight, pointerEvents: "none", display: "flex",
              }}>
                <AlignLeft size={14} strokeWidth={1.8} />
              </div>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="What is this project about?"
                rows={2}
                style={{
                  width: "100%",
                  padding: "9px 12px 9px 36px",
                  borderRadius: 10,
                  border: `1px solid ${S.border}`,
                  background: S.bgSecondary,
                  fontSize: 13,
                  color: S.text,
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  lineHeight: 1.5,
                }}
              />
            </div>
          </div>

          {/* Icon + Color row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20 }}>

            {/* Icon picker */}
            <div>
              <div style={labelStyle}>
                <Smile size={12} strokeWidth={1.8} />
                Project Icon
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ICONS.map(({ id, Icon }) => {
                  const active = iconId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setIconId(id)}
                      title={id}
                      style={{
                        width: 36, height: 36, borderRadius: 9,
                        cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: active ? color + "18" : S.bgSecondary,
                        border: `1.5px solid ${active ? color : S.border}`,
                        transition: "all 0.12s",
                      }}
                    >
                      <Icon
                        size={16}
                        strokeWidth={1.8}
                        color={active ? color : S.textMuted}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <div style={labelStyle}>
                <Palette size={12} strokeWidth={1.8} />
                Color
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 22px)",
                gap: 6,
              }}>
                {COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: c, cursor: "pointer",
                      border: `2px solid ${color === c ? c : "transparent"}`,
                      outline: color === c ? `2px solid ${c}44` : "none",
                      outlineOffset: 1,
                      transition: "all 0.12s",
                    }}
                  />
                ))}
              </div>
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
          <div style={{
            fontSize: 11, color: S.textLight,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Info size={11} strokeWidth={1.8} />
            Projects hold datasets, dashboards &amp; chats
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
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
              onClick={handleSubmit}
              style={{
                padding: "9px 20px", borderRadius: 10,
                border: "none",
                background: color,
                color: "#fff",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 7,
                transition: "background 0.15s",
              }}
            >
              <Plus size={14} strokeWidth={2.5} color="#fff" />
              Create Project
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes npm-slideUp {
          from { transform: translateY(14px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}