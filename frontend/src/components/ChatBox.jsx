// src/components/ChatBox.jsx
import React, { useState, useRef, useEffect } from "react";
import { sendMessage }        from "../api/chat";
import MessageBubble          from "./MessageBubble";
import PreviewPanel           from "./PreviewPanel";
import AnalysisPanel          from "./AnalysisPanel";
import VizSuggestionsCard     from "./VizSuggestionsCard";
import WarningBanner          from "./WarningBanner";

// Accepted dataset types
const DATASET_TYPES  = ".csv,.xlsx,.xls";
// Accepted image types
const IMAGE_TYPES    = ".jpg,.jpeg,.png,.gif,.webp";
const ALL_FILE_TYPES = `${DATASET_TYPES},${IMAGE_TYPES}`;

const IMAGE_MIME = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const isImageFile = (file) => file && IMAGE_MIME.includes(file.type);

const ChatBox = ({ initialState = {}, onStateChange, onOpenVisual }) => {
  const [messages, setMessages]         = useState(initialState.messages       || []);
  const [input, setInput]               = useState("");
  const [warning, setWarning]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [tempVisible, setTempVisible]   = useState((initialState.messages || []).length === 0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFocused, setIsFocused]       = useState(false);

  // Session memory
  const [sessionId, setSessionId]           = useState(initialState.sessionId      || null);
  const [datasetProfile, setDatasetProfile] = useState(initialState.profileContext  || null);
  const [chatHistory, setChatHistory]       = useState(initialState.chatHistory     || []);

  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const textareaRef    = useRef(null);

  // Notify parent of state changes
  useEffect(() => {
    const analysisProfile = messages
      .filter(m => m.isAnalysis || (m.isPreview && m.previewData?.analysis))
      .map(m => m.isAnalysis ? m.analysisData : m.previewData?.analysis)
      .filter(Boolean)
      .slice(-1)[0] || null;

    onStateChange?.({
      messages,
      sessionId,
      profileContext:  datasetProfile,
      chatHistory,
      hasDataset:      !!sessionId,
      analysisProfile,
      title: messages.find(m => m.role === "user")?.content?.slice(0, 40) || null,
    });
  }, [messages, sessionId, datasetProfile, chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearDataset = () => {
    setSessionId(null);
    setDatasetProfile(null);
    setChatHistory([]);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    if (tempVisible) setTempVisible(false);

    const userText        = input.trim();
    const fileForThisSend = selectedFile;
    const isImage         = isImageFile(fileForThisSend);

    setMessages(prev => [
      ...prev,
      {
        role:     "user",
        content:  userText || (isImage ? "Analyze this image" : ""),
        fileName: fileForThisSend?.name || null,
        isImage,
      },
    ]);

    setInput("");
    setSelectedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);
    setWarning("");

    try {
      const res = await sendMessage(
        userText,
        fileForThisSend,
        sessionId,
        datasetProfile,
        chatHistory,
      );

      // New dataset uploaded — store session
      if (fileForThisSend && !isImage) {
        if (res.session_id)      setSessionId(res.session_id);
        if (res.profile_context) setDatasetProfile(res.profile_context);
        if (res.session_id)      setChatHistory([]);
      }
      // Store chart_data whenever it comes back (upload or on-demand analysis)
      if (res.chart_data) {
        onStateChange?.({ chartData: res.chart_data });
      }

      // Preview card (dataset upload only)
      if (res.preview) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", isPreview: true, previewData: res },
        ]);
      }

      // Standalone analysis card
      if (res.analysis && !res.preview) {
        setMessages(prev => [
          ...prev,
          {
            role:          "assistant",
            isAnalysis:    true,
            analysisData:  res.analysis,
            analysisLabel: res.analysis_label || "Dataset Analysis",
          },
        ]);
      }

      // AI text answer
      if (res.answer) {
        setMessages(prev => [
          ...prev,
          {
            role:            "assistant",
            content:         res.answer,
            isImageReply:    res.is_image_reply || false,
            vizSuggestions:  res.viz_suggestions || [],
          },
        ]);
        // Only add dataset answers to history (not image replies)
        if (!res.is_image_reply) {
          setChatHistory(prev => [
            ...prev,
            { role: "user",      content: userText },
            { role: "assistant", content: res.answer },
          ]);
        }
      }

      if (res.status === "error" || res.status === "sample_required") {
        setLoading(false);
        return;
      }
      if (res.warnings?.length) setWarning(res.warnings.join(" · "));

    } catch (err) {
      console.error(err);
      setWarning("Something went wrong. Please try again.");
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Server error. Try again." },
      ]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const datasetLoaded = !!sessionId;

  const AiAvatar = () => (
    <div className="avatar ai-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
      </svg>
    </div>
  );

  // File chip — shows image thumbnail for images, icon for datasets
  const FileChip = ({ fileName, isImg }) => (
    <div className="file-chip">
      {isImg ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )}
      {fileName}
    </div>
  );

  return (
    <div className="chatbox-root">

      {tempVisible && (
        <div className="welcome-screen">
          <div className="welcome-orb" />
          <div className="welcome-text">
            <span className="welcome-greeting">Good to see you</span>
            <span className="welcome-question">What can I help you with?</span>
          </div>
          <div className="welcome-suggestions">
            {["Summarize a document", "Write some code", "Explain a concept", "Analyze data"].map(s => (
              <button key={s} className="suggestion-chip"
                onClick={() => { setInput(s); textareaRef.current?.focus(); }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <WarningBanner warning={warning} />

      <div className="messages-container">
        <div className="messages-inner">
          {messages.map((msg, index) => {

            // Preview card
            if (msg.isPreview) {
              const r = msg.previewData;
              return (
                <div key={index} className="message-wrapper assistant">
                  <AiAvatar />
                  <div className="message-content-wrapper assistant">
                    <PreviewPanel
                      preview={r.preview} warnings={r.warnings}
                      errors={r.errors}   status={r.status}
                    />
                    {r.analysis && (
                      <AnalysisPanel analysis={r.analysis} label={r.analysis_label} />
                    )}
                  </div>
                </div>
              );
            }

            // Standalone analysis card
            if (msg.isAnalysis) {
              return (
                <div key={index} className="message-wrapper assistant">
                  <AiAvatar />
                  <div className="message-content-wrapper assistant">
                    <AnalysisPanel analysis={msg.analysisData} label={msg.analysisLabel} />
                  </div>
                </div>
              );
            }

            // Normal message
            return (
              <div key={index} className={`message-wrapper ${msg.role}`}>
                {msg.role === "assistant" && <AiAvatar />}
                <div className={`message-content-wrapper ${msg.role}`}>
                  {msg.fileName && (
                    <FileChip fileName={msg.fileName} isImg={msg.isImage} />
                  )}
                  <MessageBubble role={msg.role} content={msg.content} />

                  {/* Viz suggestions card — shown below AI answer */}
                  {msg.role === "assistant" && msg.vizSuggestions?.length > 0 && (
                    <VizSuggestionsCard
                      suggestions={msg.vizSuggestions}
                      onOpenVisual={datasetLoaded ? onOpenVisual : null}
                    />
                  )}
                </div>
                {msg.role === "user" && <div className="avatar user-avatar">U</div>}
              </div>
            );
          })}

          {loading && (
            <div className="message-wrapper assistant">
              <AiAvatar />
              <div className="typing-indicator">
                <span className="typing-text">Generating response</span>
                <span className="typing-dots"><span /><span /><span /></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="input-dock">
        {datasetLoaded && (
          <div className="dataset-context-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            Dataset in memory · follow-up questions will use it
            <button className="clear-dataset-btn" onClick={clearDataset} title="Clear dataset">✕</button>
          </div>
        )}

        <div className={`input-shell ${isFocused ? "focused" : ""}`}>
          {selectedFile && (
            <div className="file-preview-pill">
              {isImageFile(selectedFile) ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
              <span>{selectedFile.name}</span>
              <button className="remove-file-btn" onClick={() => setSelectedFile(null)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          <div className="input-row">
            <input type="file" ref={fileInputRef} style={{ display: "none" }}
              accept={ALL_FILE_TYPES} onChange={handleFileSelect} />

            <button className="icon-btn attach-btn" title="Attach file (CSV, Excel, or image)"
              onClick={() => fileInputRef.current.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <textarea ref={textareaRef} value={input}
              onChange={handleInputChange} onKeyDown={handleKeyPress}
              onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}
              placeholder={
                selectedFile && isImageFile(selectedFile)
                  ? "Ask about this image, or send to analyze it..."
                  : datasetLoaded
                    ? "Ask a follow-up question about the dataset..."
                    : "Ask anything, or attach a CSV / image..."
              }
              rows={1} className="chat-textarea" />

            <button className="icon-btn mic-btn" title="Voice input">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            <button
              className={`send-btn ${input.trim() || selectedFile ? "active" : ""}`}
              onClick={handleSend} title="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default ChatBox;