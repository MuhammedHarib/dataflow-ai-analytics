// src/components/ChatBox.jsx
// Light theme redesign — surgical inline style overrides
// Keeps ALL original logic intact: PreviewPanel, AnalysisPanel,
// VizSuggestionsCard, typewriter, file upload, session memory
// Only visual layer changed — zero functional diff

import React, { useState, useRef, useEffect } from "react";
import { sendMessage }        from "../api/chat";
import MessageBubble          from "./MessageBubble";
import PreviewPanel           from "./PreviewPanel";
import AnalysisPanel          from "./AnalysisPanel";
import VizSuggestionsCard     from "./VizSuggestionsCard";
import WarningBanner          from "./WarningBanner";
import {
  Paperclip, Mic, Send, X, Database,
  FileText, LayoutDashboard, TrendingUp, Search,
} from "lucide-react";

const DATASET_TYPES  = ".csv,.xlsx,.xls";
const IMAGE_TYPES    = ".jpg,.jpeg,.png,.gif,.webp";
const ALL_FILE_TYPES = `${DATASET_TYPES},${IMAGE_TYPES}`;
const IMAGE_MIME     = ["image/jpeg","image/jpg","image/png","image/gif","image/webp"];
const isImageFile    = f => f && IMAGE_MIME.includes(f.type);

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  pageBg:    "#f7f7f8",
  chatBg:    "#ffffff",
  border:    "#e5e7eb",
  text:      "#111827",
  textSub:   "#6b7280",
  textDim:   "#9ca3af",
  accent:    "#6366f1",
  accentBg:  "#eef2ff",
  accentBd:  "#c7d2fe",
  green:     "#10b981",
  greenBg:   "#ecfdf5",
  greenBd:   "#a7f3d0",
  userBubble:"#f3f4f6",
  userBd:    "#e5e7eb",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ── Starter cards ─────────────────────────────────────────────────
const STARTER_CARDS = [
  { icon: FileText,        label: "Summarize Dataset",  prompt: "Please give me a clear summary of this dataset — key columns, distributions, and any notable patterns." },
  { icon: LayoutDashboard, label: "Create a Dashboard", prompt: "Based on this dataset, suggest the best dashboard layout with the most insightful chart types and KPIs." },
  { icon: TrendingUp,      label: "Trend Analysis",     prompt: "Identify and explain the main trends over time in this dataset." },
  { icon: Search,          label: "Find Anomalies",     prompt: "Scan this dataset for anomalies, outliers, or unexpected values and explain what you find." },
]

// ── AI Avatar ─────────────────────────────────────────────────────
const AiAvatar = () => (
  <div style={{
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
    background: "linear-gradient(135deg, #6366f1, #818cf8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 700, color: "#fff",
    boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
    fontFamily: FONT,
  }}>AI</div>
)

