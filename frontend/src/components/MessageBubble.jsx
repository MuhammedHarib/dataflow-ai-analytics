// src/components/MessageBubble.jsx
// Light theme redesign — all styles inline, zero CSS class dependency
// h1/h2/h3 → bold <p> tags (no ### symbols, no giant headings)
// User bubble → light gray pill | AI → plain document (no bubble)

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

// ── Icons (Lucide-style inline SVG) ──────────────────────────────
const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const ThumbUpIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
)
const ThumbDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── Typewriter config ─────────────────────────────────────────────
const CHARS_PER_TICK = 6
const TICK_MS        = 10

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  text:      "#111827",
  textSub:   "#374151",
  textMuted: "#6b7280",
  textDim:   "#9ca3af",
  border:    "#f3f4f6",
  codeBg:    "#f3f4f6",
  codeBd:    "#e5e7eb",
  preCode:   "#4f46e5",
  accent:    "#6366f1",
  green:     "#10b981",
  greenBg:   "#ecfdf5",
  red:       "#ef4444",
  redBg:     "#fef2f2",
  accentBg:  "#eef2ff",
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ── Markdown component overrides ──────────────────────────────────
// h1/h2/h3 → bold paragraph — no ### symbols, no giant heading sizes
const MD_COMPONENTS = {
  h1: ({ children }) => (
    <p style={{
      fontWeight: 700, fontSize: "1.1rem", margin: "12px 0 6px",
      color: C.text, lineHeight: 1.4, fontFamily: FONT,
      borderBottom: `1px solid ${C.border}`, paddingBottom: 6,
    }}>{children}</p>
  ),
  h2: ({ children }) => (
    <p style={{
      fontWeight: 700, fontSize: "1.05rem", margin: "10px 0 5px",
      color: C.text, lineHeight: 1.4, fontFamily: FONT,
    }}>{children}</p>
  ),
  h3: ({ children }) => (
    <p style={{
      fontWeight: 700, fontSize: "1rem", margin: "8px 0 4px",
      color: C.text, lineHeight: 1.4, fontFamily: FONT,
    }}>{children}</p>
  ),
  h4: ({ children }) => (
    <p style={{
      fontWeight: 600, fontSize: "0.95rem", margin: "6px 0 3px",
      color: C.textSub, lineHeight: 1.4, fontFamily: FONT,
    }}>{children}</p>
  ),
  p: ({ children }) => (
    <p style={{
      margin: "0 0 8px", lineHeight: 1.72,
      color: C.textSub, fontSize: 13.5, fontFamily: FONT,
    }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{
      margin: "4px 0 10px", paddingLeft: 20,
      color: C.textSub, fontSize: 13.5, fontFamily: FONT,
      display: "flex", flexDirection: "column", gap: 3,
    }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{
      margin: "4px 0 10px", paddingLeft: 20,
      color: C.textSub, fontSize: 13.5, fontFamily: FONT,
      display: "flex", flexDirection: "column", gap: 3,
    }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ lineHeight: 1.65, color: C.textSub, fontFamily: FONT }}>{children}</li>
  ),
  strong: ({ children }) => (
    <strong style={{ fontWeight: 650, color: C.text, fontFamily: FONT }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ fontStyle: "italic", color: C.textMuted, fontFamily: FONT }}>{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: `3px solid #e5e7eb`, margin: "8px 0",
      padding: "4px 0 4px 16px",
      color: C.textDim, fontStyle: "italic", fontFamily: FONT,
    }}>{children}</blockquote>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: `1px solid #f3f4f6`, margin: "12px 0" }} />
  ),
  code: ({ inline, children }) => inline
    ? (
      <code style={{
        background: C.codeBg, border: `1px solid ${C.codeBd}`,
        borderRadius: 5, padding: "1px 6px",
        fontSize: 12, fontFamily: "ui-monospace, 'Cascadia Code', monospace",
        color: C.preCode,
      }}>{children}</code>
    ) : (
      <pre style={{
        background: "#f9fafb", border: `1px solid #e5e7eb`,
        borderRadius: 10, padding: "14px 16px",
        overflowX: "auto", margin: "8px 0",
      }}>
        <code style={{
          fontFamily: "ui-monospace, 'Cascadia Code', monospace",
          fontSize: 12, color: "#374151", lineHeight: 1.65, whiteSpace: "pre",
        }}>{children}</code>
      </pre>
    ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{
        color: C.accent, textDecoration: "underline",
        textDecorationColor: "rgba(99,102,241,0.3)",
        textUnderlineOffset: 3, transition: "color 0.15s",
        fontFamily: FONT,
      }}>{children}</a>
  ),
}

