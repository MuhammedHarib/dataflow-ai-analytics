// src/components/workspace/ProjectDetail.jsx
// Light theme redesign
// • Glassmorphic sticky header with project title + controls
// • Compact dataset preview card
// • Ultra-minimalist dashboard row list
// • Offset icon collage empty state
// All original logic preserved exactly

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Eye, RefreshCw, Trash2, Plus,
  LayoutDashboard, Database, FileSpreadsheet,
  ChevronRight, X, Upload, AlertTriangle,
  CheckCircle, MessageSquare, Calendar,
} from 'lucide-react'
import { projectsApi, datasetsApi, dashboardsApi } from '../../api/client'

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  pageBg:    '#f7f7f8',
  card:      '#ffffff',
  border:    '#e5e7eb',
  borderHov: '#d1d5db',
  text:      '#111827',
  textSub:   '#6b7280',
  textDim:   '#9ca3af',
  accent:    '#6366f1',
  accentBg:  '#eef2ff',
  accentBd:  '#c7d2fe',
  green:     '#10b981',
  greenBg:   '#ecfdf5',
  greenBd:   '#a7f3d0',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  amberBd:   '#fde68a',
  red:       '#ef4444',
  redBg:     '#fef2f2',
  redBd:     '#fecaca',
}

const FONT   = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const ACCEPT = '.csv,.tsv,.xlsx,.xls,.json,.parquet'

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function fmtAge(dateStr) {
  const age = Math.floor((Date.now() - new Date(dateStr)) / 86400000)
  if (age === 0) return 'Today'
  if (age === 1) return 'Yesterday'
  return `${age}d ago`
}

// ── Schema modal ──────────────────────────────────────────────────
function SchemaModal({ dataset, onClose }) {
  const schema = (() => { try { return JSON.parse(dataset.schema_json || '{}') } catch { return {} } })()
  const cols = Object.entries(schema)

  const TYPE_COLORS = {
    int64: '#3b82f6', float64: '#3b82f6', int32: '#3b82f6',
    object: '#059669', string: '#059669',
    datetime64: '#d97706', bool: '#7c3aed',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff', border: `1px solid ${C.border}`,
          borderRadius: 18, padding: 28, width: 560, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          fontFamily: FONT,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 20,
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text,
              margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Schema
            </h3>
            <p style={{ fontSize: 12, color: C.textSub, margin: 0 }}>
              {dataset.file_name}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textDim, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1, borderRadius: 10,
          border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Column', 'Type'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '9px 14px',
                    color: C.textDim, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontSize: 10,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map(([col, dtype], i) => (
                <tr key={col} style={{
                  borderBottom: i < cols.length - 1 ? `1px solid #f9fafb` : 'none',
                }}>
                  <td style={{ padding: '8px 14px', color: C.text,
                    fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{col}</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                      color: TYPE_COLORS[dtype] || C.textSub,
                      background: `${TYPE_COLORS[dtype] || '#6b7280'}12`,
                      border: `1px solid ${TYPE_COLORS[dtype] || '#6b7280'}25`,
                      borderRadius: 5, padding: '1px 7px',
                    }}>{dtype}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 16, fontSize: 11, color: C.textDim,
          display: 'flex', gap: 12,
        }}>
          <span>{dataset.row_count?.toLocaleString()} rows</span>
          <span>·</span>
          <span>{dataset.col_count} columns</span>
          <span>·</span>
          <span>{fmtBytes(dataset.size_bytes)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Ghost btn ─────────────────────────────────────────────────────
function GhostBtn({ children, onClick, danger, small }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: small ? '5px 10px' : '7px 13px',
        borderRadius: 8, border: `1px solid ${hov
          ? (danger ? C.redBd : C.borderHov)
          : C.border}`,
        background: hov ? (danger ? C.redBg : '#f9fafb') : C.card,
        color: hov ? (danger ? C.red : C.text) : C.textSub,
        cursor: 'pointer', fontSize: 12, fontWeight: 500,
        transition: 'all 0.15s', fontFamily: FONT,
      }}
    >
      {children}
    </button>
  )
}

// ── Primary btn ───────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 9,
        background: disabled ? '#f3f4f6' : hov ? '#4f46e5' : C.accent,
        border: 'none', color: disabled ? C.textDim : '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 600,
        transition: 'all 0.15s', fontFamily: FONT,
        boxShadow: disabled ? 'none' : hov
          ? '0 4px 12px rgba(99,102,241,0.3)'
          : '0 2px 8px rgba(99,102,241,0.2)',
      }}
    >
      {children}
    </button>
  )
}

