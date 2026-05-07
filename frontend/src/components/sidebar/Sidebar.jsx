// src/components/sidebar/Sidebar.jsx
// Design: Indigo rail (#6366f1) + white panel
// Active rail item: white pill bleeding to right edge with
// inverted concave corners (box-shadow pseudo-element trick)

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

// ─── Dimensions ───────────────────────────────────────────────────
const RAIL_W  = 64
const PANEL_W = 232

// ─── Design tokens ────────────────────────────────────────────────
const RAIL_BG   = '#6366f1'   // indigo rail background
const PANEL_BG  = '#ffffff'   // white panel
const DIVIDER   = '#ebebed'
const FONT      = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

const C = {
  // Rail
  railBg:      RAIL_BG,
  railIcon:    'rgba(255,255,255,0.55)',
  railIconHov: 'rgba(255,255,255,0.90)',
  railActive:  '#ffffff',   // active icon bg = white

  // Panel
  panel:       PANEL_BG,
  panelBorder: DIVIDER,
  text:        '#0f1117',
  textSub:     '#6b7280',
  textDim:     '#a1a1aa',
  rowHov:      '#eef2ff',
  rowHovTx:    '#4338ca',
  rowActive:   '#6366f1',
  rowActiveTx: '#ffffff',
  accent:      '#6366f1',
  accentLight: '#eef2ff',
  accentBd:    '#c7d2fe',
  divider:     DIVIDER,
}

// ─── Injected CSS for the inverted-radius effect ──────────────────
// The trick:
//   .rail-item-active — white bg, right-flush, no border-radius on right side
//   .rail-item-active::before / ::after — small circles positioned above and
//   below the active block, colored with a box-shadow in the RAIL color to
//   create the illusion of a concave "bite" cut from the rail
const RAIL_CSS = `
  /* Base rail item */
  .rail-item {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 48px;
    cursor: pointer;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.55);
    transition: color 0.15s, background 0.15s;
    z-index: 1;
    padding: 0;
    outline: none;
    flex-shrink: 0;
  }

  .rail-item:hover:not(.rail-item-active) {
    color: rgba(255,255,255,0.90);
  }

  .rail-item:hover:not(.rail-item-active) .rail-icon-wrap {
    background: rgba(255,255,255,0.12);
    transform: scale(1.06);
  }

  /* The white icon pill (non-active) */
  .rail-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, transform 0.12s;
  }

  /* ── Active state ─────────────────────────────────────────────── */
  /* The active item extends its white bg flush to the right edge.
     Border-radius only on the LEFT side (top-left, bottom-left).
     Right side is flat so it merges with the white panel. */

  .rail-item-active {
    color: ${RAIL_BG} !important;
    /* Extend to right edge — negative right margin + extra width */
    width: calc(100% + 1px);
    margin-right: -1px;
    justify-content: center;
  }

  .rail-item-active .rail-icon-wrap {
    background: transparent !important;
    transform: none !important;
    /* Icon itself turns indigo */
    color: ${RAIL_BG};
  }

  /* White block — flush right, rounded left only */
  .rail-item-active::before {
    content: '';
    position: absolute;
    inset: 4px -1px 4px 10px;   /* top right bottom left */
    background: #ffffff;
    border-radius: 12px 0 0 12px;
    z-index: -1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  /* Concave corner ABOVE the active item
     A circle positioned above, with a box-shadow in the RAIL color
     that fills the corner gap — creating the illusion of a carved curve */
  .rail-item-active-above::after {
    content: '';
    position: absolute;
    bottom: -16px;
    right: -1px;
    width: 20px;
    height: 20px;
    background: transparent;
    border-radius: 0 0 0 0;
    /* The box-shadow color must exactly match the rail background */
    box-shadow: 6px 6px 0 6px ${RAIL_BG};
    z-index: 2;
    pointer-events: none;
  }

  .rail-item-active-below::before {
    content: '';
    position: absolute;
    top: -16px;
    right: -1px;
    width: 20px;
    height: 20px;
    background: transparent;
    box-shadow: 6px -6px 0 6px ${RAIL_BG};
    z-index: 2;
    pointer-events: none;
  }

  /* Concave corner on the ACTIVE item itself:
     top-right and bottom-right corners get a concave cut */
  .rail-item-active-top-cut::after {
    content: '';
    position: absolute;
    top: -16px;
    right: -1px;
    width: 20px;
    height: 20px;
    background: transparent;
    box-shadow: 6px 6px 0 6px #ffffff;
    border-radius: 50%;
    z-index: 1;
    pointer-events: none;
  }

  .rail-item-active-bottom-cut::before {
    content: '';
    position: absolute;
    bottom: -16px;
    right: -1px;
    width: 20px;
    height: 20px;
    background: transparent;
    box-shadow: 6px -6px 0 6px #ffffff;
    border-radius: 50%;
    z-index: 1;
    pointer-events: none;
  }
`

