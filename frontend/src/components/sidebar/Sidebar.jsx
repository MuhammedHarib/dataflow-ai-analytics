// src/components/sidebar/Sidebar.jsx
// Design: "Refined Monochrome Pro"
// FIXES: useEffect async pattern fixed, no Google Fonts (offline-safe)

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3,
  MessageSquare,
  LayoutGrid,
  LayoutDashboard,
  ChevronRight,
  Plus,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Pin,
  Hash,
  HelpCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/client'

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  rail:        '#0f1117',
  railBorder:  'rgba(255,255,255,0.055)',
  railIcon:    'rgba(255,255,255,0.32)',
  railIconHov: 'rgba(255,255,255,0.68)',
  railActive:  '#6366f1',
  railActiveIc:'#ffffff',

  panel:       '#ffffff',
  panelBorder: '#ebebed',
  text:        '#0f1117',
  textSub:     '#6b7280',
  textDim:     '#a1a1aa',
  rowHov:      '#f4f4f6',
  rowActive:   '#eef2ff',
  rowActiveTx: '#4338ca',
  rowActiveBd: '#6366f1',
  accent:      '#6366f1',
  accentLight: '#eef2ff',
  accentBd:    '#c7d2fe',
  divider:     '#f0f0f2',
}

// Offline-safe font stack — no network request needed
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

const RAIL_W  = 54
const PANEL_W = 232

// ─── Rail button ──────────────────────────────────────────────────
function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={tooltip}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 36, height: 36, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0,
        background: active ? C.railActive : hov ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: active ? C.railActiveIc : hov ? C.railIconHov : C.railIcon,
        transition: 'background 0.15s, color 0.15s, transform 0.1s',
        transform: hov && !active ? 'scale(1.08)' : 'scale(1)',
        fontFamily: FONT,
      }}
    >
      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
    </button>
  )
}