// ── Component ──────────────────────────────────────────────────────
const MessageBubble = ({ role, content }) => {
  const [displayed, setDisplayed] = useState(role === "user" ? content : "")
  const [isDone,    setIsDone]    = useState(role === "user")
  const [copied,    setCopied]    = useState(false)
  const [liked,     setLiked]     = useState(null)

  const indexRef       = useRef(0)
  const frameRef       = useRef(null)
  const prevContentRef = useRef(content)

  useEffect(() => {
    if (role !== "assistant") return

    if (prevContentRef.current !== content) {
      prevContentRef.current = content
      indexRef.current = 0
      setDisplayed("")
      setIsDone(false)
    }

    const animate = () => {
      if (indexRef.current < content.length) {
        indexRef.current = Math.min(indexRef.current + CHARS_PER_TICK, content.length)
        setDisplayed(content.slice(0, indexRef.current))
        frameRef.current = setTimeout(animate, TICK_MS)
      } else {
        setIsDone(true)
      }
    }

    frameRef.current = setTimeout(animate, TICK_MS)
    return () => clearTimeout(frameRef.current)
  }, [content, role])

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleLike = (val) => setLiked(prev => prev === val ? null : val)

  // ── User bubble ───────────────────────────────────────────────
  if (role === "user") {
    return (
      <div style={{
        padding: "10px 14px",
        borderRadius: "16px 16px 4px 16px",
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        fontSize: 13.5, color: C.text,
        lineHeight: 1.65, wordBreak: "break-word",
        fontFamily: FONT,
        maxWidth: "100%",
      }}>
        {content.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}{i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    )
  }

  // ── AI response — document style, no bubble ───────────────────
  return (
    <div style={{ width: "100%", fontFamily: FONT }}>

      {/* Markdown body */}
      <div style={{
        color: C.text,
        fontSize: 13.5,
        lineHeight: 1.75,
        wordBreak: "break-word",
      }}>
        <ReactMarkdown components={MD_COMPONENTS}>
          {displayed}
        </ReactMarkdown>

        {/* Blinking cursor while typing */}
        {!isDone && (
          <span style={{
            display: "inline-block",
            width: 2, height: "1em",
            background: C.accent,
            marginLeft: 2,
            verticalAlign: "text-bottom",
            borderRadius: 1,
            animation: "df-cursor-blink 0.7s ease-in-out infinite",
          }} />
        )}
      </div>

      {/* Action buttons — only after fully rendered */}
      {isDone && (
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
        }}>
          {/* Thumbs up */}
          <ActionBtn
            onClick={() => handleLike("up")}
            active={liked === "up"}
            activeColor={C.green}
            activeBg={C.greenBg}
            title="Good response"
          >
            <ThumbUpIcon />
          </ActionBtn>

          {/* Thumbs down */}
          <ActionBtn
            onClick={() => handleLike("down")}
            active={liked === "down"}
            activeColor={C.red}
            activeBg={C.redBg}
            title="Bad response"
          >
            <ThumbDownIcon />
          </ActionBtn>

          {/* Divider */}
          <div style={{ width: 1, height: 16, background: "#e5e7eb", margin: "0 4px" }} />

          {/* Copy */}
          <ActionBtn
            onClick={handleCopy}
            active={copied}
            activeColor={C.accent}
            activeBg={C.accentBg}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </ActionBtn>
        </div>
      )}

      {/* Keyframe for cursor — injected once */}
      <style>{`
        @keyframes df-cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ── Small action button ────────────────────────────────────────────
function ActionBtn({ children, onClick, active, activeColor, activeBg, title }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 8,
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 0, flexShrink: 0,
        background: active ? activeBg : hov ? "#f3f4f6" : "transparent",
        color: active ? activeColor : hov ? "#6b7280" : "#9ca3af",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  )
}

export default MessageBubble