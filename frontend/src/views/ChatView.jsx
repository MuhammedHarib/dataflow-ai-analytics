// src/views/ChatView.jsx
// Route: /
// Original UI preserved exactly. AI call fixed to use real multipart sendMessage.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { sendMessage as aiSend } from "../api/chat";
import { historyApi, datasetsApi, fileApi } from "../api/client";

const T = {
  bg: "#111318", panel: "#13151c", card: "#16181f",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.88)", muted: "rgba(255,255,255,0.38)",
  dim: "rgba(255,255,255,0.18)", accent: "#e05c2d",
};

// ── Chat session list panel ────────────────────────────────────────
function SessionsList({ projectId, activeChatId, onSelect, onNew }) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!projectId) return;
    historyApi.listSessions(projectId)
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    await historyApi.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeChatId === id) onNew();
  };

  return (
    <div style={{ width: 220, background: T.panel, borderRight: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

      <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.muted,
          textTransform: "uppercase", letterSpacing: "0.6px" }}>Chats</span>
        <button onClick={onNew} style={{ width: 24, height: 24, borderRadius: 6,
          background: `${T.accent}22`, border: `1px solid ${T.accent}44`,
          color: T.accent, cursor: "pointer", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {loading ? (
          <div style={{ fontSize: 11, color: T.dim, padding: 8 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ fontSize: 11, color: T.dim, padding: 8, lineHeight: 1.5 }}>
            No conversations yet.<br/>Start a new chat.
          </div>
        ) : sessions.map(s => (
          <div key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              padding: "9px 10px", borderRadius: 8, cursor: "pointer",
              background: activeChatId === s.id ? `${T.accent}18` : "transparent",
              borderLeft: activeChatId === s.id ? `2px solid ${T.accent}` : "2px solid transparent",
              marginBottom: 2, display: "flex", alignItems: "flex-start",
              gap: 6, transition: "background 0.1s", position: "relative",
            }}
            onMouseEnter={e => {
              if (activeChatId !== s.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.querySelector(".del-btn").style.opacity = "1";
            }}
            onMouseLeave={e => {
              if (activeChatId !== s.id) e.currentTarget.style.background = "transparent";
              e.currentTarget.querySelector(".del-btn").style.opacity = "0";
            }}>
            <span style={{ fontSize: 12, marginTop: 1, flexShrink: 0, opacity: 0.6 }}>💬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: activeChatId === s.id ? T.text : T.muted,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontWeight: activeChatId === s.id ? 600 : 400 }}>
                {s.title || "Untitled"}
              </div>
              <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>
                {s.message_count} messages
              </div>
            </div>
            <button className="del-btn" onClick={e => handleDelete(e, s.id)}
              style={{ opacity: 0, width: 16, height: 16, borderRadius: 4,
                background: "none", border: "none", color: "#f97272",
                cursor: "pointer", fontSize: 12, padding: 0, flexShrink: 0,
                transition: "opacity 0.1s" }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14 }}>
      <div style={{
        maxWidth: "72%", padding: "11px 15px",
        borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
        background: isUser ? `${T.accent}22` : T.card,
        border: `1px solid ${isUser ? T.accent + "44" : T.border}`,
        fontSize: 13, color: T.text, lineHeight: 1.6, wordBreak: "break-word",
      }}>
        {msg.content}
        <div style={{ fontSize: 9, color: T.dim, marginTop: 5, textAlign: "right" }}>
          {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ── Main ChatView ──────────────────────────────────────────────────
export default function ChatView({ projectId, chatId, newChat, onNavigate }) {
  const [activeChatId,   setActiveChatId]   = useState(chatId || null);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [sending,        setSending]        = useState(false);
  const [sessionDbId,    setSessionDbId]    = useState(null);
  const [datasets,       setDatasets]       = useState([]);
  const [selectedDs,     setSelectedDs]     = useState(null);

  // Real AI session state (mirrors original ChatBox)
  const [aiSessionId,    setAiSessionId]    = useState(null);   // server-side UUID from file upload
  const [profileContext, setProfileContext] = useState(null);   // LLM context string
  const [chatHistory,    setChatHistory]    = useState([]);     // [{role,content}]
  const [selectedFile,   setSelectedFile]   = useState(null);   // pending file to send

  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  // Load datasets for this project
  useEffect(() => {
    if (!projectId) return;
    datasetsApi.list(projectId)
      .then(r => setDatasets(r.data))
      .catch(() => {});
  }, [projectId]);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId) { setMessages([]); setSessionDbId(null); return; }
    historyApi.getMessages(activeChatId)
      .then(r => { setMessages(r.data); setSessionDbId(activeChatId); })
      .catch(() => {});
  }, [activeChatId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setSessionDbId(null);
    setAiSessionId(null);
    setProfileContext(null);
    setChatHistory([]);
    setSelectedFile(null);
  }, []);

  const ensureDbSession = useCallback(async () => {
    if (sessionDbId) return sessionDbId;
    if (!projectId) return null;   // standalone workspace — no DB persistence
    const res = await historyApi.createSession({
      project_id: projectId,
      dataset_id: selectedDs || null,
      title: "New conversation",
    });
    const id = res.data.id;
    setActiveChatId(id);
    setSessionDbId(id);
    return id;
  }, [sessionDbId, projectId, selectedDs]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = "";
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() && !selectedFile) return;
    if (sending) return;

    const text     = input.trim();
    const fileSnap = selectedFile;
    setInput("");
    setSelectedFile(null);
    setSending(true);

    const tempUser = {
      id: "tmp_u", role: "user",
      content: text || (fileSnap ? `📎 ${fileSnap.name}` : ""),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUser]);

    try {
      // ── Real AI call: multipart FormData via original sendMessage ──
      const res = await aiSend(
        text,
        fileSnap    || null,
        aiSessionId || null,       // server-side UUID (from previous file upload)
        profileContext || null,
        chatHistory,
      );

      // Persist new session ID from file upload
      if (fileSnap && res.session_id) {
        setAiSessionId(res.session_id);
        setProfileContext(res.profile_context || null);
        setChatHistory([]);
      }

      const answer = res.answer || res.message || (res.errors?.[0]?.message) || "…";

      // Update AI chat history for follow-up context
      if (!fileSnap) {
        setChatHistory(prev => [
          ...prev,
          { role: "user",      content: text   },
          { role: "assistant", content: answer },
        ]);
      }

      const aiBubble = { id: "tmp_a", role: "assistant", content: answer,
        created_at: new Date().toISOString() };

      setMessages(prev => [
        ...prev.filter(m => m.id !== "tmp_u"),
        { ...tempUser, id: Date.now() },
        aiBubble,
      ]);

      // Persist to DB if inside a project
      const sid = await ensureDbSession();
      if (sid) {
        await historyApi.addMessage(sid, { role: "user",      content: tempUser.content });
        await historyApi.addMessage(sid, { role: "assistant", content: answer });
      }

    } catch (err) {
      setMessages(prev => [
        ...prev.filter(m => m.id !== "tmp_u"),
        { ...tempUser, id: Date.now() },
        { id: "err", role: "assistant",
          content: "⚠️ Something went wrong. Please try again.",
          created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, selectedFile, sending, aiSessionId, profileContext, chatHistory, ensureDbSession]);

  return (
    <div style={{ display: "flex", height: "100%", background: T.bg }}>

      {/* Sessions sidebar */}
      <SessionsList
        projectId={projectId}
        activeChatId={activeChatId}
        onSelect={id => setActiveChatId(id)}
        onNew={startNewChat}/>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0 }}>

        {/* Chat header */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          background: T.card }}>

          {/* Dataset selector */}
          <select value={selectedDs || ""} onChange={e => setSelectedDs(e.target.value || null)}
            style={{ background: "rgba(255,255,255,0.06)",
              border: `1px solid ${T.border}`, borderRadius: 7,
              color: selectedDs ? T.text : T.muted, fontSize: 11,
              padding: "6px 10px", outline: "none", cursor: "pointer" }}>
            <option value="">No dataset selected</option>
            {datasets.map(d => (
              <option key={d.id} value={d.session_id || String(d.id)}>{d.file_name}</option>
            ))}
          </select>

          <div style={{ flex: 1 }}/>

          {/* File chip — shown when a file is staged */}
          {selectedFile && (
            <span style={{ fontSize: 11, color: T.accent, background: `${T.accent}18`,
              border: `1px solid ${T.accent}44`, borderRadius: 99,
              padding: "3px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              📎 {selectedFile.name}
              <span onClick={() => setSelectedFile(null)}
                style={{ cursor: "pointer", fontSize: 13, opacity: 0.7 }}>×</span>
            </span>
          )}

          {/* Upload button */}
          <button onClick={() => fileRef.current?.click()}
            style={{ fontSize: 11, padding: "6px 12px", borderRadius: 7,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}`,
              color: T.muted, cursor: "pointer" }}>
            📎 Upload File
          </button>
          <input ref={fileRef} type="file"
            accept=".csv,.xlsx,.xls,.tsv,.json,.parquet,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: "none" }}
            onChange={handleFileSelect}/>

          {/* AI session indicator */}
          {aiSessionId && (
            <span style={{ fontSize: 10, color: "#10b981", background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.25)", borderRadius: 99,
              padding: "3px 8px" }}>● Dataset loaded</span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "100%", gap: 12, opacity: 0.5 }}>
              <div style={{ fontSize: 36 }}>💬</div>
              <div style={{ fontSize: 14, color: T.text }}>Start a conversation</div>
              <div style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>
                Upload a dataset and ask anything about your data
              </div>
            </div>
          ) : messages.map((m, i) => <Bubble key={m.id || i} msg={m}/>)}
          {sending && (
            <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: "50%",
                  background: T.accent, opacity: 0.7,
                  animation: `bounce 1s ease ${i * 0.15}s infinite` }}/>
              ))}
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input area */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`,
          background: T.card, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything about your data… (Enter to send, Shift+Enter for newline)"
              rows={2}
              style={{ flex: 1, background: "rgba(255,255,255,0.05)",
                border: `1px solid ${T.border}`, borderRadius: 10,
                color: T.text, fontSize: 13, padding: "10px 14px",
                outline: "none", resize: "none", fontFamily: "inherit",
                lineHeight: 1.5 }}/>
            <button onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || sending}
              style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: (!input.trim() && !selectedFile) || sending
                  ? "rgba(255,255,255,0.05)" : T.accent,
                border: "none",
                cursor: (!input.trim() && !selectedFile) || sending ? "not-allowed" : "pointer",
                color: "#fff", fontSize: 18, display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "background 0.15s" }}>↑</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}