// src/views/ProjectChatView.jsx
// Route: /projects/:projectId/chat  and  /projects/:projectId/chat/:chatId
//
// Left panel  → project chat sessions list (rename + delete)
// Right panel → full original ChatBox (PreviewPanel, AnalysisPanel, MessageBubble,
//               VizSuggestionsCard, markdown, typewriter — ALL original features)
//
// On mount: loads the project's dataset ai_session_id + profile_context so the
// AI already knows the dataset — no separate upload needed.
// Each conversation is saved to the DB (project → chat_sessions → chat_messages).

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import { historyApi, datasetsApi } from "../api/client";

const T = {
  bg:     "#111318",
  panel:  "#13151c",
  card:   "#16181f",
  border: "rgba(255,255,255,0.07)",
  text:   "rgba(255,255,255,0.88)",
  muted:  "rgba(255,255,255,0.38)",
  dim:    "rgba(255,255,255,0.18)",
  accent: "#e05c2d",
};

// ── Rename modal ───────────────────────────────────────────────────
function RenameModal({ current, onConfirm, onCancel }) {
  const [val, setVal] = useState(current || "");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}
      onClick={onCancel}>
      <div style={{ background:"#1a1d28", border:`1px solid ${T.border}`,
        borderRadius:12, padding:24, width:360,
        boxShadow:"0 16px 48px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>
          Rename conversation
        </div>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") onConfirm(val.trim()); if (e.key === "Escape") onCancel(); }}
          style={{ width:"100%", background:"rgba(255,255,255,0.06)",
            border:`1px solid ${T.border}`, borderRadius:8,
            color:T.text, fontSize:13, padding:"9px 12px", outline:"none",
            fontFamily:"inherit", marginBottom:14 }}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel}
            style={{ padding:"7px 16px", borderRadius:8, background:"rgba(255,255,255,0.05)",
              border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer", fontSize:12 }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(val.trim())}
            style={{ padding:"7px 16px", borderRadius:8,
              background:`${T.accent}cc`, border:"none",
              color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sessions panel ─────────────────────────────────────────────────
function SessionsPanel({ projectId, activeChatId, onSelect, onNew, refreshTick, collapsed, onToggle }) {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [renaming,  setRenaming]  = useState(null);   // { id, title }
  const [menuOpen,  setMenuOpen]  = useState(null);   // session id with menu open

  const load = useCallback(() => {
    if (!projectId) return;
    historyApi.listSessions(projectId)
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(load, [load]);
  useEffect(() => { if (refreshTick) load(); }, [refreshTick]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    await historyApi.deleteSession(id).catch(() => {});
    setSessions(prev => prev.filter(s => s.id !== id));
    setMenuOpen(null);
    if (activeChatId === id) onNew();
  };

  const handleRenameConfirm = async (id, newTitle) => {
    if (!newTitle) { setRenaming(null); return; }
    await historyApi.updateTitle(id, newTitle).catch(() => {});
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    setRenaming(null);
  };

  const W = collapsed ? 52 : 240;

  return (
    <div style={{ width:W, minWidth:W, background:T.panel, borderRight:`1px solid ${T.border}`,
      display:"flex", flexDirection:"column", flexShrink:0, overflow:"hidden", height:"100%",
      transition:"width 0.2s ease, min-width 0.2s ease" }}>

      {/* Header */}
      <div style={{ padding: collapsed ? "14px 0" : "14px 14px 10px",
        borderBottom:`1px solid ${T.border}`,
        display:"flex", alignItems:"center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink:0, gap:6 }}>
        {!collapsed && (
          <span style={{ fontSize:10, fontWeight:700, color:T.muted,
            textTransform:"uppercase", letterSpacing:"0.8px" }}>Conversations</span>
        )}
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          {!collapsed && (
            <button onClick={onNew} title="New chat"
              style={{ width:24, height:24, borderRadius:6,
                background:`${T.accent}22`, border:`1px solid ${T.accent}44`,
                color:T.accent, cursor:"pointer", fontSize:16,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}40`}
              onMouseLeave={e=>e.currentTarget.style.background=`${T.accent}22`}>+</button>
          )}
          <button onClick={onToggle} title={collapsed ? "Expand" : "Collapse"}
            style={{ width:24, height:24, borderRadius:6, background:"rgba(255,255,255,0.05)",
              border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer",
              fontSize:10, display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color=T.text}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color=T.muted}}>
            {collapsed ? "▶" : "◀"}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:"auto", padding: collapsed ? "8px 4px" : "8px" }}>
        {collapsed ? (
          // Collapsed: just show chat dots
          sessions.map(s => (
            <div key={s.id} onClick={() => onSelect(s)} title={s.title || "Untitled"}
              style={{ width:36, height:36, borderRadius:8, margin:"2px auto",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", fontSize:14,
                background: activeChatId===s.id ? `${T.accent}22` : "transparent",
                border: activeChatId===s.id ? `1px solid ${T.accent}44` : "1px solid transparent",
                transition:"all 0.1s" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background=activeChatId===s.id?`${T.accent}22`:"transparent"}>
              💬
            </div>
          ))
        ) : loading ? (
          <div style={{ fontSize:11, color:T.dim, padding:8 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ fontSize:11, color:T.dim, padding:"16px 8px", lineHeight:1.6, textAlign:"center" }}>
            No conversations yet.<br/>
            <span style={{ opacity:0.6 }}>Click + to start one.</span>
          </div>
        ) : sessions.map(s => (
          <div key={s.id}
            onClick={() => { setMenuOpen(null); onSelect(s); }}
            style={{ padding:"9px 10px", borderRadius:8, cursor:"pointer",
              background: activeChatId === s.id ? `${T.accent}15` : "transparent",
              borderLeft: activeChatId === s.id ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom:2, display:"flex", alignItems:"flex-start",
              gap:8, transition:"background 0.1s", position:"relative" }}
            onMouseEnter={e => { if (activeChatId !== s.id) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => { if (activeChatId !== s.id) e.currentTarget.style.background="transparent"; }}>

            <span style={{ fontSize:13, marginTop:1, flexShrink:0, opacity: activeChatId===s.id ? 0.9 : 0.5 }}>💬</span>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight: activeChatId===s.id ? 600 : 400,
                color: activeChatId===s.id ? T.text : "rgba(255,255,255,0.62)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                lineHeight:1.4 }}>
                {s.title || "Untitled"}
              </div>
              <div style={{ fontSize:10, color:T.dim, marginTop:2 }}>
                {s.message_count} msg{s.message_count !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Three-dot menu */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen===s.id ? null : s.id); }}
                style={{ width:18, height:18, borderRadius:4, background:"none", border:"none",
                  color:T.dim, cursor:"pointer", fontSize:13, display:"flex",
                  alignItems:"center", justifyContent:"center", lineHeight:1 }}>⋯</button>

              {menuOpen === s.id && (
                <div onClick={e => e.stopPropagation()}
                  style={{ position:"absolute", right:0, top:22, width:130, zIndex:50,
                    background:"#1a1d28", border:`1px solid ${T.border}`,
                    borderRadius:9, overflow:"hidden",
                    boxShadow:"0 8px 24px rgba(0,0,0,0.5)" }}>
                  {[
                    { label:"✎ Rename", action:() => { setRenaming({id:s.id, title:s.title}); setMenuOpen(null); } },
                    { label:"× Delete", action:(e) => handleDelete(e, s.id), danger:true },
                  ].map(item => (
                    <div key={item.label}
                      onClick={item.action}
                      style={{ padding:"9px 13px", fontSize:11,
                        color: item.danger ? "#f97272" : T.text,
                        cursor:"pointer", transition:"background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
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
          onCancel={() => setRenaming(null)}/>
      )}
    </div>
  );
}

// ── generateId ─────────────────────────────────────────────────────
const genId = () => `chat_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

// ── Main ProjectChatView ───────────────────────────────────────────
export default function ProjectChatView() {
  const { projectId, chatId } = useParams();
  const navigate = useNavigate();

  // Dataset AI context — loaded once per project
  const [dataset,      setDataset]      = useState(null);
  const [datasetReady, setDatasetReady] = useState(false);

  // Active chat session
  const [activeChatId,  setActiveChatId]  = useState(chatId ? Number(chatId) : null);
  const [dbSessionId,   setDbSessionId]   = useState(chatId ? Number(chatId) : null);
  const [refreshTick,   setRefreshTick]   = useState(0);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // State passed into / received from ChatBox
  const [chatState,    setChatState]    = useState(null);   // null = loading dataset
  const [chatKey,      setChatKey]      = useState(genId()); // remounts ChatBox on new chat

  // Track whether we've already created a DB session for the current conversation
  const dbSessionRef = useRef(null);

  // ── Load dataset + revive AI session on mount ───────────────────
  useEffect(() => {
    if (!projectId) return;
    const init = async () => {
      try {
        const r  = await datasetsApi.list(projectId);
        const ds = r.data?.[0] || null;
        setDataset(ds);

        let sessionId      = ds?.ai_session_id   || null;
        let profileContext = ds?.profile_context || null;

        // Revive in-memory session.
        // Skip if profile_context already loaded AND ai_session_id exists —
        // only revive when session could be dead (server restart) or context missing.
        if (ds?.id && (!profileContext || !sessionId)) {
          try {
            const rv = await datasetsApi.reviveSession(ds.id);
            if (rv.data?.ai_session_id)    sessionId      = rv.data.ai_session_id;
            if (rv.data?.profile_context)  profileContext = rv.data.profile_context;
          } catch { /* non-fatal */ }
        } else if (ds?.id && sessionId) {
          // Session id exists in DB but in-memory cache may be dead after server restart
          // Call revive silently just to restore the session without recomputing
          datasetsApi.reviveSession(ds.id).catch(() => {});
        }

        setChatState({
          id:             genId(),
          title:          null,
          messages:       [],
          chatHistory:    [],
          sessionId,        // ← revived in-memory session id (has full DataFrame)
          profileContext,   // ← text fallback — always passed so AI knows the data
          hasDataset:     !!(sessionId || profileContext),
          chartData:      null,
          timestamp:      Date.now(),
        });
      } catch {
        setChatState({ id:genId(), title:null, messages:[], chatHistory:[],
          sessionId:null, profileContext:null, hasDataset:false, chartData:null, timestamp:Date.now() });
      } finally {
        setDatasetReady(true);
      }
    };
    init();
  }, [projectId]);

  // ── Load saved chat when user selects one from the panel ─────────
  const handleSelectSession = useCallback(async (session) => {
    try {
      const r = await historyApi.getMessages(session.id);
      const msgs = (r.data || []).map(m => ({
        role: m.role,
        content: m.content,
        // DB messages don't have preview/analysis cards — they're plain text
      }));
      setActiveChatId(session.id);
      setDbSessionId(session.id);
      dbSessionRef.current = session.id;
      setChatState({
        id:             genId(),
        title:          session.title,
        messages:       msgs,
        chatHistory:    msgs.map(m => ({ role: m.role, content: m.content })),
        sessionId:      dataset?.ai_session_id   || null,
        profileContext: dataset?.profile_context || null,
        hasDataset:     !!(dataset?.ai_session_id || dataset?.profile_context),
        chartData:      null,
        timestamp:      Date.now(),
      });
      setChatKey(genId());
    } catch { /* ignore */ }
  }, [dataset]);

  // ── New conversation ─────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setDbSessionId(null);
    dbSessionRef.current = null;
    savedCountRef.current = 0;
    setChatState({
      id:             genId(),
      title:          null,
      messages:       [],
      chatHistory:    [],
      // Always pass both — sessionId for full DF access, profileContext as fallback
      sessionId:      dataset?.ai_session_id   || null,
      profileContext: dataset?.profile_context || null,
      hasDataset:     !!(dataset?.ai_session_id || dataset?.profile_context),
      chartData:      null,
      timestamp:      Date.now(),
    });
    setChatKey(genId());
  }, [dataset]);

  // Track how many messages we've already saved so we don't double-save
  const savedCountRef = useRef(0);

  // ── Receive state updates from ChatBox — save to DB ───────────────
  // Only save when a complete exchange lands (last msg is assistant, count grew)
  const handleStateChange = useCallback(async (updates) => {
    setChatState(prev => prev ? { ...prev, ...updates } : updates);

    const msgs = updates.messages;
    if (!msgs?.length) return;

    // Only act when the last message is from the assistant (exchange complete)
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "assistant") return;

    // Only act when new messages appeared since last save
    const plainMsgs = msgs.filter(m => !m.isPreview && !m.isAnalysis && m.content);
    if (plainMsgs.length <= savedCountRef.current) return;

    const newMsgs = plainMsgs.slice(savedCountRef.current);
    if (!newMsgs.length) return;

    // Ensure we have a DB session
    let sid = dbSessionRef.current;
    if (!sid) {
      try {
        const firstUser = newMsgs.find(m => m.role === "user");
        const title = firstUser?.content?.slice(0, 80) || "New conversation";
        const res = await historyApi.createSession({
          project_id: Number(projectId),
          title,
        });
        sid = res.data.id;
        dbSessionRef.current = sid;
        setDbSessionId(sid);
        setActiveChatId(sid);
        setRefreshTick(t => t + 1);
      } catch { return; }
    }

    // Save new messages
    for (const m of newMsgs) {
      try {
        await historyApi.addMessage(sid, { role: m.role, content: m.content });
      } catch { /* ignore */ }
    }
    savedCountRef.current = plainMsgs.length;
  }, [projectId]);

  // ── Render ────────────────────────────────────────────────────────
  if (!datasetReady) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
        height:"100%", color:T.muted, fontSize:13 }}>
        Loading project…
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:T.bg }}>

      {/* ── Sessions panel ──────────────────────────────────────── */}
      <SessionsPanel
        projectId={Number(projectId)}
        activeChatId={activeChatId}
        onSelect={handleSelectSession}
        onNew={handleNewChat}
        refreshTick={refreshTick}
        collapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed(c => !c)}/>

      {/* ── Chat area ────────────────────────────────────────────── */}
      <div style={{ flex:1, overflow:"hidden", minWidth:0, display:"flex", flexDirection:"column" }}>

        {/* Dataset status banner */}
        {dataset ? (
          <div style={{
            padding:"0 20px", height:38, flexShrink:0,
            display:"flex", alignItems:"center", gap:10,
            background:"rgba(16,185,129,0.07)",
            borderBottom:"1px solid rgba(16,185,129,0.12)",
          }}>
            {/* Pulsing dot */}
            <span style={{ position:"relative", display:"inline-flex" }}>
              <span style={{ width:8, height:8, borderRadius:"50%",
                background:"#10b981", display:"inline-block",
                boxShadow:"0 0 6px #10b98188" }}/>
            </span>
            {/* File name — prominent */}
            <span style={{ fontSize:12, fontWeight:700, color:"#6ee7b7",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              maxWidth:320 }}>
              {dataset.file_name}
            </span>
            <span style={{ fontSize:11, color:"rgba(110,231,183,0.55)",
              whiteSpace:"nowrap", flexShrink:0 }}>
              {dataset.row_count?.toLocaleString()} rows
            </span>
            <span style={{ width:1, height:14, background:"rgba(255,255,255,0.1)", flexShrink:0 }}/>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)",
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              Dataset loaded — ask anything without uploading again
            </span>
          </div>
        ) : (
          <div style={{
            padding:"0 20px", height:36, flexShrink:0,
            display:"flex", alignItems:"center", gap:8,
            background:"rgba(245,158,11,0.07)",
            borderBottom:"1px solid rgba(245,158,11,0.14)",
          }}>
            <span style={{ fontSize:13 }}>⚠️</span>
            <span style={{ fontSize:11, color:"rgba(251,191,36,0.8)" }}>
              No dataset uploaded — go to the Project page to upload one first
            </span>
          </div>
        )}

        {/* ChatBox */}
        <div style={{ flex:1, overflow:"hidden" }}>
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
  );
}