// ── User Avatar ───────────────────────────────────────────────────
const UserAvatar = () => (
  <div style={{
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
    background: C.accentBg, border: `1.5px solid ${C.accentBd}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, fontWeight: 700, color: C.accent,
    fontFamily: FONT,
  }}>U</div>
)

// ── File chip ─────────────────────────────────────────────────────
const FileChip = ({ fileName, isImg }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px",
    background: C.accentBg, border: `1px solid ${C.accentBd}`,
    borderRadius: 7, fontSize: 11.5, color: C.accent,
    maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    fontFamily: FONT,
  }}>
    {isImg
      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      : <Paperclip size={11} strokeWidth={2} />
    }
    {fileName}
  </div>
)

// ── Welcome / empty state ─────────────────────────────────────────
const WelcomeScreen = ({ onPrompt }) => (
  <div style={{
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "40px 24px 160px",
    background: C.chatBg, fontFamily: FONT,
  }}>
    {/* Logo orb */}
    <div style={{
      width: 52, height: 52, borderRadius: 16, marginBottom: 20,
      background: "linear-gradient(135deg, #6366f1, #818cf8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 24px rgba(99,102,241,0.28)",
    }}>
      <span style={{ fontSize: 22, color: "#fff", fontWeight: 800 }}>AI</span>
    </div>

    <h2 style={{
      fontSize: 22, fontWeight: 700, color: C.text,
      letterSpacing: "-0.03em", margin: "0 0 8px", textAlign: "center",
    }}>
      What can I help you with?
    </h2>
    <p style={{
      fontSize: 13, color: C.textSub, margin: "0 0 32px",
      textAlign: "center", maxWidth: 360, lineHeight: 1.6,
    }}>
      Upload a dataset or ask anything. DataFlow will analyze,
      visualize, and summarize your data instantly.
    </p>

    {/* Starter cards — 2×2 grid */}
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: 12, width: "100%", maxWidth: 480,
    }}>
      {STARTER_CARDS.map(card => {
        const Icon = card.icon
        return (
          <StarterCard key={card.label} icon={Icon} label={card.label}
            onClick={() => onPrompt(card.prompt)} />
        )
      })}
    </div>
  </div>
)

function StarterCard({ icon: Icon, label, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "14px 16px", borderRadius: 12, textAlign: "left",
        background: "#ffffff",
        border: `1px solid ${hov ? C.accentBd : C.border}`,
        cursor: "pointer", fontFamily: FONT,
        boxShadow: hov
          ? "0 4px 12px rgba(99,102,241,0.1)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: C.accentBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={15} strokeWidth={1.8} style={{ color: C.accent }} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 600, color: C.text,
        lineHeight: 1.4, marginTop: 6,
      }}>{label}</span>
    </button>
  )
}

// ── Typing dots ───────────────────────────────────────────────────
const TypingIndicator = () => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", width: "fit-content",
    background: "#f9fafb", border: `1px solid ${C.border}`,
    borderRadius: "16px 16px 16px 4px",
    fontFamily: FONT,
  }}>
    <span style={{ fontSize: 12, color: C.textDim }}>Thinking</span>
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: C.accent,
          animation: `df-bounce 1.2s ease ${i * 0.2}s infinite`,
          opacity: 0.6,
        }} />
      ))}
    </div>
  </div>
)

// ── Main ChatBox ───────────────────────────────────────────────────
const ChatBox = ({ initialState = {}, onStateChange, onOpenVisual }) => {
  const [messages,      setMessages]      = useState(initialState.messages      || [])
  const [input,         setInput]         = useState("")
  const [warning,       setWarning]       = useState("")
  const [loading,       setLoading]       = useState(false)
  const [tempVisible,   setTempVisible]   = useState((initialState.messages || []).length === 0)
  const [selectedFile,  setSelectedFile]  = useState(null)
  const [isFocused,     setIsFocused]     = useState(false)
  const [sessionId,     setSessionId]     = useState(initialState.sessionId     || null)
  const [datasetProfile,setDatasetProfile]= useState(initialState.profileContext || null)
  const [chatHistory,   setChatHistory]   = useState(initialState.chatHistory   || [])

  const messagesEndRef = useRef(null)
  const fileInputRef   = useRef(null)
  const textareaRef    = useRef(null)

  // Notify parent of state changes
  useEffect(() => {
    const analysisProfile = messages
      .filter(m => m.isAnalysis || (m.isPreview && m.previewData?.analysis))
      .map(m => m.isAnalysis ? m.analysisData : m.previewData?.analysis)
      .filter(Boolean).slice(-1)[0] || null

    onStateChange?.({
      messages, sessionId,
      profileContext: datasetProfile,
      chatHistory,
      hasDataset: !!sessionId,
      analysisProfile,
      title: messages.find(m => m.role === "user")?.content?.slice(0, 40) || null,
    })
  }, [messages, sessionId, datasetProfile, chatHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleInputChange = e => {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px" }
  }

  const handleFileSelect = e => {
    const file = e.target.files[0]
    if (file) setSelectedFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const clearDataset = () => {
    setSessionId(null)
    setDatasetProfile(null)
    setChatHistory([])
  }

  // Called by starter cards or normal send
  const handleSend = async (overrideText) => {
    const userText = (overrideText ?? input).trim()
    const fileForThisSend = selectedFile
    const isImage = isImageFile(fileForThisSend)

    if (!userText && !fileForThisSend) return
    if (tempVisible) setTempVisible(false)

    setMessages(prev => [
      ...prev,
      {
        role: "user",
        content: userText || (isImage ? "Analyze this image" : ""),
        fileName: fileForThisSend?.name || null,
        isImage,
      },
    ])

    setInput("")
    setSelectedFile(null)
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setLoading(true)
    setWarning("")

    try {
      const res = await sendMessage(
        userText, fileForThisSend, sessionId, datasetProfile, chatHistory,
      )

      if (fileForThisSend && !isImage) {
        if (res.session_id)      setSessionId(res.session_id)
        if (res.profile_context) setDatasetProfile(res.profile_context)
        if (res.session_id)      setChatHistory([])
      }
      if (res.chart_data) onStateChange?.({ chartData: res.chart_data })

      if (res.preview) {
        setMessages(prev => [...prev, { role: "assistant", isPreview: true, previewData: res }])
      }
      if (res.analysis && !res.preview) {
        setMessages(prev => [...prev, {
          role: "assistant", isAnalysis: true,
          analysisData: res.analysis, analysisLabel: res.analysis_label || "Dataset Analysis",
        }])
      }
      if (res.answer) {
        setMessages(prev => [...prev, {
          role: "assistant", content: res.answer,
          isImageReply: res.is_image_reply || false,
          vizSuggestions: res.viz_suggestions || [],
        }])
        if (!res.is_image_reply) {
          setChatHistory(prev => [
            ...prev,
            { role: "user",      content: userText },
            { role: "assistant", content: res.answer },
          ])
        }
      }
      if (res.warnings?.length) setWarning(res.warnings.join(" · "))

    } catch (err) {
      console.error(err)
      setWarning("Something went wrong. Please try again.")
      setMessages(prev => [...prev, { role: "assistant", content: "Server error. Try again." }])
    }

    setLoading(false)
  }

  const handleKeyPress = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const datasetLoaded = !!sessionId
  const canSend = (input.trim().length > 0 || !!selectedFile) && !loading

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100%", width: "100%",
      background: C.chatBg, overflow: "hidden",
      fontFamily: FONT, position: "relative",
    }}>

      {/* ── Welcome / empty state ──────────────────────────────── */}
      {tempVisible && <WelcomeScreen onPrompt={text => handleSend(text)} />}

      {/* ── Warning banner ─────────────────────────────────────── */}
      {warning && (
        <div style={{
          margin: "8px 24px", padding: "10px 16px",
          background: "#fffbeb", border: "1px solid #fde68a",
          borderRadius: 10, fontSize: 13, color: "#92400e",
          fontFamily: FONT,
        }}>{warning}</div>
      )}

      {/* ── Messages ───────────────────────────────────────────── */}
      {!tempVisible && (
        <div style={{
          flex: 1, overflowY: "auto", padding: "24px 0 12px",
          scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent",
          background: C.chatBg,
        }}>
          <div style={{
            display: "flex", flexDirection: "column", gap: 4,
            padding: "0 24px 12px",
            maxWidth: 800, margin: "0 auto", width: "100%",
          }}>
            {messages.map((msg, index) => {

              // Preview card
              if (msg.isPreview) {
                return (
                  <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
                    <AiAvatar />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
                      <PreviewPanel
                        preview={msg.previewData.preview}
                        warnings={msg.previewData.warnings}
                        errors={msg.previewData.errors}
                        status={msg.previewData.status}
                      />
                      {msg.previewData.analysis && (
                        <AnalysisPanel analysis={msg.previewData.analysis} label={msg.previewData.analysis_label} />
                      )}
                    </div>
                  </div>
                )
              }

              // Analysis card
              if (msg.isAnalysis) {
                return (
                  <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
                    <AiAvatar />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <AnalysisPanel analysis={msg.analysisData} label={msg.analysisLabel} />
                    </div>
                  </div>
                )
              }

              // Normal message
              const isUser = msg.role === "user"
              return (
                <div key={index} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  flexDirection: isUser ? "row-reverse" : "row",
                  padding: "6px 0", marginBottom: 10,
                }}>
                  {isUser ? <UserAvatar /> : <AiAvatar />}
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 6,
                    maxWidth: isUser ? "68%" : "90%",
                    alignItems: isUser ? "flex-end" : "flex-start",
                  }}>
                    {msg.fileName && <FileChip fileName={msg.fileName} isImg={msg.isImage} />}
                    <MessageBubble role={msg.role} content={msg.content} />
                    {!isUser && msg.vizSuggestions?.length > 0 && (
                      <VizSuggestionsCard
                        suggestions={msg.vizSuggestions}
                        onOpenVisual={datasetLoaded ? onOpenVisual : null}
                      />
                    )}
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0" }}>
                <AiAvatar />
                <TypingIndicator />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ── Floating input dock ─────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: "10px 24px 18px",
        background: C.chatBg,
        fontFamily: FONT,
      }}>
        {/* Dataset in memory pill */}
        {datasetLoaded && (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "6px 12px", marginBottom: 8,
            background: C.greenBg, border: `1px solid ${C.greenBd}`,
            borderRadius: 20, fontSize: 11.5, color: C.green,
            width: "fit-content", maxWidth: 800,
          }}>
            <Database size={11} strokeWidth={2} />
            <span>Dataset in memory · follow-up questions will use it</span>
            <button onClick={clearDataset} style={{
              background: "none", border: "none", color: "#6ee7b7",
              cursor: "pointer", fontSize: 13, padding: "0 0 0 4px",
              lineHeight: 1, display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "#6ee7b7"}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Input shell */}
        <div style={{
          maxWidth: 800, margin: "0 auto", width: "100%",
          background: "#ffffff",
          border: `1.5px solid ${isFocused ? C.accent : C.border}`,
          borderRadius: 16,
          padding: "8px 8px 8px 14px",
          boxShadow: isFocused
            ? "0 4px 16px rgba(99,102,241,0.12), 0 1px 4px rgba(0,0,0,0.04)"
            : "0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}>
          {/* Staged file pill */}
          {selectedFile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", marginBottom: 6,
              background: C.accentBg, border: `1px solid ${C.accentBd}`,
              borderRadius: 9, fontSize: 12, color: C.accent,
            }}>
              <Paperclip size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
                {selectedFile.name}
              </span>
              <button onClick={() => setSelectedFile(null)} style={{
                background: "none", border: "none", color: C.textDim,
                cursor: "pointer", display: "flex", alignItems: "center",
                padding: 2, transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
              onMouseLeave={e => e.currentTarget.style.color = C.textDim}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} style={{ display: "none" }}
              accept={ALL_FILE_TYPES} onChange={handleFileSelect} />

            {/* Attach button */}
            <InputIconBtn
              onClick={() => fileInputRef.current?.click()}
              title="Attach file (CSV, Excel, or image)"
            >
              <Paperclip size={15} strokeWidth={1.8} />
            </InputIconBtn>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                selectedFile && isImageFile(selectedFile)
                  ? "Ask about this image, or send to analyze it..."
                  : datasetLoaded
                    ? "Ask a follow-up question about the dataset..."
                    : "Ask anything, or attach a CSV / image..."
              }
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: C.text, fontSize: 13, fontFamily: FONT,
                lineHeight: 1.6, resize: "none", padding: "5px 4px",
                maxHeight: 160, overflowY: "auto", scrollbarWidth: "none",
              }}
            />

            {/* Mic button */}
            <InputIconBtn title="Voice input">
              <Mic size={15} strokeWidth={1.8} />
            </InputIconBtn>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!canSend}
              title="Send"
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: canSend ? C.accent : "#f3f4f6",
                border: "none",
                cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s, transform 0.1s",
                marginBottom: 1,
              }}
              onMouseEnter={e => { if (canSend) e.currentTarget.style.transform = "scale(1.06)" }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)" }}
            >
              <Send size={14} strokeWidth={2}
                style={{ color: canSend ? "#fff" : C.textDim }} />
            </button>
          </div>
        </div>

        {/* Hint */}
        <p style={{
          fontSize: 11, color: "#d1d5db", textAlign: "center",
          margin: "8px 0 0", fontFamily: FONT,
        }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes df-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Small input icon button ────────────────────────────────────────
function InputIconBtn({ children, onClick, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, borderRadius: 8, border: "none",
        background: hov ? "#f3f4f6" : "transparent",
        color: hov ? "#374151" : "#9ca3af",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
        marginBottom: 1,
      }}
    >
      {children}
    </button>
  )
}

export default ChatBox