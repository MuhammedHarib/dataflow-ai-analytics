// src/api/chat.jsx
import axios from "axios";

const BASE = "http://127.0.0.1:8000/api/v1";
const API  = axios.create({ baseURL: BASE });

/**
 * Unified send function.
 * @param {string}      message        - User's question
 * @param {File|null}   file           - CSV/Excel (first upload only)
 * @param {string|null} sessionId      - Server-side session ID from prior upload
 * @param {string|null} profileContext - Serialized dataset profile (fallback)
 * @param {Array}       history        - [{role, content}] prior turns
 */
export const sendMessage = async (
  message,
  file           = null,
  sessionId      = null,
  profileContext = null,
  history        = [],
) => {
  const formData = new FormData();
  formData.append("message", message || "");

  if (file)           formData.append("file",            file);
  if (sessionId)      formData.append("session_id",      sessionId);
  if (profileContext) formData.append("profile_context", profileContext);
  if (history?.length) formData.append("history",        JSON.stringify(history));

  try {
    const response = await API.post("/chat/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    if (error.response?.data) return error.response.data;
    throw error;
  }
};

// Standalone file preview (used by /file/preview endpoint if needed separately)
export const uploadFilePreview = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await API.post("/file/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    if (error.response?.data) return error.response.data;
    throw error;
  }
};