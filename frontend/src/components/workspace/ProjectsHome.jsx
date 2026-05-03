// src/components/workspace/ProjectsHome.jsx
// Light theme redesign — white cards, #F7F7F8 bg, indigo accents
// Lucide icons throughout, no emoji stats
// Maintains all original logic intact

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Database,
  Plus, Trash2, FolderOpen, ArrowRight,
} from 'lucide-react'
import { projectsApi } from '../../api/client'
import NewProjectModal from './NewProjectModal'

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
  red:       '#ef4444',
  redBg:     '#fef2f2',
  redBd:     '#fecaca',
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// ── Skeleton card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {[80, 120, 60, 40].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 18 : 13,
          width: w, borderRadius: 6,
          background: '#f3f4f6',
          marginBottom: i < 3 ? 12 : 0,
          animation: 'df-pulse 1.5s ease infinite',
        }} />
      ))}
      <style>{`@keyframes df-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, color: C.textSub,
    }}>
      <Icon size={12} strokeWidth={1.6} style={{ color: C.textDim, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, color: C.text }}>{value ?? 0}</span>
      <span>{label}</span>
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────
function ProjectCard({ project, onOpen, onDelete }) {
  const [hov,    setHov]    = useState(false)
  const [delHov, setDelHov] = useState(false)

  const age    = Math.floor((Date.now() - new Date(project.updated_at)) / 86400000)
  const ageStr = age === 0 ? 'Today' : age === 1 ? 'Yesterday' : `${age}d ago`

  return (
    <div
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.card,
        border: `1px solid ${hov ? C.accentBd : C.border}`,
        borderRadius: 16, padding: 24,
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        boxShadow: hov
          ? '0 8px 24px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
        fontFamily: FONT,
      }}
    >
      {/* Subtle left accent bar on hover */}
      <div style={{
        position: 'absolute', left: 0, top: '15%', bottom: '15%',
        width: 3, borderRadius: '0 3px 3px 0',
        background: project.color || C.accent,
        opacity: hov ? 1 : 0,
        transition: 'opacity 0.18s',
      }} />

      {/* Delete button */}
      {hov && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id) }}
          onMouseEnter={() => setDelHov(true)}
          onMouseLeave={() => setDelHov(false)}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, borderRadius: 8,
            background: delHov ? C.redBg : 'transparent',
            border: `1px solid ${delHov ? C.redBd : C.border}`,
            color: delHov ? C.red : C.textDim,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          <Trash2 size={12} strokeWidth={1.8} />
        </button>
      )}

      {/* Project icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, marginBottom: 16,
        background: `${project.color || C.accent}14`,
        border: `1px solid ${project.color || C.accent}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {project.icon || '📊'}
      </div>

      {/* Name */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: C.text,
        marginBottom: 4, lineHeight: 1.3,
        letterSpacing: '-0.02em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{project.name}</div>

      {/* Description */}
      {project.description && (
        <div style={{
          fontSize: 12, color: C.textSub, lineHeight: 1.55,
          marginBottom: 16,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{project.description}</div>
      )}

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 14,
        marginTop: project.description ? 0 : 16,
        paddingTop: 14,
        borderTop: `1px solid ${C.border}`,
      }}>
        <StatPill icon={LayoutDashboard} value={project.dashboard_count} label="dashboards" />
        <StatPill icon={MessageSquare}   value={project.chat_count}      label="chats" />
        <StatPill icon={Database}        value={project.dataset_count}   label="datasets" />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 12,
      }}>
        <span style={{ fontSize: 11, color: C.textDim }}>Updated {ageStr}</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600,
          color: hov ? C.accent : C.textDim,
          transition: 'color 0.15s',
        }}>
          Open <ArrowRight size={11} strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px', textAlign: 'center',
      fontFamily: FONT,
    }}>
      {/* Offset icon collage */}
      <div style={{ position: 'relative', width: 100, height: 80, marginBottom: 28 }}>
        {[
          { icon: LayoutDashboard, top: 0,  left: 0,  size: 40, color: C.accentBg, bd: C.accentBd, ic: C.accent },
          { icon: Database,        top: 24, left: 36, size: 36, color: '#f0fdf4',  bd: '#bbf7d0',  ic: '#059669' },
          { icon: MessageSquare,   top: 4,  left: 62, size: 32, color: '#fef9ec',  bd: '#fde68a',  ic: '#d97706' },
        ].map(({ icon: Icon, top, left, size, color, bd, ic }, i) => (
          <div key={i} style={{
            position: 'absolute', top, left,
            width: size, height: size, borderRadius: size * 0.28,
            background: color, border: `1px solid ${bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <Icon size={size * 0.44} strokeWidth={1.5} style={{ color: ic }} />
          </div>
        ))}
      </div>

      <h2 style={{
        fontSize: 20, fontWeight: 700, color: C.text,
        letterSpacing: '-0.03em', margin: '0 0 8px',
      }}>No projects yet</h2>
      <p style={{
        fontSize: 13, color: C.textSub,
        maxWidth: 320, lineHeight: 1.6, margin: '0 0 24px',
      }}>
        Create your first project to start uploading datasets,
        building dashboards, and querying your data with AI.
      </p>
      <NewBtn onClick={onCreate} label="Create First Project" large />
    </div>
  )
}

// ── New project button ────────────────────────────────────────────
function NewBtn({ onClick, label = '+ New Project', large }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: large ? '12px 28px' : '9px 18px',
        borderRadius: 10,
        background: hov ? C.accent : C.accentBg,
        border: `1px solid ${hov ? C.accent : C.accentBd}`,
        color: hov ? '#ffffff' : C.accent,
        cursor: 'pointer',
        fontSize: large ? 14 : 13, fontWeight: 600,
        transition: 'all 0.15s', fontFamily: FONT,
        letterSpacing: '-0.01em',
      }}
    >
      <Plus size={large ? 16 : 14} strokeWidth={2.5} />
      {label}
    </button>
  )
}

// ── New project add card ──────────────────────────────────────────
function AddCard({ onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.accentBg : 'transparent',
        border: `1.5px dashed ${hov ? C.accent : C.accentBd}`,
        borderRadius: 16, padding: 24, minHeight: 160,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 8, transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: hov ? C.accent : C.accentBg,
        border: `1px solid ${hov ? C.accent : C.accentBd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        <Plus size={16} strokeWidth={2.5}
          style={{ color: hov ? '#fff' : C.accent }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: hov ? C.accent : C.textDim, transition: 'color 0.15s' }}>
        New Project
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function ProjectsHome() {
  const navigate = useNavigate()
  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    setLoading(true)
    projectsApi.list()
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (data) => {
    const r = await projectsApi.create(data)
    setShowModal(false)
    navigate(`/projects/${r.data.id}`)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its data?')) return
    await projectsApi.delete(id)
    load()
  }

  return (
    <div style={{
      padding: '40px 40px 60px',
      minHeight: '100%',
      background: C.pageBg,
      overflowY: 'auto',
      fontFamily: FONT,
    }}>

      {/* ── Page header ──────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 36,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <FolderOpen size={22} strokeWidth={1.5} style={{ color: C.textDim }} />
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: C.text,
              letterSpacing: '-0.04em', margin: 0, lineHeight: 1,
            }}>Projects</h1>
          </div>
          <p style={{ fontSize: 13, color: C.textSub, margin: 0, lineHeight: 1.5 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} ·
            Each project has its own dataset, dashboards and chat history
          </p>
        </div>
        {!loading && projects.length > 0 && (
          <NewBtn onClick={() => setShowModal(true)} />
        )}
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onCreate={() => setShowModal(true)} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id} project={p}
              onOpen={id => navigate(`/projects/${id}`)}
              onDelete={handleDelete}
            />
          ))}
          <AddCard onClick={() => setShowModal(true)} />
        </div>
      )}

      {showModal && (
        <NewProjectModal
          onConfirm={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}