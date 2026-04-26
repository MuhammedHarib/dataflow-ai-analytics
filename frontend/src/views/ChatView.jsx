// src/views/ChatView.jsx
// Light theme redesign — "Refined Monochrome Pro"
// • White chat area, #F9FAFB sidebar, #E5E7EB borders
// • Starter cards (empty state)
// • Context dropdown replaces raw dataset/upload controls
// • Floating rounded input bar with shadow
// • react-markdown h1/h2/h3 overridden to bold text (no ### symbols)
// • useEffect async pattern fixed (no Promise returns)

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  FileText, LayoutDashboard, TrendingUp, Search,
  Plus, Paperclip, Send, ChevronDown, X,
  MessageSquare, Database, Trash2, CheckCircle,
} from "lucide-react";
import { sendMessage as aiSend } from "../api/chat";
import { historyApi, datasetsApi } from "../api/client";

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  pageBg:    "#F9FAFB",
  chatBg:    "#FFFFFF",
  border:    "#E5E7EB",
  text:      "#111827",
  textSub:   "#6B7280",
  textDim:   "#9CA3AF",
  accent:    "#6366f1",
  accentBg:  "#EEF2FF",
  accentBd:  "#C7D2FE",
  userBubble:"#F3F4F6",
  userBd:    "#E5E7EB",
  green:     "#10B981",
  greenBg:   "#ECFDF5",
  greenBd:   "#A7F3D0",
  amber:     "#F59E0B",
  amberBg:   "#FFFBEB",
  red:       "#EF4444",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ─── Markdown component overrides ─────────────────────────────────
