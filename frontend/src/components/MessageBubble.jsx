// src/components/MessageBubble.jsx
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

// ── Icons ────────────────────────────────────────────────────────────────────
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const ThumbUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
  </svg>
);
const ThumbDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Typewriter config ────────────────────────────────────────────────────────
const CHARS_PER_TICK = 6;   // characters revealed per tick (higher = faster)
const TICK_MS = 10;          // ms between ticks (lower = faster)

// ── Markdown component map ───────────────────────────────────────────────────
const mdComponents = {
  h1: ({ children }) => <h1 className="md-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="md-h4">{children}</h4>,
  p:  ({ children }) => <p  className="md-p">{children}</p>,
  ul: ({ children }) => <ul className="md-ul">{children}</ul>,
  ol: ({ children }) => <ol className="md-ol">{children}</ol>,
  li: ({ children }) => <li className="md-li">{children}</li>,
  strong: ({ children }) => <strong className="md-strong">{children}</strong>,
  em:     ({ children }) => <em className="md-em">{children}</em>,
  blockquote: ({ children }) => <blockquote className="md-blockquote">{children}</blockquote>,
  hr: () => <hr className="md-hr" />,
  code: ({ inline, children }) =>
    inline
      ? <code className="md-code-inline">{children}</code>
      : <pre className="md-pre"><code className="md-code-block">{children}</code></pre>,
  a: ({ href, children }) => (
    <a className="md-link" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

// ── Component ────────────────────────────────────────────────────────────────
const MessageBubble = ({ role, content }) => {
  const [displayed, setDisplayed] = useState(role === "user" ? content : "");
  const [isDone, setIsDone]       = useState(role === "user");
  const [copied, setCopied]       = useState(false);
  const [liked, setLiked]         = useState(null);

  const indexRef       = useRef(0);
  const frameRef       = useRef(null);
  const prevContentRef = useRef(content);

  useEffect(() => {
    if (role !== "assistant") return;

    // Reset on new message
    if (prevContentRef.current !== content) {
      prevContentRef.current = content;
      indexRef.current = 0;
      setDisplayed("");
      setIsDone(false);
    }

    const animate = () => {
      if (indexRef.current < content.length) {
        indexRef.current = Math.min(indexRef.current + CHARS_PER_TICK, content.length);
        setDisplayed(content.slice(0, indexRef.current));
        frameRef.current = setTimeout(animate, TICK_MS);
      } else {
        setIsDone(true);
      }
    };

    frameRef.current = setTimeout(animate, TICK_MS);
    return () => clearTimeout(frameRef.current);
  }, [content, role]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLike = (val) => setLiked((prev) => (prev === val ? null : val));

  // ── User bubble — plain text, no markdown ────────────────────────────────
  if (role === "user") {
    return (
      <div className="message user">
        <div className="message-lines">
          {content.split("\n").map((line, i, arr) => (
            <span key={i} className="message-line">
              {line}{i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Assistant bubble — markdown rendered ─────────────────────────────────
  return (
    <div className="message assistant">
      <div className="md-body">
        <ReactMarkdown components={mdComponents}>
          {displayed}
        </ReactMarkdown>
        {/* Blinking cursor while typing */}
        {!isDone && <span className="typing-cursor" />}
      </div>

      {/* Action buttons — only after fully rendered */}
      {isDone && (
        <div className="message-actions">
          <button
            className={`action-btn ${liked === "up" ? "active-like" : ""}`}
            onClick={() => handleLike("up")}
            title="Good response"
          >
            <ThumbUpIcon />
          </button>
          <button
            className={`action-btn ${liked === "down" ? "active-dislike" : ""}`}
            onClick={() => handleLike("down")}
            title="Bad response"
          >
            <ThumbDownIcon />
          </button>
          <div className="action-divider" />
          <button
            className={`action-btn ${copied ? "active-copy" : ""}`}
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;