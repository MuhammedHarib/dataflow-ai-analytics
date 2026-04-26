// src/views/ProjectChatView.jsx
// Light theme redesign — matches ChatView aesthetic
// • White chat area, #F9FAFB sessions panel
// • Dataset status banner redesigned for light theme
// • Sessions panel: clean list with Lucide icons
// • Rename modal: light theme
// • useEffect async pattern: all fixed (no Promise returns)

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus, MessageSquare, Trash2, MoreHorizontal,
  CheckCircle, AlertTriangle, ChevronsLeft, ChevronsRight,
  Database,
} from "lucide-react";
import ChatBox from "../components/ChatBox";
import { historyApi, datasetsApi } from "../api/client";

// ─── Design tokens (mirror ChatView) ─────────────────────────────
const C = {
  pageBg:   "#F9FAFB",
  chatBg:   "#FFFFFF",
  border:   "#E5E7EB",
  text:     "#111827",
  textSub:  "#6B7280",
  textDim:  "#9CA3AF",
  accent:   "#6366f1",
  accentBg: "#EEF2FF",
  accentBd: "#C7D2FE",
  green:    "#10B981",
  greenBg:  "#ECFDF5",
  greenBd:  "#A7F3D0",
  amber:    "#F59E0B",
  amberBg:  "#FFFBEB",
  amberBd:  "#FDE68A",
  red:      "#EF4444",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ─── Rename modal (light theme) ───────────────────────────────────
function RenameModal({ current, onConfirm, onCancel }) {
  const [val, setVal] = useState(current || "")
  const ref = useRef(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, fontFamily: FONT,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 24, width: 360,
          boxShadow: "0 20px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          Rename conversation
        </div>
        <p style={{ fontSize: 12, color: C.textSub, margin: "0 0 16px" }}>
          Give this conversation a descriptive name.
        </p>
        <input
          ref={ref}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") onConfirm(val.trim())
            if (e.key === "Escape") onCancel()
          }}
          style={{
            width: "100%", background: C.pageBg,
            border: `1.5px solid ${C.border}`,
            borderRadius: 9, color: C.text, fontSize: 13,
            padding: "9px 12px", outline: "none", fontFamily: FONT,
            marginBottom: 16, transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: C.pageBg, border: `1px solid ${C.border}`,
              color: C.textSub, cursor: "pointer", fontSize: 12, fontFamily: FONT,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#F3F4F6"}
            onMouseLeave={e => e.currentTarget.style.background = C.pageBg}
          >Cancel</button>
          <button
            onClick={() => onConfirm(val.trim())}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: C.accent, border: "none",
              color: "#fff", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: FONT,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#4F46E5"}
            onMouseLeave={e => e.currentTarget.style.background = C.accent}
          >Rename</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sessions panel ───────────────────────────────────────────────
function SessionsPanel({ projectId, activeChatId, onSelect, onNew, refreshTick, collapsed, onToggle }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [renaming, setRenaming] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  const load = useCallback(() => {
    if (!projectId) return
    let cancelled = false
    historyApi.listSessions(projectId)
      .then(r => { if (!cancelled) setSessions(r.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (refreshTick) load() }, [refreshTick])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Delete this conversation?")) return
    await historyApi.deleteSession(id).catch(() => {})
    setSessions(prev => prev.filter(s => s.id !== id))
    setMenuOpen(null)
    if (activeChatId === id) onNew()
  }

  const handleRenameConfirm = async (id, newTitle) => {
    if (!newTitle) { setRenaming(null); return }
    await historyApi.updateTitle(id, newTitle).catch(() => {})
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    setRenaming(null)
  }

  const W = collapsed ? 52 : 240

  return (
    <div style={{
      width: W, minWidth: W,
      background: C.pageBg,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      flexShrink: 0, overflow: "hidden", height: "100%",
      transition: "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)",
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? "14px 0" : "14px 14px 12px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0, gap: 6,
      }}>
        {!collapsed && (
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textDim,
            textTransform: "uppercase", letterSpacing: "0.07em" }}>Conversations</span>
        )}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {!collapsed && (
            <button
              onClick={onNew} title="New chat"
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
          )}
          <button
            onClick={onToggle}
            title={collapsed ? "Expand" : "Collapse"}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.textDim, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.textDim }}
          >
            {collapsed
              ? <ChevronsRight size={13} strokeWidth={2} />
              : <ChevronsLeft  size={13} strokeWidth={2} />
            }
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 4px" : "8px" }}>
        {collapsed ? (
          sessions.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              title={s.title || "Untitled"}
              style={{
                width: 36, height: 36, borderRadius: 8,
                margin: "2px auto", display: "flex",
                alignItems: "center", justifyContent: "center",
                cursor: "pointer", border: "none",
                background: activeChatId === s.id ? C.accentBg : "transparent",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => { if (activeChatId !== s.id) e.currentTarget.style.background = "#F3F4F6" }}
              onMouseLeave={e => { if (activeChatId !== s.id) e.currentTarget.style.background = "transparent" }}
            >
              <MessageSquare size={14} strokeWidth={1.8}
                style={{ color: activeChatId === s.id ? C.accent : C.textDim }} />
            </button>
          ))
        ) : loading ? (
          <p style={{ fontSize: 12, color: C.textDim, padding: "8px", margin: 0 }}>Loading…</p>
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: 12, color: C.textDim, padding: "8px", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
            No conversations yet.<br />
            <span style={{ opacity: 0.7 }}>Click + to start one.</span>
          </p>
        ) : sessions.map(s => (
          <div
            key={s.id}
            onClick={() => { setMenuOpen(null); onSelect(s) }}
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
            <MessageSquare
              size={13} strokeWidth={1.8}
              style={{ flexShrink: 0, marginTop: 2,
                color: activeChatId === s.id ? C.accent : C.textDim }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: activeChatId === s.id ? 600 : 400,
                color: activeChatId === s.id ? C.accent : C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                lineHeight: 1.4,
              }}>{s.title || "Untitled"}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>
                {s.message_count} msg{s.message_count !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Three-dot menu */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === s.id ? null : s.id) }}
                style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: "none", border: "none",
                  color: C.textDim, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#E5E7EB"; e.currentTarget.style.color = C.text }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textDim }}
              >
                <MoreHorizontal size={13} strokeWidth={2} />
              </button>

              {menuOpen === s.id && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute", right: 0, top: 24, width: 140, zIndex: 50,
                    background: "#FFFFFF",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                  }}
                >
                  {[
                    {
                      label: "Rename",
                      icon: MessageSquare,
                      action: () => { setRenaming({ id: s.id, title: s.title }); setMenuOpen(null) },
                    },
                    {
                      label: "Delete",
                      icon: Trash2,
                      danger: true,
                      action: (e) => handleDelete(e, s.id),
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      onClick={item.action}
                      style={{
                        padding: "9px 12px", fontSize: 12,
                        color: item.danger ? C.red : C.text,
                        cursor: "pointer", transition: "background 0.1s",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = item.danger ? "#FEF2F2" : "#F9FAFB"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <item.icon size={12} strokeWidth={1.8} />
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {renaming && (
        <RenameModal
          current={renaming.title}
          onConfirm={title => handleRenameConfirm(renaming.id, title)}
          onCancel={() => setRenaming(null)}
        />
      )}
    </div>
  )
}

// ─── genId ────────────────────────────────────────────────────────
const genId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// ─── Main ProjectChatView ─────────────────────────────────────────
export default function ProjectChatView() {
  const { projectId, chatId } = useParams()
  const navigate = useNavigate()

  const [dataset,       setDataset]       = useState(null)
  const [datasetReady,  setDatasetReady]  = useState(false)
  const [activeChatId,  setActiveChatId]  = useState(chatId ? Number(chatId) : null)
  const [dbSessionId,   setDbSessionId]   = useState(chatId ? Number(chatId) : null)
  const [refreshTick,   setRefreshTick]   = useState(0)
  const [panelCollapsed,setPanelCollapsed]= useState(false)
  const [chatState,     setChatState]     = useState(null)
  const [chatKey,       setChatKey]       = useState(genId)

  const dbSessionRef  = useRef(null)
  const savedCountRef = useRef(0)

  // ── Load dataset on mount ─────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    const init = async () => {
      try {
        const r  = await datasetsApi.list(projectId)
        const ds = r.data?.[0] || null
        if (cancelled) return
        setDataset(ds)

        let sessionId      = ds?.ai_session_id   || null
        let profileContext = ds?.profile_context || null

        if (ds?.id && (!profileContext || !sessionId)) {
          try {
            const rv = await datasetsApi.reviveSession(ds.id)
            if (!cancelled) {
              if (rv.data?.ai_session_id)   sessionId      = rv.data.ai_session_id
              if (rv.data?.profile_context) profileContext = rv.data.profile_context
            }
          } catch { /* non-fatal */ }
        } else if (ds?.id && sessionId) {
          datasetsApi.reviveSession(ds.id).catch(() => {})
        }

        if (!cancelled) {
          setChatState({
            id: genId(), title: null,
            messages: [], chatHistory: [],
            sessionId, profileContext,
            hasDataset: !!(sessionId || profileContext),
            chartData: null, timestamp: Date.now(),
          })
        }
      } catch {
        if (!cancelled) {
          setChatState({
            id: genId(), title: null,
            messages: [], chatHistory: [],
            sessionId: null, profileContext: null,
            hasDataset: false, chartData: null, timestamp: Date.now(),
          })
        }
      } finally {
        if (!cancelled) setDatasetReady(true)
      }
    }

    init()
    return () => { cancelled = true }
  }, [projectId])

  // ── Select saved session ──────────────────────────────────────
  const handleSelectSession = useCallback(async (session) => {
    try {
      const r = await historyApi.getMessages(session.id)
      const msgs = (r.data || []).map(m => ({ role: m.role, content: m.content }))
      setActiveChatId(session.id)
      setDbSessionId(session.id)
      dbSessionRef.current = session.id
      setChatState({
        id: genId(), title: session.title,
        messages: msgs,
        chatHistory: msgs.map(m => ({ role: m.role, content: m.content })),
        sessionId:      dataset?.ai_session_id   || null,
        profileContext: dataset?.profile_context || null,
        hasDataset:     !!(dataset?.ai_session_id || dataset?.profile_context),
        chartData: null, timestamp: Date.now(),
      })
      setChatKey(genId())
    } catch { /* ignore */ }
  }, [dataset])

  // ── New conversation ──────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setActiveChatId(null)
    setDbSessionId(null)
    dbSessionRef.current = null
    savedCountRef.current = 0
    setChatState({
      id: genId(), title: null,
      messages: [], chatHistory: [],
      sessionId:      dataset?.ai_session_id   || null,
      profileContext: dataset?.profile_context || null,
      hasDataset:     !!(dataset?.ai_session_id || dataset?.profile_context),
      chartData: null, timestamp: Date.now(),
    })
    setChatKey(genId())
  }, [dataset])

  // ── Receive updates from ChatBox — persist to DB ──────────────
  const handleStateChange = useCallback(async (updates) => {
    setChatState(prev => prev ? { ...prev, ...updates } : updates)
    const msgs = updates.messages
    if (!msgs?.length) return
    const last = msgs[msgs.length - 1]
    if (!last || last.role !== "assistant") return
    const plainMsgs = msgs.filter(m => !m.isPreview && !m.isAnalysis && m.content)
    if (plainMsgs.length <= savedCountRef.current) return
    const newMsgs = plainMsgs.slice(savedCountRef.current)
    if (!newMsgs.length) return

    let sid = dbSessionRef.current
    if (!sid) {
      try {
        const firstUser = newMsgs.find(m => m.role === "user")
        const title = firstUser?.content?.slice(0, 80) || "New conversation"
        const res = await historyApi.createSession({ project_id: Number(projectId), title })
        sid = res.data.id
        dbSessionRef.current = sid
        setDbSessionId(sid)
        setActiveChatId(sid)
        setRefreshTick(t => t + 1)
      } catch { return }
    }

    for (const m of newMsgs) {
      try { await historyApi.addMessage(sid, { role: m.role, content: m.content }) }
      catch { /* ignore */ }
    }
    savedCountRef.current = plainMsgs.length
  }, [projectId])

  // ── Loading state ─────────────────────────────────────────────
  if (!datasetReady) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: C.textSub, fontSize: 13, fontFamily: FONT,
        background: C.chatBg,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, margin: "0 auto 12px",
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Database size={16} strokeWidth={2} style={{ color: "#fff" }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>Loading project…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden",
      background: C.chatBg, fontFamily: FONT }}>

      {/* ── Sessions panel ──────────────────────────────────── */}
      <SessionsPanel
        projectId={Number(projectId)}
        activeChatId={activeChatId}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        refreshTick={refreshTick}
        collapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed(c => !c)}
      />

      {/* ── Chat area ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", minWidth: 0,
        display: "flex", flexDirection: "column" }}>

        {/* Dataset status banner — light theme */}
        {dataset ? (
          <div style={{
            padding: "0 20px", height: 40, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 10,
            background: C.greenBg,
            borderBottom: `1px solid ${C.greenBd}`,
          }}>
            <CheckCircle size={14} strokeWidth={2} style={{ color: C.green, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#059669",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
              {dataset.file_name}
            </span>
            <span style={{ fontSize: 11, color: "#6EE7B7", whiteSpace: "nowrap", flexShrink: 0 }}>
              {dataset.row_count?.toLocaleString()} rows
            </span>
            <div style={{ width: 1, height: 14, background: C.greenBd, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: C.textSub,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Dataset loaded — ask anything without re-uploading
            </span>
          </div>
        ) : (
          <div style={{
            padding: "0 20px", height: 40, flexShrink: 0,
            display: "flex", alignItems: "center", gap: 10,
            background: C.amberBg,
            borderBottom: `1px solid ${C.amberBd}`,
          }}>
            <AlertTriangle size={14} strokeWidth={2} style={{ color: C.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#92400E" }}>
              No dataset uploaded — go to the Project page to upload one first
            </span>
          </div>
        )}

        {/* ChatBox */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {chatState && (
            <ChatBox
              key={chatKey}
              initialState={chatState}
              onStateChange={handleStateChange}
              onOpenVisual={null}
            />
          )}
        </div>
      </div>
    </div>
  )
}