// ─── Rail button with inverted-corner effect ──────────────────────
// We wrap both the active item AND its neighbors in a relative
// container, then use CSS classes on the active item itself to draw
// the concave curves. The simplest approach that works in React:
// just attach the cut-corner pseudo-elements directly on the
// active button with two wrapper divs for above/below.

function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Top concave corner — shown when active */}
      {active && (
        <div style={{
          position: 'absolute',
          top: -20, right: -1,
          width: 20, height: 20,
          background: 'transparent',
          // box-shadow fills the corner gap with the rail color
          boxShadow: `6px 6px 0 6px ${RAIL_BG}`,
          borderRadius: '0 0 0 0',
          zIndex: 3,
          pointerEvents: 'none',
        }} />
      )}

      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={`rail-item${active ? ' rail-item-active' : ''}`}
      >
        <div className="rail-icon-wrap" style={{
          color: active ? RAIL_BG : hov ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
        }}>
          <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
        </div>
      </button>

      {/* Bottom concave corner — shown when active */}
      {active && (
        <div style={{
          position: 'absolute',
          bottom: -20, right: -1,
          width: 20, height: 20,
          background: 'transparent',
          boxShadow: `6px -6px 0 6px ${RAIL_BG}`,
          borderRadius: '0 0 0 0',
          zIndex: 3,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}

// ─── Panel row — pill active style ───────────────────────────────
function PanelRow({ icon: Icon, label, active, onClick, depth = 0, badge, dim, indent }) {
  const [hov, setHov] = useState(false)
  const pl = 12 + (depth * 14) + (indent ? 10 : 0)
  const bg    = active ? C.rowActive  : hov ? C.rowHov  : 'transparent'
  const color = active ? C.rowActiveTx : hov ? C.rowHovTx : dim ? C.textDim : C.text

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 6, paddingBottom: 6,
        paddingLeft: pl, paddingRight: 10,
        borderRadius: 9,
        cursor: 'pointer', userSelect: 'none', textAlign: 'left',
        border: 'none', marginBottom: 2,
        background: bg, color,
        transition: 'background 0.15s, color 0.15s',
        fontFamily: FONT,
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.22)' : 'none',
      }}
    >
      {Icon && (
        <Icon size={13} strokeWidth={active ? 2.2 : 1.75}
          style={{ flexShrink: 0, opacity: active ? 1 : dim ? 0.45 : hov ? 0.85 : 0.6,
            transition: 'opacity 0.15s' }} />
      )}
      <span style={{
        fontSize: 13, fontWeight: active ? 600 : dim ? 400 : 500,
        lineHeight: 1.3, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
      }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: active ? 'rgba(255,255,255,0.7)' : C.textDim,
          background: active ? 'rgba(255,255,255,0.18)' : '#f3f4f6',
          borderRadius: 99, padding: '1px 7px',
          border: active ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${C.divider}`,
        }}>{badge}</span>
      )}
    </button>
  )
}

// ─── Section header ───────────────────────────────────────────────
function SectionHd({ icon: Icon, label, open, onToggle, onAdd }) {
  const [hov, setHov]       = useState(false)
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
          padding: '6px 10px 6px 12px', borderRadius: 9,
          cursor: 'pointer', userSelect: 'none', textAlign: 'left',
          border: 'none',
          background: isActive ? C.rowActive : hov ? C.rowHov : 'transparent',
          transition: 'background 0.15s',
          fontFamily: FONT,
          boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.22)' : 'none',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: isActive ? 'rgba(255,255,255,0.8)' : (project.color || C.accent),
          transition: 'background 0.15s',
        }} />
        <span style={{
          fontSize: 13, fontWeight: isActive ? 600 : 500,
          color: isActive ? C.rowActiveTx : hov ? C.rowHovTx : C.text,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em', transition: 'color 0.15s',
        }}>{project.name}</span>
        <ChevronRight size={11} style={{
          color: isActive ? 'rgba(255,255,255,0.7)' : C.textDim, flexShrink: 0,
          transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), color 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }} />
      </button>

      {open && (
        <div style={{
          marginLeft: 20, paddingLeft: 10,
          borderLeft: `1px solid ${C.divider}`,
          marginTop: 2, marginBottom: 4,
        }}>
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

// ─── Root ─────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onCollapse, activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    setLoading(true)
    projectsApi.list()
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (location.pathname === '/projects') load() }, [location.pathname])

  const isChat     = location.pathname === '/'
  const isProjects = location.pathname === '/projects'

  return (
    <div style={{ display: 'flex', height: '100vh', flexShrink: 0, fontFamily: FONT }}>

      {/* Inject rail CSS */}
      <style>{RAIL_CSS}</style>

      {/* ══ RAIL ════════════════════════════════════════════════ */}
      <div
        data-rail="true"
        style={{
          width: RAIL_W, minWidth: RAIL_W,
          background: RAIL_BG,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 14, paddingBottom: 12,
          // No border-right — the active item flush handles the edge
          position: 'relative',
          zIndex: 2, flexShrink: 0,
          overflow: 'visible',   // allow the concave corners to overflow
        }}
      >
        {/* Logo mark */}
        <div
          onClick={() => navigate('/')}
          style={{
            width: 36, height: 36, borderRadius: 10, marginBottom: 20,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <BarChart3 size={18} strokeWidth={2.2} style={{ color: '#ffffff' }} />
        </div>

        {/* Primary nav */}
        <RailBtn icon={MessageSquare} active={isChat}     onClick={() => navigate('/')}         tooltip="AI Workspace" />
        <RailBtn icon={LayoutGrid}    active={isProjects} onClick={() => navigate('/projects')} tooltip="Projects" />

        <div style={{ flex: 1 }} />

        {/* Bottom nav */}
        <RailBtn icon={HelpCircle} active={false} onClick={() => {}} tooltip="Help" />
        <RailBtn icon={Settings}   active={false} onClick={() => {}} tooltip="Settings" />

        {/* Collapse toggle */}
        <button
          onClick={onCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            width: 32, height: 32, borderRadius: 9, marginTop: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', outline: 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.color = '#ffffff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
          }}
        >
          {collapsed
            ? <ChevronsRight size={14} strokeWidth={2} />
            : <ChevronsLeft  size={14} strokeWidth={2} />
          }
        </button>
      </div>

      {/* ══ WHITE PANEL ════════════════════════════════════════ */}
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
                fontSize: 15, fontWeight: 700, color: C.text,
                letterSpacing: '-0.03em', lineHeight: 1, fontFamily: FONT,
              }}>DataFlow</div>
              <div style={{
                fontSize: 10, fontWeight: 500, color: C.textDim,
                letterSpacing: '0.09em', marginTop: 3,
                textTransform: 'uppercase', fontFamily: FONT,
              }}>AI Analytics</div>
            </div>

            {/* Top nav */}
            <div style={{ padding: '10px 8px 6px', flexShrink: 0 }}>
              <PanelRow icon={MessageSquare} label="AI Workspace" active={isChat}     onClick={() => navigate('/')} />
              <PanelRow icon={LayoutGrid}    label="Projects"     active={isProjects} onClick={() => navigate('/projects')} />
            </div>

            <Divider />

            {/* Projects label */}
            <div style={{ padding: '4px 14px 6px', flexShrink: 0 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.textDim,
                textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT,
              }}>Projects</span>
            </div>

            {/* Project tree */}
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