// ── Dashboard row ─────────────────────────────────────────────────
function DashboardRow({ dashboard, onOpen, onDelete }) {
  const [hov,    setHov]    = useState(false)
  const [delHov, setDelHov] = useState(false)

  const SCHEME_COLORS = {
    'Metric Flow':  '#6366f1',
    'Neon Dark':    '#10b981',
    'Ocean Blue':   '#3b82f6',
    'Solar Gold':   '#f59e0b',
    'Rose Quartz':  '#ec4899',
    'Cyberpunk':    '#8b5cf6',
  }
  const accent = SCHEME_COLORS[dashboard.scheme] || C.accent
  const widgetCount = dashboard.layout?.widgets?.length || 0

  return (
    <div
      onClick={() => onOpen(dashboard.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: hov ? '#fafafa' : C.card,
        borderBottom: `1px solid ${C.border}`,
        cursor: 'pointer', transition: 'background 0.12s',
        position: 'relative',
      }}
    >
      {/* Color dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: accent, flexShrink: 0,
        boxShadow: hov ? `0 0 0 3px ${accent}22` : 'none',
        transition: 'box-shadow 0.15s',
      }} />

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>{dashboard.name}</div>
        {dashboard.description && (
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {dashboard.description}
          </div>
        )}
      </div>

      {/* Widget count */}
      <div style={{
        fontSize: 11, color: C.textDim, whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <LayoutDashboard size={11} strokeWidth={1.6} />
        {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
      </div>

      {/* Updated */}
      <div style={{
        fontSize: 11, color: C.textDim, whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 4, minWidth: 70,
      }}>
        <Calendar size={11} strokeWidth={1.6} />
        {fmtAge(dashboard.updated_at)}
      </div>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(dashboard.id) }}
        onMouseEnter={() => setDelHov(true)}
        onMouseLeave={() => setDelHov(false)}
        style={{
          width: 26, height: 26, borderRadius: 7,
          background: delHov ? C.redBg : 'transparent',
          border: `1px solid ${delHov ? C.redBd : 'transparent'}`,
          color: delHov ? C.red : C.textDim,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
          opacity: hov ? 1 : 0,
        }}
      >
        <Trash2 size={11} strokeWidth={1.8} />
      </button>

      {/* Arrow */}
      <ChevronRight size={14} strokeWidth={1.8}
        style={{ color: hov ? C.accent : C.textDim, transition: 'color 0.15s', flexShrink: 0 }} />
    </div>
  )
}

// ── Empty dashboards ──────────────────────────────────────────────
function DashboardsEmptyState({ hasDataset, onCreate }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', textAlign: 'center', fontFamily: FONT,
    }}>
      {/* Offset collage */}
      <div style={{ position: 'relative', width: 100, height: 80, marginBottom: 28 }}>
        {[
          { icon: LayoutDashboard, top: 0,  left: 0,  size: 44, color: C.accentBg, bd: C.accentBd, ic: C.accent },
          { icon: Database,        top: 28, left: 40, size: 36, color: C.greenBg,  bd: C.greenBd,  ic: C.green  },
          { icon: MessageSquare,   top: 6,  left: 66, size: 30, color: C.amberBg,  bd: C.amberBd,  ic: C.amber  },
        ].map(({ icon: Icon, top, left, size, color, bd, ic }, i) => (
          <div key={i} style={{
            position: 'absolute', top, left,
            width: size, height: size, borderRadius: size * 0.27,
            background: color, border: `1px solid ${bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <Icon size={size * 0.44} strokeWidth={1.5} style={{ color: ic }} />
          </div>
        ))}
      </div>

      <h3 style={{
        fontSize: 17, fontWeight: 700, color: C.text,
        letterSpacing: '-0.02em', margin: '0 0 8px',
      }}>No dashboards yet</h3>
      <p style={{
        fontSize: 12, color: C.textSub, maxWidth: 280,
        lineHeight: 1.6, margin: '0 0 24px',
      }}>
        {hasDataset
          ? 'Create your first dashboard to start visualizing your data.'
          : 'Upload a dataset first, then create dashboards to visualize it.'}
      </p>
      {hasDataset && <PrimaryBtn onClick={onCreate}><Plus size={14} strokeWidth={2.5} /> Create Dashboard</PrimaryBtn>}
    </div>
  )
}

// ── Upload zone ───────────────────────────────────────────────────
function UploadZone({ onFile, uploading, uploadPct, uploadErr, dragOver, setDragOver, fileRef }) {
  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onFile(Array.from(e.dataTransfer.files)?.[0]) }}
      style={{
        border: `2px dashed ${dragOver ? C.accent : C.accentBd}`,
        borderRadius: 14, padding: '40px 24px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'all 0.15s',
        background: dragOver ? C.accentBg : 'transparent',
        maxWidth: 560, fontFamily: FONT,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: dragOver ? C.accent : C.accentBg,
        border: `1px solid ${dragOver ? C.accent : C.accentBd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        <Upload size={22} strokeWidth={1.6}
          style={{ color: dragOver ? '#fff' : C.accent }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {uploading ? `Uploading… ${uploadPct}%` : 'Drop your file here'}
        </div>
        <div style={{ fontSize: 12, color: C.textSub }}>
          or click to browse · CSV, Excel, JSON, TSV, Parquet · Max 100 MB
        </div>
      </div>

      {uploading && (
        <div style={{
          width: '100%', maxWidth: 280, height: 4,
          background: '#f3f4f6', borderRadius: 99, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${uploadPct}%`,
            background: `linear-gradient(90deg, ${C.accent}, #818cf8)`,
            borderRadius: 99, transition: 'width 0.3s',
          }} />
        </div>
      )}

      {uploadErr && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 8,
          background: C.redBg, border: `1px solid ${C.redBd}`,
          fontSize: 12, color: C.red,
        }}>
          <AlertTriangle size={13} strokeWidth={2} />
          {uploadErr}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function ProjectDetail({ onNavigate }) {
  const { projectId } = useParams()
  const navigate      = useNavigate()

  const [project,    setProject]    = useState(null)
  const [dataset,    setDataset]    = useState(null)
  const [dashboards, setDashboards] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [uploadErr,  setUploadErr]  = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const [showSchema, setShowSchema] = useState(false)

  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, dsr, dbr] = await Promise.all([
        projectsApi.get(projectId),
        datasetsApi.list(projectId),
        dashboardsApi.list(projectId),
      ])
      setProject(pr.data)
      setDataset(dsr.data?.[0] || null)
      setDashboards(dbr.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const allowed = ['.csv', '.tsv', '.xlsx', '.xls', '.json', '.parquet']
    if (!allowed.includes(ext)) { setUploadErr(`Unsupported type: ${ext}`); return }
    if (file.size > 100 * 1024 * 1024) { setUploadErr('File too large (max 100 MB).'); return }
    setUploadErr(''); setUploading(true); setUploadPct(0)
    try {
      const r = await datasetsApi.upload(projectId, file,
        e => setUploadPct(Math.round((e.loaded / e.total) * 100)))
      setDataset(r.data); setUploadPct(100)
    } catch (e) {
      setUploadErr(e?.response?.data?.detail || 'Upload failed.')
    } finally { setUploading(false) }
  }, [projectId])

  const handleFileChange = e => { handleFile(e.target.files?.[0]); e.target.value = '' }

  const handleDeleteDataset = async () => {
    if (!dataset) return
    if (!confirm('Delete this dataset? All dashboard data will be lost.')) return
    await datasetsApi.delete(dataset.id).catch(() => {})
    setDataset(null); setDashboards([])
  }

  const handleDeleteDashboard = async (id) => {
    if (!confirm('Delete this dashboard?')) return
    await dashboardsApi.delete(id).catch(() => {})
    setDashboards(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: C.textSub, fontSize: 13, fontFamily: FONT }}>
      Loading project…
    </div>
  )

  if (!project) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', color: C.textSub, fontSize: 13, fontFamily: FONT }}>
      Project not found.
    </div>
  )

  return (
    <div style={{
      minHeight: '100%', background: C.pageBg,
      overflowY: 'auto', fontFamily: FONT,
    }}>

      {/* ── Glassmorphic sticky header ──────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 36px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {/* Back */}
        <button
          onClick={() => navigate('/projects')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textSub, cursor: 'pointer', fontSize: 12,
            transition: 'all 0.15s', fontFamily: FONT,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub }}
        >
          <ArrowLeft size={13} strokeWidth={2} /> Projects
        </button>

        <span style={{ color: C.border, fontSize: 16 }}>/</span>

        {/* Project icon + name */}
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${project.color || C.accent}14`,
          border: `1px solid ${project.color || C.accent}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
        }}>
          {project.icon || '📊'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: 17, fontWeight: 800, color: C.text,
            letterSpacing: '-0.03em', margin: 0, lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{project.name}</h1>
          {project.description && (
            <p style={{ fontSize: 11, color: C.textSub, margin: '2px 0 0',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.description}
            </p>
          )}
        </div>

        {/* Header controls — dataset + new dashboard */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {dataset && (
            <>
              <GhostBtn small onClick={() => setShowSchema(true)}>
                <Eye size={12} strokeWidth={1.8} /> Schema
              </GhostBtn>
              <GhostBtn small onClick={() => fileRef.current?.click()}>
                <RefreshCw size={12} strokeWidth={1.8} /> Replace
              </GhostBtn>
              <GhostBtn small danger onClick={handleDeleteDataset}>
                <Trash2 size={12} strokeWidth={1.8} /> Delete Dataset
              </GhostBtn>
              <div style={{ width: 1, height: 20, background: C.border }} />
            </>
          )}
          <PrimaryBtn
            onClick={() => navigate(`/projects/${projectId}/dashboards/new`)}
            disabled={!dataset}
          >
            <Plus size={14} strokeWidth={2.5} /> New Dashboard
          </PrimaryBtn>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────── */}
      <div style={{ padding: '32px 36px 60px' }}>

        {/* ── Dataset section ──────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.textDim,
            textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 14,
          }}>
            Dataset · {dataset ? '1 file' : 'no file uploaded'}
          </div>

          {!dataset ? (
            <UploadZone
              onFile={handleFile}
              uploading={uploading}
              uploadPct={uploadPct}
              uploadErr={uploadErr}
              dragOver={dragOver}
              setDragOver={setDragOver}
              fileRef={fileRef}
            />
          ) : (
            /* Compact dataset card */
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14, maxWidth: 600,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: C.greenBg, border: `1px solid ${C.greenBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileSpreadsheet size={20} strokeWidth={1.6} style={{ color: C.green }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: C.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>{dataset.file_name}</div>
                <div style={{
                  display: 'flex', gap: 10, marginTop: 4,
                  fontSize: 11, color: C.textSub,
                }}>
                  <span>{dataset.row_count?.toLocaleString()} rows</span>
                  <span>·</span>
                  <span>{dataset.col_count} cols</span>
                  <span>·</span>
                  <span>{fmtBytes(dataset.size_bytes)}</span>
                </div>
              </div>

              {/* Status badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 99,
                background: C.greenBg, border: `1px solid ${C.greenBd}`,
                fontSize: 11, fontWeight: 600, color: C.green, flexShrink: 0,
              }}>
                <CheckCircle size={11} strokeWidth={2} />
                Loaded
              </div>
            </div>
          )}
        </section>

        {/* ── Dashboards section ───────────────────────── */}
        <section>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16,
          }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.textDim,
                textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2,
              }}>
                Dashboards · {dashboards.length}
              </div>
              {!dataset && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 11, color: C.amber,
                }}>
                  <AlertTriangle size={11} strokeWidth={2} />
                  Upload a dataset to create dashboards
                </div>
              )}
            </div>
          </div>

          {dashboards.length === 0 ? (
            <DashboardsEmptyState
              hasDataset={!!dataset}
              onCreate={() => navigate(`/projects/${projectId}/dashboards/new`)}
            />
          ) : (
            /* Ultra-minimalist list */
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              maxWidth: 760,
            }}>
              {/* List header */}
              <div style={{
                display: 'flex', gap: 14,
                padding: '10px 18px',
                background: '#f9fafb',
                borderBottom: `1px solid ${C.border}`,
                fontSize: 10, fontWeight: 700, color: C.textDim,
                textTransform: 'uppercase', letterSpacing: '0.07em',
              }}>
                <div style={{ width: 8 }} />
                <div style={{ flex: 1 }}>Name</div>
                <div style={{ minWidth: 80 }}>Widgets</div>
                <div style={{ minWidth: 70 }}>Updated</div>
                <div style={{ width: 52 }} />
              </div>

              {dashboards.map(d => (
                <DashboardRow
                  key={d.id}
                  dashboard={d}
                  onOpen={id => navigate(`/projects/${projectId}/dashboards/${id}`)}
                  onDelete={handleDeleteDashboard}
                />
              ))}

              {/* Add row */}
              {dataset && (
                <AddDashboardRow
                  onClick={() => navigate(`/projects/${projectId}/dashboards/new`)}
                />
              )}
            </div>
          )}
        </section>
      </div>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept={ACCEPT}
        style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Schema modal */}
      {showSchema && dataset && (
        <SchemaModal dataset={dataset} onClose={() => setShowSchema(false)} />
      )}
    </div>
  )
}

// ── Add dashboard row ─────────────────────────────────────────────
function AddDashboardRow({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px',
        background: hov ? C.accentBg : 'transparent',
        cursor: 'pointer', transition: 'background 0.12s',
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: hov ? C.accent : C.accentBg,
        border: `1px solid ${hov ? C.accent : C.accentBd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        <Plus size={12} strokeWidth={2.5}
          style={{ color: hov ? '#fff' : C.accent }} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: hov ? C.accent : C.textDim,
        transition: 'color 0.15s',
      }}>New Dashboard</span>
    </div>
  )
}