// h1/h2/h3 → bold paragraph, no heading hierarchy / no ### symbols
const MD_COMPONENTS = {
  h1: ({ children }) => (
    <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: "0 0 6px", color: C.text, lineHeight: 1.4 }}>{children}</p>
  ),
  h2: ({ children }) => (
    <p style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0 0 5px", color: C.text, lineHeight: 1.4 }}>{children}</p>
  ),
  h3: ({ children }) => (
    <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 4px", color: C.text, lineHeight: 1.4 }}>{children}</p>
  ),
  p: ({ children }) => (
    <p style={{ margin: "0 0 8px", lineHeight: 1.65, color: C.text, fontSize: 13 }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 8px", paddingLeft: 20, color: C.text, fontSize: 13 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 8px", paddingLeft: 20, color: C.text, fontSize: 13 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ margin: "2px 0", lineHeight: 1.6 }}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 600, color: C.text }}>{children}</strong>
  ),
  code: ({ inline, children }) => inline
    ? <code style={{ background: "#F3F4F6", border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", fontSize: 12, fontFamily: "monospace", color: "#4F46E5" }}>{children}</code>
    : <pre style={{ background: "#F9FAFB", border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px", overflowX: "auto", fontSize: 12, fontFamily: "monospace", margin: "0 0 8px" }}><code>{children}</code></pre>,
}

// ─── Starter cards ────────────────────────────────────────────────
const STARTER_CARDS = [
  { icon: FileText,       label: "Summarize Dataset",  prompt: "Please give me a clear summary of this dataset — key columns, distributions, and any notable patterns." },
  { icon: LayoutDashboard,label: "Create a Dashboard", prompt: "Based on this dataset, suggest the best dashboard layout with the most insightful chart types and KPIs." },
  { icon: TrendingUp,     label: "Trend Analysis",     prompt: "Identify and explain the main trends over time in this dataset." },
  { icon: Search,         label: "Find Anomalies",     prompt: "Scan this dataset for anomalies, outliers, or unexpected values and explain what you find." },
]

// ─── Sessions list (left panel) ───────────────────────────────────
function SessionsList({ projectId, activeChatId, onSelect, onNew }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!projectId) { setLoading(false); return }
    let cancelled = false
    historyApi.listSessions(projectId)
      .then(r => { if (!cancelled) setSessions(r.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Delete this conversation?")) return
    await historyApi.deleteSession(id).catch(() => {})
    setSessions(prev => prev.filter(s => s.id !== id))
    if (activeChatId === id) onNew()
  }

  return (
    <div style={{
      width: 240, minWidth: 240,
      background: C.pageBg,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      flexShrink: 0, overflow: "hidden",
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 14px 12px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim,
          textTransform: "uppercase", letterSpacing: "0.07em" }}>Conversations</span>
        <button
          onClick={onNew}
          title="New chat"
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: C.accentBg, border: `1px solid ${C.accentBd}`,
            color: C.accent, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.accentBd}
          onMouseLeave={e => e.currentTarget.style.background = C.accentBg}
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {loading ? (
          <p style={{ fontSize: 12, color: C.textDim, padding: "8px", margin: 0 }}>Loading…</p>
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textDim, padding: "8px", lineHeight: 1.6, margin: 0 }}>
            No conversations yet.<br />Start a new chat.
          </p>
        ) : sessions.map(s => (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              padding: "9px 10px", borderRadius: 8, cursor: "pointer",
              background: activeChatId === s.id ? C.accentBg : "transparent",
              borderLeft: activeChatId === s.id ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom: 2, display: "flex", alignItems: "flex-start",
              gap: 8, transition: "background 0.1s", position: "relative",
            }}
            onMouseEnter={e => { if (activeChatId !== s.id) e.currentTarget.style.background = "#F3F4F6" }}
            onMouseLeave={e => { if (activeChatId !== s.id) e.currentTarget.style.background = "transparent" }}
          >
            <MessageSquare size={13} style={{ flexShrink: 0, marginTop: 2, color: activeChatId === s.id ? C.accent : C.textDim }} strokeWidth={1.8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: activeChatId === s.id ? 600 : 400,
                color: activeChatId === s.id ? C.accent : C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{s.title || "Untitled"}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                {s.message_count} message{s.message_count !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              onClick={e => handleDelete(e, s.id)}
              style={{
                opacity: 0, width: 18, height: 18, borderRadius: 4,
                background: "none", border: "none", color: C.red,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", transition: "opacity 0.1s", flexShrink: 0,
              }}
              className="del-btn"
            >
              <Trash2 size={11} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        div:hover .del-btn { opacity: 1 !important; }
      `}</style>
    </div>
  )
}

// ─── Context dropdown (replaces raw dataset + upload controls) ────
function ContextMenu({ datasets, selectedDs, onSelect, selectedFile, onFileSelect, onFileClear, fileRef, aiSessionId }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hasContext = selectedDs || selectedFile || aiSessionId
  const label = selectedFile
    ? selectedFile.name.slice(0, 18) + (selectedFile.name.length > 18 ? "…" : "")
    : selectedDs
      ? (datasets.find(d => (d.session_id || String(d.id)) === selectedDs)?.file_name || "Dataset").slice(0, 18)
      : "Context"

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: hasContext ? C.accentBg : "#F9FAFB",
          border: `1px solid ${hasContext ? C.accentBd : C.border}`,
          color: hasContext ? C.accent : C.textSub,
          cursor: "pointer", fontSize: 12, fontWeight: 500,
          transition: "all 0.15s", fontFamily: FONT,
        }}
      >
        <Database size={13} strokeWidth={1.8} />
        <span>{label}</span>
        {hasContext && aiSessionId && <CheckCircle size={11} strokeWidth={2} style={{ color: C.green }} />}
        <ChevronDown size={11} strokeWidth={2} style={{
          transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)"
        }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          width: 260, zIndex: 100,
          background: "#FFFFFF",
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {/* Dataset section */}
          <div style={{ padding: "10px 12px 6px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim,
              textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Dataset</p>
            <div
              onClick={() => { onSelect(null); setOpen(false) }}
              style={{
                padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                color: !selectedDs ? C.accent : C.text,
                background: !selectedDs ? C.accentBg : "transparent",
                fontWeight: !selectedDs ? 600 : 400,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (selectedDs) e.currentTarget.style.background = "#F3F4F6" }}
              onMouseLeave={e => { if (selectedDs) e.currentTarget.style.background = "transparent" }}
            >None</div>
            {datasets.map(d => {
              const val = d.session_id || String(d.id)
              const active = selectedDs === val
              return (
                <div
                  key={d.id}
                  onClick={() => { onSelect(val); setOpen(false) }}
                  style={{
                    padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                    color: active ? C.accent : C.text,
                    background: active ? C.accentBg : "transparent",
                    fontWeight: active ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F3F4F6" }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent" }}
                >
                  <Database size={11} strokeWidth={1.8} style={{ color: active ? C.accent : C.textDim, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file_name}</span>
                  {active && aiSessionId && <CheckCircle size={11} strokeWidth={2} style={{ color: C.green, marginLeft: "auto", flexShrink: 0 }} />}
                </div>
              )
            })}
          </div>

          <div style={{ height: 1, background: C.border, margin: "4px 0" }} />

          {/* File upload section */}
          <div style={{ padding: "6px 12px 10px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textDim,
              textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Upload File</p>
            {selectedFile ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 7,
                background: C.accentBg, border: `1px solid ${C.accentBd}`,
              }}>
                <Paperclip size={12} strokeWidth={2} style={{ color: C.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.accent, flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedFile.name}
                </span>
                <button onClick={e => { e.stopPropagation(); onFileClear() }}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    color: C.textDim, display: "flex", alignItems: "center", padding: 0 }}>
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { fileRef.current?.click(); setOpen(false) }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 7,
                  background: "transparent", border: `1.5px dashed ${C.border}`,
                  color: C.textSub, cursor: "pointer", fontSize: 12,
                  transition: "all 0.15s", fontFamily: FONT,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.borderColor = C.accent }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = C.border }}
              >
                <Paperclip size={12} strokeWidth={2} />
                Attach a file
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user"
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 20,
      fontFamily: FONT,
    }}>
      {/* AI avatar dot */}
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginRight: 10, marginTop: 2,
          boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
        }}>
          <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>AI</span>
        </div>
      )}

      <div style={{
        maxWidth: isUser ? "68%" : "82%",
        // User: subtle gray pill bubble
        // AI: plain white document-style, no bubble
        ...(isUser ? {
          padding: "10px 14px",
          borderRadius: "16px 16px 4px 16px",
          background: C.userBubble,
          border: `1px solid ${C.userBd}`,
          fontSize: 13, color: C.text, lineHeight: 1.6,
        } : {
          padding: "2px 0",
          fontSize: 13, color: C.text, lineHeight: 1.65,
        }),
        wordBreak: "break-word",
      }}>
        {isUser
          ? <span>{msg.content}</span>
          : <ReactMarkdown components={MD_COMPONENTS}>{msg.content}</ReactMarkdown>
        }
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 5,
          textAlign: isUser ? "right" : "left" }}>
          {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: C.accentBg, border: `1.5px solid ${C.accentBd}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginLeft: 10, marginTop: 2,
          fontSize: 10, fontWeight: 700, color: C.accent,
        }}>MH</div>
      )}
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #6366f1, #818cf8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
      }}>
        <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>AI</span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 14px",
        background: "#F9FAFB", borderRadius: "16px 16px 16px 4px",
        border: `1px solid ${C.border}` }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: C.textDim,
            animation: `df-bounce 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Empty state with starter cards ──────────────────────────────
function EmptyState({ onPrompt }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", padding: "40px 24px",
      fontFamily: FONT,
    }}>
      {/* Logo glow */}
      <div style={{
        width: 52, height: 52, borderRadius: 16, marginBottom: 20,
        background: "linear-gradient(135deg, #6366f1, #818cf8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 24px rgba(99,102,241,0.28)",
      }}>
        <span style={{ fontSize: 22, color: "#fff", fontWeight: 800 }}>AI</span>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text,
        letterSpacing: "-0.03em", margin: "0 0 8px", textAlign: "center" }}>
        Ask anything about your data
      </h2>
      <p style={{ fontSize: 13, color: C.textSub, margin: "0 0 32px",
        textAlign: "center", maxWidth: 360, lineHeight: 1.6 }}>
        Upload a dataset and start exploring. DataFlow will analyze, visualize, and summarize your data instantly.
      </p>

      {/* Starter cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12, width: "100%", maxWidth: 480,
      }}>
        {STARTER_CARDS.map(card => {
          const Icon = card.icon
          return (
            <button
              key={card.label}
              onClick={() => onPrompt(card.prompt)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "14px 16px", borderRadius: 12, textAlign: "left",
                background: "#FFFFFF", border: `1px solid ${C.border}`,
                cursor: "pointer", transition: "all 0.15s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                fontFamily: FONT,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.accentBd
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.1)"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: C.accentBg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={15} strokeWidth={1.8} style={{ color: C.accent }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text,
                lineHeight: 1.4, marginTop: 6 }}>{card.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ChatView ─────────────────────────────────────────────────
export default function ChatView({ projectId, chatId, newChat, onNavigate }) {
  const [activeChatId,   setActiveChatId]   = useState(chatId || null)
  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState("")
  const [sending,        setSending]        = useState(false)
  const [sessionDbId,    setSessionDbId]    = useState(null)
  const [datasets,       setDatasets]       = useState([])
  const [selectedDs,     setSelectedDs]     = useState(null)
  const [aiSessionId,    setAiSessionId]    = useState(null)
  const [profileContext, setProfileContext] = useState(null)
  const [chatHistory,    setChatHistory]    = useState([])
  const [selectedFile,   setSelectedFile]   = useState(null)

  const bottomRef = useRef(null)
  const fileRef   = useRef(null)
  const textareaRef = useRef(null)

  // Load datasets
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    datasetsApi.list(projectId)
      .then(r => { if (!cancelled) setDatasets(r.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [projectId])

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId) { setMessages([]); setSessionDbId(null); return }
    let cancelled = false
    historyApi.getMessages(activeChatId)
      .then(r => { if (!cancelled) { setMessages(r.data); setSessionDbId(activeChatId) } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeChatId])

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  const startNewChat = useCallback(() => {
    setActiveChatId(null)
    setMessages([])
    setSessionDbId(null)
    setAiSessionId(null)
    setProfileContext(null)
    setChatHistory([])
    setSelectedFile(null)
  }, [])

  const ensureDbSession = useCallback(async () => {
    if (sessionDbId) return sessionDbId
    if (!projectId) return null
    const res = await historyApi.createSession({
      project_id: projectId,
      dataset_id: selectedDs || null,
      title: "New conversation",
    })
    const id = res.data.id
    setActiveChatId(id)
    setSessionDbId(id)
    return id
  }, [sessionDbId, projectId, selectedDs])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
    e.target.value = ""
  }

  // Called by starter cards or regular send
  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text && !selectedFile) return
    if (sending) return

    const fileSnap = selectedFile
    setInput("")
    setSelectedFile(null)
    setSending(true)

    const tempUser = {
      id: "tmp_u", role: "user",
      content: text || (fileSnap ? `📎 ${fileSnap.name}` : ""),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUser])

    try {
      const res = await aiSend(
        text,
        fileSnap    || null,
        aiSessionId || null,
        profileContext || null,
        chatHistory,
      )

      if (fileSnap && res.session_id) {
        setAiSessionId(res.session_id)
        setProfileContext(res.profile_context || null)
        setChatHistory([])
      }

      const answer = res.answer || res.message || "…"

      if (!fileSnap) {
        setChatHistory(prev => [
          ...prev,
          { role: "user",      content: text },
          { role: "assistant", content: answer },
        ])
      }

      const aiBubble = {
        id: "tmp_a", role: "assistant",
        content: answer,
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== "tmp_u"),
        { ...tempUser, id: Date.now() },
        aiBubble,
      ])

      const sid = await ensureDbSession()
      if (sid) {
        await historyApi.addMessage(sid, { role: "user",      content: tempUser.content })
        await historyApi.addMessage(sid, { role: "assistant", content: answer })
      }
    } catch {
      setMessages(prev => [
        ...prev.filter(m => m.id !== "tmp_u"),
        { ...tempUser, id: Date.now() },
        { id: "err", role: "assistant",
          content: "Something went wrong. Please try again.",
          created_at: new Date().toISOString() },
      ])
    } finally {
      setSending(false)
    }
  }, [input, selectedFile, sending, aiSessionId, profileContext, chatHistory, ensureDbSession])

  const canSend = (input.trim().length > 0 || !!selectedFile) && !sending

  return (
    <div style={{ display: "flex", height: "100%", background: C.pageBg, fontFamily: FONT }}>

      {/* Sessions sidebar */}
      <SessionsList
        projectId={projectId}
        activeChatId={activeChatId}
        onSelect={id => setActiveChatId(id)}
        onNew={startNewChat}
      />

      {/* Chat column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0, background: C.chatBg }}>

        {/* ── Header bar ─────────────────────────────────────── */}
        <div style={{
          padding: "10px 20px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          background: "#FFFFFF",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "-0.02em" }}>
            AI Workspace
          </span>
          <div style={{ flex: 1 }} />

          {/* Staged file chip */}
          {selectedFile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 99,
              background: C.accentBg, border: `1px solid ${C.accentBd}`,
              fontSize: 11, color: C.accent,
            }}>
              <Paperclip size={11} strokeWidth={2} />
              <span>{selectedFile.name.slice(0, 20)}…</span>
              <button onClick={() => setSelectedFile(null)}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: C.textDim, padding: 0, display: "flex", alignItems: "center" }}>
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* AI session indicator */}
          {aiSessionId && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 99,
              background: C.greenBg, border: `1px solid ${C.greenBd}`,
              fontSize: 11, color: C.green,
            }}>
              <CheckCircle size={11} strokeWidth={2} />
              Dataset loaded
            </div>
          )}

          {/* Context menu */}
          <ContextMenu
            datasets={datasets}
            selectedDs={selectedDs}
            onSelect={setSelectedDs}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileClear={() => setSelectedFile(null)}
            fileRef={fileRef}
            aiSessionId={aiSessionId}
          />
          <input ref={fileRef} type="file"
            accept=".csv,.xlsx,.xls,.tsv,.json,.parquet,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: "none" }}
            onChange={handleFileSelect} />
        </div>

        {/* ── Messages ───────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px 12px" }}>
          {messages.length === 0
            ? <EmptyState onPrompt={text => handleSend(text)} />
            : messages.map((m, i) => <Bubble key={m.id || i} msg={m} />)
          }
          {sending && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* ── Floating input bar ─────────────────────────────── */}
        <div style={{ padding: "12px 24px 20px", background: C.chatBg, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: "#FFFFFF",
            border: `1.5px solid ${C.border}`,
            borderRadius: 16,
            padding: "10px 10px 10px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = C.accent
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.04)"
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = C.border
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)"
          }}
          >
            {/* Attach icon */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach file"
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: "transparent", border: `1px solid ${C.border}`,
                color: C.textDim, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", marginBottom: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentBg; e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accentBd }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border }}
            >
              <Paperclip size={14} strokeWidth={1.8} />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Ask anything about your data… (Enter to send, Shift+Enter for newline)"
              rows={1}
              style={{
                flex: 1, background: "transparent",
                border: "none", outline: "none", resize: "none",
                color: C.text, fontSize: 13, lineHeight: 1.6,
                fontFamily: FONT, padding: "4px 0",
                maxHeight: 140, overflowY: "auto",
              }}
              onInput={e => {
                e.target.style.height = "auto"
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"
              }}
            />

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: canSend ? C.accent : "#F3F4F6",
                border: "none", cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s, transform 0.1s",
                marginBottom: 1,
              }}
              onMouseEnter={e => { if (canSend) e.currentTarget.style.transform = "scale(1.05)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
            >
              <Send size={14} strokeWidth={2} style={{ color: canSend ? "#fff" : C.textDim }} />
            </button>
          </div>

          {/* Hint */}
          <p style={{ fontSize: 10, color: C.textDim, textAlign: "center",
            margin: "8px 0 0", letterSpacing: "0.01em" }}>
            DataFlow may make mistakes. Double-check important outputs.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes df-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}