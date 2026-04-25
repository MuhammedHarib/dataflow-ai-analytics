// src/api/client.js — central API client
// Change BASE_URL once to switch environments.

import axios from 'axios'

const BASE = 'http://localhost:8000/api/v1'
const api = axios.create({ baseURL: BASE })

// ── Projects ────────────────────────────────────────────────────────
export const projectsApi = {
  list:    ()           => api.get('/projects/'),
  create:  (data)       => api.post('/projects/', data),
  get:     (id)         => api.get(`/projects/${id}`),
  update:  (id, data)   => api.patch(`/projects/${id}`, data),
  delete:  (id)         => api.delete(`/projects/${id}`),
  summary: (id)         => api.get(`/projects/${id}/summary`),
}

// ── Datasets ────────────────────────────────────────────────────────
export const datasetsApi = {
  list:     (projectId)  => api.get(`/datasets/project/${projectId}`),

  // Upload a file (CSV/XLSX/JSON/TSV/Parquet) — one per project, replaces existing
  upload:   (projectId, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/datasets/project/${projectId}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    })
  },

  // Get stored parsed rows (for dashboard rendering without re-upload)
  getChartData: (datasetId) => api.get(`/datasets/${datasetId}/chart-data`),

  // Revive the in-memory AI session from DB — call on project chat mount
  reviveSession: (datasetId) => api.post(`/datasets/${datasetId}/revive-session`),

  register: (data)       => api.post('/datasets/register', data),
  delete:   (id)         => api.delete(`/datasets/${id}`),
  updateSession: (id, sessionId) =>
    api.patch(`/datasets/${id}/session`, null, { params: { session_id: sessionId } }),
}

// ── Dashboards ──────────────────────────────────────────────────────
// Note: backend field is "layout" (not "layout_json") in DashboardCreate / DashboardUpdate
export const dashboardsApi = {
  list:   (projectId) => api.get(`/dashboards/project/${projectId}`),
  get:    (id)        => api.get(`/dashboards/${id}`),

  // Create — sends {project_id, dataset_id, name, scheme, layout}
  create: (data) => api.post('/dashboards/', {
    project_id: data.project_id,
    dataset_id: data.dataset_id || null,
    name:       data.name,
    description:data.description || null,
    scheme:     data.scheme || 'Metric Flow',
    layout:     data.layout || null,   // ← correct field name for backend
  }),

  // Update — sends {name, scheme, layout}
  update: (id, data) => api.patch(`/dashboards/${id}`, {
    name:    data.name    || undefined,
    scheme:  data.scheme  || undefined,
    layout:  data.layout  || undefined,   // ← correct field name
    is_pinned: data.is_pinned !== undefined ? data.is_pinned : undefined,
  }),

  delete: (id) => api.delete(`/dashboards/${id}`),
}

// ── Chat history ─────────────────────────────────────────────────────
export const historyApi = {
  listSessions:  (projectId)  => api.get(`/history/sessions/${projectId}`),
  createSession: (data)       => api.post('/history/sessions', data),
  updateTitle:   (id, title)  => api.patch(`/history/sessions/${id}/title`, null, { params: { title } }),
  deleteSession: (id)         => api.delete(`/history/sessions/${id}`),
  getMessages:   (sessionId)  => api.get(`/history/sessions/${sessionId}/messages`),
  addMessage:    (sessionId, data) => api.post(`/history/sessions/${sessionId}/messages`, data),
}

// ── Existing file-upload / chat endpoints ─────────────────────────────
export const fileApi = {
  upload: (formData, onProgress) =>
    api.post('/file/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
}

export const chatApi = {
  send: (data) => api.post('/chat/message', data),
}

export default api