// ─── Panel row ────────────────────────────────────────────────────
function PanelRow({ icon: Icon, label, active, onClick, depth = 0, badge, dim, indent }) {
  const [hov, setHov] = useState(false)
  const pl = 12 + (depth * 14) + (indent ? 10 : 0)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 5, paddingBottom: 5,
        paddingLeft: pl, paddingRight: 10,
        borderRadius: 8, cursor: 'pointer', userSelect: 'none', textAlign: 'left',
        border: 'none', marginBottom: 1, position: 'relative',
        background: active ? C.rowActive : hov ? C.rowHov : 'transparent',
        color: active ? C.rowActiveTx : dim ? C.textDim : C.text,
        transition: 'background 0.12s, color 0.12s',
        fontFamily: FONT,
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '18%', bottom: '18%',
          width: 3, borderRadius: '0 3px 3px 0', background: C.rowActiveBd,
        }} />
      )}
      {Icon && (
        <Icon size={13} strokeWidth={active ? 2.2 : 1.7}
          style={{ flexShrink: 0, opacity: active ? 1 : dim ? 0.4 : 0.65 }} />
      )}
      <span style={{
        fontSize: 13, fontWeight: active ? 600 : dim ? 400 : 500,
        lineHeight: 1.3, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.textDim,
          background: C.rowHov, borderRadius: 99, padding: '1px 7px',
          border: `1px solid ${C.divider}`,
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────
function SectionHd({ icon: Icon, label, open, onToggle, onAdd }) {
  const [hov,    setHov]    = useState(false)
  const [addHov, setAddHov] = useState(false)
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px 4px 12px', borderRadius: 6,
        cursor: 'pointer', userSelect: 'none', marginBottom: 1,
        background: hov ? C.rowHov : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <ChevronRight size={11} style={{
        color: C.textDim, flexShrink: 0,
        transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }} />
      {Icon && <Icon size={11} strokeWidth={2} style={{ color: C.textDim, flexShrink: 0 }} />}
      <span style={{
        fontSize: 10, fontWeight: 600, color: C.textDim,
        textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1,
        fontFamily: FONT,
      }}>{label}</span>
      {onAdd && (
        <button
          onClick={e => { e.stopPropagation(); onAdd() }}
          onMouseEnter={() => setAddHov(true)}
          onMouseLeave={() => setAddHov(false)}
          style={{
            width: 18, height: 18, borderRadius: 5, border: 'none',
            background: addHov ? C.accentLight : 'transparent',
            color: addHov ? C.accent : C.textDim,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0,
            fontFamily: FONT,
          }}
        >
          <Plus size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Project node ─────────────────────────────────────────────────
function ProjectNode({ project, activePage }) {
  const navigate = useNavigate()
  const [open,      setOpen]      = useState(false)
  const [openDash,  setOpenDash]  = useState(false)
  const [openChats, setOpenChats] = useState(false)
  const [summary,   setSummary]   = useState(null)
  const [hov,       setHov]       = useState(false)
  const isActive = activePage?.projectId === project.id

  // ✅ FIX: no async useEffect — wrap fetch in inner function
  useEffect(() => {
    if (!open || summary) return
    let cancelled = false
    projectsApi.summary(project.id)
      .then(r => { if (!cancelled) setSummary(r.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, project.id, summary])

  useEffect(() => {
    if (isActive && !open) setOpen(true)
  }, [isActive])

  return (
    <div style={{ marginBottom: 1 }}>
      <button
        onClick={() => { setOpen(o => !o); navigate(`/projects/${project.id}`) }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '6px 10px 6px 12px', borderRadius: 8,
          cursor: 'pointer', userSelect: 'none', textAlign: 'left',
          border: 'none', position: 'relative',
          background: isActive ? C.rowActive : hov ? C.rowHov : 'transparent',
          transition: 'background 0.12s',
          fontFamily: FONT,
        }}
      >
        {isActive && (
          <span style={{
            position: 'absolute', left: 0, top: '18%', bottom: '18%',
            width: 3, borderRadius: '0 3px 3px 0',
            background: project.color || C.accent,
          }} />
        )}
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: project.color || C.accent,
          transition: 'box-shadow 0.15s',
          boxShadow: isActive ? `0 0 0 2.5px ${C.accentLight}` : 'none',
        }} />
        <span style={{
          fontSize: 13, fontWeight: isActive ? 600 : 500,
          color: isActive ? C.rowActiveTx : C.text,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}>{project.name}</span>
        <ChevronRight size={11} style={{
          color: C.textDim, flexShrink: 0,
          transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }} />
      </button>

      {open && (
        <div style={{
          marginLeft: 20, paddingLeft: 10,
          borderLeft: `1px solid ${C.divider}`,
          marginTop: 2, marginBottom: 4,
        }}>
          {/* Dashboards */}
          <SectionHd
            icon={LayoutDashboard} label="Dashboards"
            open={openDash} onToggle={() => setOpenDash(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/dashboards/new`)}
          />
          {openDash && (
            <>
              {summary?.dashboards?.length
                ? summary.dashboards.map(d => (
                    <PanelRow key={d.id} icon={d.is_pinned ? Pin : Hash}
                      label={d.name} depth={0} indent
                      active={activePage?.view === 'dashboard' && Number(activePage?.dashboardId) === d.id}
                      onClick={() => navigate(`/projects/${project.id}/dashboards/${d.id}`)} />
                  ))
                : <p style={{ fontSize: 11, color: C.textDim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No dashboards</p>
              }
              <PanelRow icon={Plus} label="New dashboard" depth={0} indent dim
                onClick={() => navigate(`/projects/${project.id}/dashboards/new`)} />
            </>
          )}

          {/* Chats */}
          <SectionHd
            icon={MessageSquare} label="Chats"
            open={openChats} onToggle={() => setOpenChats(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/chat`)}
          />
          {openChats && (
            <>
              {summary?.chats?.length
                ? summary.chats.slice(0, 5).map(c => (
                    <PanelRow key={c.id} icon={Hash}
                      label={c.title || 'Untitled'} depth={0} indent
                      active={activePage?.view === 'project-chat' && Number(activePage?.chatId) === c.id}
                      onClick={() => navigate(`/projects/${project.id}/chat/${c.id}`)} />
                  ))
                : <p style={{ fontSize: 11, color: C.textDim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No chats</p>
              }
              <PanelRow icon={Plus} label="New chat" depth={0} indent dim
                onClick={() => navigate(`/projects/${project.id}/chat`)} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────
const Divider = () => (
  <div style={{ height: 1, background: C.divider, margin: '6px 14px' }} />
)

// ─── Root export ──────────────────────────────────────────────────
export default function Sidebar({ collapsed, onCollapse, activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  // ✅ FIX: synchronous wrapper, no async useEffect
  const load = () => {
    setLoading(true)
    projectsApi.list()
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, []) // ✅ no return value — safe

  useEffect(() => {
    if (location.pathname === '/projects') load()
  }, [location.pathname]) // ✅ no return value — safe

  const isChat     = location.pathname === '/'
  const isProjects = location.pathname === '/projects'

  return (
    <div style={{ display: 'flex', height: '100vh', flexShrink: 0, fontFamily: FONT }}>

      {/* ── RAIL ─────────────────────────────────────────────── */}
      <div style={{
        width: RAIL_W, minWidth: RAIL_W,
        background: C.rail,
        borderRight: `1px solid ${C.railBorder}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14, paddingBottom: 12,
        gap: 2, zIndex: 2, flexShrink: 0,
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            width: 32, height: 32, borderRadius: 9, marginBottom: 14,
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 14px rgba(99,102,241,0.4)',
          }}
        >
          <BarChart3 size={16} strokeWidth={2.4} style={{ color: '#fff' }} />
        </div>

        <RailBtn icon={MessageSquare} active={isChat}     onClick={() => navigate('/')}         tooltip="AI Workspace" />
        <RailBtn icon={LayoutGrid}    active={isProjects} onClick={() => navigate('/projects')} tooltip="Projects" />

        <div style={{ flex: 1 }} />

        <RailBtn icon={HelpCircle} active={false} onClick={() => {}} tooltip="Help" />
        <RailBtn icon={Settings}   active={false} onClick={() => {}} tooltip="Settings" />

        {/* Collapse toggle */}
        <button
          onClick={onCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            width: 28, height: 28, borderRadius: 7, marginTop: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.28)', cursor: 'pointer', outline: 'none',
            transition: 'all 0.15s', fontFamily: FONT,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.28)'
          }}
        >
          {collapsed
            ? <ChevronsRight size={13} strokeWidth={2} />
            : <ChevronsLeft  size={13} strokeWidth={2} />
          }
        </button>
      </div>

      {/* ── WHITE PANEL ──────────────────────────────────────── */}
      <div style={{
        width:    collapsed ? 0 : PANEL_W,
        minWidth: collapsed ? 0 : PANEL_W,
        background: C.panel,
        borderRight: collapsed ? 'none' : `1px solid ${C.panelBorder}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        zIndex: 1,
      }}>
        {!collapsed && (
          <>
            {/* Brand */}
            <div style={{
              padding: '18px 16px 14px',
              borderBottom: `1px solid ${C.divider}`,
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: C.text, letterSpacing: '-0.03em', lineHeight: 1,
                fontFamily: FONT,
              }}>DataFlow</div>
              <div style={{
                fontSize: 10, fontWeight: 500,
                color: C.textDim, letterSpacing: '0.09em',
                marginTop: 3, textTransform: 'uppercase',
                fontFamily: FONT,
              }}>AI Analytics</div>
            </div>

            {/* Top nav */}
            <div style={{ padding: '10px 8px 6px', flexShrink: 0 }}>
              <PanelRow icon={MessageSquare} label="AI Workspace" active={isChat}     onClick={() => navigate('/')} />
              <PanelRow icon={LayoutGrid}    label="Projects"     active={isProjects} onClick={() => navigate('/projects')} />
            </div>

            <Divider />

            {/* Section label */}
            <div style={{ padding: '4px 14px 6px', flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.textDim,
                textTransform: 'uppercase', letterSpacing: '0.09em',
                fontFamily: FONT,
              }}>Projects</span>
            </div>

            {/* Scrollable tree */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '0 8px 8px',
              scrollbarWidth: 'thin', scrollbarColor: `${C.divider} transparent`,
            }}>
              {loading
                ? <p style={{ fontSize: 12, color: C.textDim, padding: '8px 12px', margin: 0, fontFamily: FONT }}>Loading…</p>
                : projects.length === 0
                  ? <p style={{ fontSize: 12, color: C.textDim, padding: '8px 12px', lineHeight: 1.7, margin: 0, fontFamily: FONT }}>
                      No projects yet.<br />Create your first one.
                    </p>
                  : projects.map(p => (
                      <ProjectNode key={p.id} project={p} activePage={activePage} />
                    ))
              }

              {/* New project */}
              <button
                onClick={() => navigate('/projects')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 8, marginTop: 8,
                  border: `1.5px dashed ${C.accentBd}`,
                  background: 'transparent', cursor: 'pointer',
                  color: C.accent, transition: 'all 0.15s', fontFamily: FONT,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background  = C.accentLight
                  e.currentTarget.style.borderColor = C.accent
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = 'transparent'
                  e.currentTarget.style.borderColor = C.accentBd
                }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>New Project</span>
              </button>
            </div>

            <Divider />

            {/* Bottom */}
            <div style={{ padding: '4px 8px 10px', flexShrink: 0 }}>
              <PanelRow icon={Settings} label="Settings" active={false} onClick={() => {}} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}