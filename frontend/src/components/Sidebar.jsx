// src/components/Sidebar.jsx
// Chat history with reliable persistence:
// - messages + metadata saved to localStorage per chat
// - chartData stored in sessionStorage (too large for main store)
// - selecting a chat fully restores all messages, no re-running queries

import React, { useState, useEffect, useRef } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconNewChat  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;
const IconChart    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
const IconChat     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconFile     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconPencil   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IconCollapse = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>;
const IconExpand   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const IconProjects = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="9" y="12" width="6" height="6" rx="1"/><rect x="16" y="12" width="6" height="6" rx="1"/></svg>;
const IconDash     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/></svg>;

// ── Storage helpers ───────────────────────────────────────────────────────────
// Split storage: index (small metadata) in localStorage, full messages per chat in individual keys
const IDX_KEY     = "aic_index_v2";       // list of { id, title, timestamp, hasDataset, sessionId }
const MSG_PREFIX  = "aic_msg_";           // aic_msg_{chatId} → { messages, chatHistory, profileContext }
const CD_PREFIX   = "aic_cd_";            // aic_cd_{chatId}  → chartData (may be large, sessionStorage)

const loadIndex = () => {
  try { return JSON.parse(localStorage.getItem(IDX_KEY)) || []; }
  catch { return []; }
};

const saveIndex = (index) => {
  try { localStorage.setItem(IDX_KEY, JSON.stringify(index)); }
  catch (e) { console.warn("Sidebar: index save failed", e); }
};

const loadMessages = (chatId) => {
  try { return JSON.parse(localStorage.getItem(MSG_PREFIX + chatId)) || { messages: [], chatHistory: [], profileContext: null }; }
  catch { return { messages: [], chatHistory: [], profileContext: null }; }
};

const saveMessages = (chatId, data) => {
  try { localStorage.setItem(MSG_PREFIX + chatId, JSON.stringify(data)); }
  catch (e) {
    // Quota exceeded — clear old messages except last 5 chats
    try {
      const idx = loadIndex();
      const keep = new Set(idx.slice(0, 5).map(c => c.id));
      Object.keys(localStorage)
        .filter(k => k.startsWith(MSG_PREFIX) && !keep.has(k.slice(MSG_PREFIX.length)))
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(MSG_PREFIX + chatId, JSON.stringify(data));
    } catch {}
  }
};

const loadChartData = (chatId) => {
  try { return JSON.parse(sessionStorage.getItem(CD_PREFIX + chatId)) || null; }
  catch { return null; }
};

const saveChartData = (chatId, data) => {
  try { if (data) sessionStorage.setItem(CD_PREFIX + chatId, JSON.stringify(data)); }
  catch { /* chartData too large — skip, charts just won't be pre-populated */ }
};

const deleteChat = (chatId) => {
  try {
    localStorage.removeItem(MSG_PREFIX + chatId);
    sessionStorage.removeItem(CD_PREFIX + chatId);
  } catch {}
};

const timeAgo = (ts) => {
  const d = Date.now() - ts, m = Math.floor(d/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dy < 7) return `${dy}d ago`;
  return new Date(ts).toLocaleDateString();
};
const truncate = (str, n) => str && str.length > n ? str.slice(0, n).trimEnd() + "…" : str || "New chat";

// ── Rename Modal ──────────────────────────────────────────────────────────────
function RenameModal({ currentTitle, onConfirm, onCancel }) {
  const [val, setVal] = useState(currentTitle);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 30);
    return () => clearTimeout(t);
  }, []);

  const submit = () => { const t = val.trim(); if (t) onConfirm(t); else onCancel(); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }} onClick={onCancel}>
      <div style={{ background:"#1c1f2e", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"28px 28px 22px", width:360, boxShadow:"0 24px 64px rgba(0,0,0,0.7)", display:"flex", flexDirection:"column", gap:16, animation:"sbRenIn 0.15s ease" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:15, fontWeight:800, color:"rgba(255,255,255,0.9)" }}>Rename Chat</div>
        <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter")submit(); if(e.key==="Escape")onCancel(); }}
          placeholder="Chat title…"
          style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:9, color:"rgba(255,255,255,0.92)", fontSize:14, padding:"12px 14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={{ padding:"9px 18px", borderRadius:8, cursor:"pointer", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:13 }}>Cancel</button>
          <button onClick={submit} style={{ padding:"9px 22px", borderRadius:8, cursor:"pointer", background:"linear-gradient(135deg,#e05c2d44,#e05c2d22)", border:"1px solid #e05c2d88", color:"#e05c2d", fontSize:13, fontWeight:700 }}>Rename</button>
        </div>
      </div>
      <style>{`@keyframes sbRenIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

// ── ChatItem — outside parent so it never remounts on parent re-render ────────
const ChatItem = ({ chat, isActive, isOpen, onSelect, onStartRename, onDelete }) => {
  const title = chat.title || truncate(null, 38);
  return (
    <div className={`sb-chat-item ${isActive ? "active" : ""}`} onClick={() => onSelect(chat)} title={!isOpen ? title : undefined}>
      {isActive && <div className="sb-active-line" />}
      {!isOpen && <div className="sb-item-icon-only"><IconChat /></div>}
      {isOpen && (
        <>
          <div className="sb-item-body">
            <span className="sb-item-title">{title}</span>
            <div className="sb-item-meta">
              {chat.hasDataset && <span className="sb-file-dot"><IconFile /></span>}
              <span className="sb-item-time">{timeAgo(chat.timestamp)}</span>
            </div>
          </div>
          <div className="sb-item-actions">
            <button className="sb-action-btn" onClick={e=>{e.stopPropagation();onStartRename(chat);}} title="Rename"><IconPencil /></button>
            <button className="sb-action-btn sb-action-delete" onClick={e=>{e.stopPropagation();onDelete(chat.id);}} title="Delete"><IconTrash /></button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = ({
  isOpen, onToggle,
  currentView, onViewChange, onNavigate,
  activeChatId, onSelectChat, onNewChat,
  datasetLoaded, currentChatSnapshot,
}) => {
  const [index,    setIndex]    = useState(loadIndex);
  const [renaming, setRenaming] = useState(null);

  // ── Persist index on every change ──────────────────────────────────────────
  useEffect(() => { saveIndex(index); }, [index]);

  // ── Receive live snapshot from App — save messages + update index ───────────
  useEffect(() => {
    const snap = currentChatSnapshot;
    if (!snap?.id) return;

    // 1. Save full messages to their own localStorage key
    saveMessages(snap.id, {
      messages:       snap.messages       || [],
      chatHistory:    snap.chatHistory    || [],
      profileContext: snap.profileContext || null,
      sessionId:      snap.sessionId      || null,
    });

    // 2. Save chartData separately (can be large)
    if (snap.chartData) saveChartData(snap.id, snap.chartData);

    // 3. Update the small metadata index (no messages, no chartData here)
    setIndex(prev => {
      const meta = {
        id:         snap.id,
        title:      snap.title || truncate(snap.messages?.[0]?.content, 40),
        timestamp:  snap.timestamp || Date.now(),
        hasDataset: snap.hasDataset || false,
        sessionId:  snap.sessionId  || null,
      };
      const exists = prev.find(c => c.id === snap.id);
      if (exists) return prev.map(c => c.id === snap.id ? { ...c, ...meta } : c);
      return [meta, ...prev];
    });
  }, [currentChatSnapshot]);

  // ── Select a saved chat — load full messages from localStorage ──────────────
  const handleSelect = (chatMeta) => {
    const { messages, chatHistory, profileContext, sessionId } = loadMessages(chatMeta.id);
    const chartData = loadChartData(chatMeta.id);
    onSelectChat({
      id:             chatMeta.id,
      title:          chatMeta.title,
      timestamp:      chatMeta.timestamp,
      hasDataset:     chatMeta.hasDataset,
      sessionId:      sessionId || chatMeta.sessionId || null,
      messages,
      chatHistory,
      profileContext,
      chartData,
    });
  };

  const handleStartRename = (chat) => {
    setRenaming({ id: chat.id, currentTitle: chat.title || "Chat" });
  };

  const handleRenameConfirm = (newTitle) => {
    setIndex(prev => prev.map(c => c.id === renaming.id ? { ...c, title: newTitle } : c));
    setRenaming(null);
  };

  const handleDelete = (id) => {
    setIndex(prev => prev.filter(c => c.id !== id));
    deleteChat(id);
    if (activeChatId === id) onNewChat();
  };

  const now   = Date.now();
  const today = index.filter(c => now - c.timestamp < 86400000);
  const week  = index.filter(c => now - c.timestamp >= 86400000 && now - c.timestamp < 604800000);
  const older = index.filter(c => now - c.timestamp >= 604800000);

  const ChatGroup = ({ label, items }) => {
    if (!items.length) return null;
    return (
      <div className="sb-group">
        {isOpen && <div className="sb-group-label">{label}</div>}
        {items.map(chat => (
          <ChatItem key={chat.id} chat={chat}
            isActive={chat.id === activeChatId}
            isOpen={isOpen}
            onSelect={handleSelect}
            onStartRename={handleStartRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--closed"}`}>
        <div className="sb-topbar">
          {isOpen && <span className="sb-brand">Analyzer</span>}
          <button className="sb-toggle-btn" onClick={onToggle} title={isOpen ? "Collapse" : "Expand"}>
            {isOpen ? <IconCollapse /> : <IconExpand />}
          </button>
        </div>

        <button className={`sb-new-chat-btn ${isOpen ? "sb-new-chat-btn--full" : "sb-new-chat-btn--icon"}`}
          onClick={onNewChat} title="New Chat">
          <IconNewChat />
          {isOpen && <span>New Chat</span>}
        </button>

        <div className="sb-nav">
          <button className={`sb-nav-btn ${currentView === "chat" ? "active" : ""}`}
            onClick={() => onViewChange("chat")} title="Chat">
            <IconChat />{isOpen && <span>Chat</span>}
          </button>
          <button
            className={`sb-nav-btn ${currentView === "visual" ? "active" : ""} ${!datasetLoaded ? "disabled" : ""}`}
            onClick={() => datasetLoaded && onViewChange("visual")}
            title={datasetLoaded ? "Visualize" : "Upload a dataset to enable visuals"}>
            <IconChart />{isOpen && <span>Visualize</span>}
            {isOpen && !datasetLoaded && <span className="sb-nav-lock">·</span>}
          </button>
          {onNavigate && (
            <>
              <button className={`sb-nav-btn ${currentView === "projects" ? "active" : ""}`}
                onClick={() => onNavigate({ view: "projects" })} title="Projects">
                <IconProjects />{isOpen && <span>Projects</span>}
              </button>
              <button
                className={`sb-nav-btn ${currentView === "dashboard-gen" ? "active" : ""} ${!datasetLoaded ? "disabled" : ""}`}
                onClick={() => datasetLoaded && onNavigate({ view: "dashboard-gen" })}
                title={datasetLoaded ? "Dashboard Builder" : "Upload a dataset first"}>
                <IconDash />{isOpen && <span>Dashboards</span>}
                {isOpen && !datasetLoaded && <span className="sb-nav-lock">·</span>}
              </button>
            </>
          )}
        </div>

        <div className="sb-divider" />

        <div className="sb-history">
          {isOpen && <div className="sb-section-label">History</div>}
          <ChatGroup label="Today"     items={today} />
          <ChatGroup label="This week" items={week}  />
          <ChatGroup label="Older"     items={older} />
          {index.length === 0 && isOpen && (
            <div className="sb-empty">No chat history yet</div>
          )}
        </div>
      </aside>

      {renaming && (
        <RenameModal
          currentTitle={renaming.currentTitle}
          onConfirm={handleRenameConfirm}
          onCancel={() => setRenaming(null)}
        />
      )}
    </>
  );
};

export default Sidebar;