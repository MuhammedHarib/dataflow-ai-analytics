// src/components/sidebar/Sidebar.jsx
// Liquid cut-out active rail effect — matches teal reference exactly
// White pill bleeds flush to RIGHT edge of rail
// Two concave quarter-circle corners carved from the rail color
// Rail has overflow:hidden — corners rendered OUTSIDE via portal-like wrappers

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, MessageSquare, LayoutGrid, LayoutDashboard,
  ChevronRight, Plus, Settings, ChevronsLeft, ChevronsRight,
  Pin, Hash, HelpCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/client'

// ─── Constants ────────────────────────────────────────────────────
const RAIL_W  = 64
const PANEL_W = 228
const RAIL_BG = '#6366f1'
const WHITE   = '#ffffff'
const FONT    = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// Pill geometry — tune these two numbers to match the reference
const PILL_H      = 48   // height of the white active block
const PILL_RADIUS = 14   // border-radius of the left side of the pill
const CORNER_SIZE = 20   // size of each concave corner square

const P = {
  bg: WHITE, border: '#ebebed',
  text: '#111827', dim: '#a1a1aa',
  hov: '#eef2ff', hovTx: '#4338ca',
  active: RAIL_BG, activeTx: WHITE,
  accent: RAIL_BG, accentLt: '#eef2ff', accentBd: '#c7d2fe',
  divider: '#f0f0f2',
}

// ─── CSS string ───────────────────────────────────────────────────
// Key insight from the reference image:
//   • The rail has overflow:hidden — nothing bleeds outside it
//   • The white pill IS inside the rail, flush right, with left radius only
//   • The two "concave corners" are OUTSIDE the rail div entirely —
//     they sit in the white content area, just to the right of the rail
//   • Each corner = a div with border-radius:50% and a box-shadow
//     in the rail color that fills the outside of the curve
//
// Since we can't use true pseudo-elements in React inline styles,
// we inject a <style> block and use className on the elements.

const CSS = `
  /* ── Rail item slot ──────────────────────────────────────────── */
  .ri-slot {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: ${PILL_H + 8}px;
    flex-shrink: 0;
  }

  /* ── Button base ─────────────────────────────────────────────── */
  .ri-btn {
    position: relative;
    width: 100%;
    height: ${PILL_H}px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    cursor: pointer;
    background: transparent;
    padding: 0;
    z-index: 1;
    color: rgba(255,255,255,0.55);
    transition: color 0.2s;
    font-family: ${FONT};
  }

  /* Icon wrapper — the visible rounded square */
  .ri-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 3;
    transition: background 0.2s, transform 0.15s;
    color: rgba(255,255,255,0.55);
  }

  .ri-btn:hover:not(.ri-active) .ri-icon {
    background: rgba(255,255,255,0.13);
    color: rgba(255,255,255,0.92);
    transform: scale(1.06);
  }

  /* ── Active: white pill flush to right ───────────────────────── */
  /* The pill is drawn with ::before on the button.
     It fills from left:6px to right:0 (flush with rail edge).
     Only left corners are rounded — right side is perfectly flat
     so it butts against the white panel and they look continuous. */

  .ri-btn.ri-active {
    color: ${RAIL_BG};
  }

  .ri-btn.ri-active .ri-icon {
    background: transparent !important;
    transform: none !important;
    color: ${RAIL_BG} !important;
  }

  .ri-btn.ri-active::before {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    left: 8px;
    right: 0px;                    /* flush to right edge of rail */
    background: ${WHITE};
    border-radius: ${PILL_RADIUS}px 0 0 ${PILL_RADIUS}px;
    z-index: 0;
    /* NO box-shadow here — keep it clean */
  }

  /* Transition for the pill appearing */
  .ri-btn::before {
    transition: opacity 0.22s cubic-bezier(.4,0,.2,1),
                transform 0.22s cubic-bezier(.4,0,.2,1);
  }
  .ri-btn:not(.ri-active)::before {
    opacity: 0;
    pointer-events: none;
  }
  .ri-btn.ri-active::before {
    opacity: 1;
  }

  /* ── Concave corner elements ─────────────────────────────────── */
  /* These live OUTSIDE the rail in the white area.
     They're positioned absolutely relative to the rail+panel wrapper.
     Each is a square with border-radius:50% and a box-shadow
     in the RAIL color that "fills" the outside of the quarter circle,
     creating the illusion of a concave bite. */

  .ri-corner {
    position: absolute;
    right: 0;
    width: ${CORNER_SIZE}px;
    height: ${CORNER_SIZE}px;
    background: transparent;
    border-radius: 50%;
    z-index: 10;
    pointer-events: none;
    /* transitions match the pill */
    transition: opacity 0.22s cubic-bezier(.4,0,.2,1);
  }

  .ri-corner.ri-hidden { opacity: 0; }
  .ri-corner.ri-show   { opacity: 1; }

  /* Top corner: positioned so its BOTTOM edge aligns with TOP of pill
     Shadow goes DOWN-RIGHT → fills the top-right concave gap */
  .ri-corner-top {
    bottom: calc(50% + ${PILL_H / 2}px);
    box-shadow: ${CORNER_SIZE / 2}px ${CORNER_SIZE / 2}px 0 ${CORNER_SIZE / 2}px ${RAIL_BG};
  }

  /* Bottom corner: positioned so its TOP edge aligns with BOTTOM of pill
     Shadow goes UP-RIGHT → fills the bottom-right concave gap */
  .ri-corner-bottom {
    top: calc(50% + ${PILL_H / 2}px);
    box-shadow: ${CORNER_SIZE / 2}px -${CORNER_SIZE / 2}px 0 ${CORNER_SIZE / 2}px ${RAIL_BG};
  }
`

// ─── RailBtn ──────────────────────────────────────────────────────
// The slot div must be position:relative for the corner divs.
// The corner divs sit at right:0 of the slot — which aligns with
// the right edge of the rail div. Their box-shadows extend rightward
// into the white panel area, completing the concave illusion.
function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <div className="ri-slot">
      {/* ── Top concave corner ───────────────────────────────── */}
      <div className={`ri-corner ri-corner-top ${active ? 'ri-show' : 'ri-hidden'}`} />

      {/* ── The rail button ──────────────────────────────────── */}
      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={`ri-btn${active ? ' ri-active' : ''}`}
      >
        <div
          className="ri-icon"
          style={{
            color: active
              ? RAIL_BG
              : hov ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
          }}
        >
          <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
        </div>
      </button>

      {/* ── Bottom concave corner ────────────────────────────── */}
      <div className={`ri-corner ri-corner-bottom ${active ? 'ri-show' : 'ri-hidden'}`} />
    </div>
  )
}

// ─── Panel row ────────────────────────────────────────────────────
function PanelRow({ icon: Icon, label, active, onClick, depth = 0, badge, dim, indent }) {
  const [hov, setHov] = useState(false)
  const pl = 12 + depth * 14 + (indent ? 10 : 0)
  const bg    = active ? P.active   : hov ? P.hov    : 'transparent'
  const color = active ? P.activeTx : hov ? P.hovTx  : dim ? P.dim : P.text

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: `6px 10px 6px ${pl}px`,
        borderRadius: 9, border: 'none', marginBottom: 2,
        background: bg, color,
        cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
        transition: 'background 0.15s, color 0.15s',
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.22)' : 'none',
      }}
    >
      {Icon && (
        <Icon size={13} strokeWidth={active ? 2.2 : 1.75}
          style={{ flexShrink: 0, opacity: active ? 1 : dim ? 0.45 : hov ? 0.85 : 0.65 }} />
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
          color: active ? 'rgba(255,255,255,0.75)' : P.dim,
          background: active ? 'rgba(255,255,255,0.18)' : '#f3f4f6',
          borderRadius: 99, padding: '1px 7px',
          border: active ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${P.divider}`,
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
        cursor: 'pointer', marginBottom: 1,
        background: hov ? P.hov : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <ChevronRight size={11} style={{
        color: P.dim, flexShrink: 0,
        transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }} />
      {Icon && <Icon size={11} strokeWidth={2} style={{ color: P.dim, flexShrink: 0 }} />}
      <span style={{
        fontSize: 10, fontWeight: 600, color: P.dim,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        flex: 1, fontFamily: FONT,
      }}>{label}</span>
      {onAdd && (
        <button
          onClick={e => { e.stopPropagation(); onAdd() }}
          onMouseEnter={() => setAddHov(true)}
          onMouseLeave={() => setAddHov(false)}
          style={{
            width: 18, height: 18, borderRadius: 5, border: 'none',
            background: addHov ? P.accentLt : 'transparent',
            color: addHov ? P.accent : P.dim,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0,
          }}
        ><Plus size={11} strokeWidth={2.5} /></button>
      )}
    </div>
  )
}

// ─── Project node ─────────────────────────────────────────────────
function ProjectNode({ project, activePage }) {
  const navigate = useNavigate()
  const [open, setOpen]           = useState(false)
  const [openDash, setOpenDash]   = useState(false)
  const [openChats, setOpenChats] = useState(false)
  const [summary, setSummary]     = useState(null)
  const [hov, setHov]             = useState(false)
  const isActive = activePage?.projectId === project.id

  useEffect(() => {
    if (!open || summary) return
    let cancelled = false
    projectsApi.summary(project.id)
      .then(r => { if (!cancelled) setSummary(r.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, project.id, summary])

  useEffect(() => { if (isActive && !open) setOpen(true) }, [isActive])

  return (
    <div style={{ marginBottom: 1 }}>
      <button
        onClick={() => { setOpen(o => !o); navigate(`/projects/${project.id}`) }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '6px 10px 6px 12px', borderRadius: 9,
          cursor: 'pointer', textAlign: 'left', border: 'none',
          background: isActive ? P.active : hov ? P.hov : 'transparent',
          transition: 'background 0.15s', fontFamily: FONT,
          boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.22)' : 'none',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: isActive ? 'rgba(255,255,255,0.85)' : (project.color || P.accent),
          transition: 'background 0.15s',
        }} />
        <span style={{
          fontSize: 13, fontWeight: isActive ? 600 : 500,
          color: isActive ? P.activeTx : hov ? P.hovTx : P.text,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em', transition: 'color 0.15s',
        }}>{project.name}</span>
        <ChevronRight size={11} style={{
          color: isActive ? 'rgba(255,255,255,0.7)' : P.dim, flexShrink: 0,
          transition: 'transform 0.18s cubic-bezier(.4,0,.2,1), color 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        }} />
      </button>

      {open && (
        <div style={{
          marginLeft: 20, paddingLeft: 10,
          borderLeft: `1px solid ${P.divider}`,
          marginTop: 2, marginBottom: 4,
        }}>
          <SectionHd icon={LayoutDashboard} label="Dashboards"
            open={openDash} onToggle={() => setOpenDash(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/dashboards/new`)} />
          {openDash && (
            <>
              {summary?.dashboards?.length
                ? summary.dashboards.map(d => (
                    <PanelRow key={d.id} icon={d.is_pinned ? Pin : Hash}
                      label={d.name} depth={0} indent
                      active={activePage?.view === 'dashboard' && Number(activePage?.dashboardId) === d.id}
                      onClick={() => navigate(`/projects/${project.id}/dashboards/${d.id}`)} />
                  ))
                : <p style={{ fontSize: 11, color: P.dim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No dashboards</p>
              }
              <PanelRow icon={Plus} label="New dashboard" depth={0} indent dim
                onClick={() => navigate(`/projects/${project.id}/dashboards/new`)} />
            </>
          )}

          <SectionHd icon={MessageSquare} label="Chats"
            open={openChats} onToggle={() => setOpenChats(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/chat`)} />
          {openChats && (
            <>
              {summary?.chats?.length
                ? summary.chats.slice(0, 5).map(c => (
                    <PanelRow key={c.id} icon={Hash}
                      label={c.title || 'Untitled'} depth={0} indent
                      active={activePage?.view === 'project-chat' && Number(activePage?.chatId) === c.id}
                      onClick={() => navigate(`/projects/${project.id}/chat/${c.id}`)} />
                  ))
                : <p style={{ fontSize: 11, color: P.dim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No chats</p>
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

const Divider = () => (
  <div style={{ height: 1, background: P.divider, margin: '6px 14px' }} />
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

      <style>{CSS}</style>

      {/* ══ RAIL ════════════════════════════════════════════════════ */}
      {/* CRITICAL: overflow must be 'visible' so the corner box-shadows
          bleed rightward into the white panel area */}
      <div style={{
        width: RAIL_W, minWidth: RAIL_W,
        background: RAIL_BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14, paddingBottom: 12,
        position: 'relative',
        overflow: 'visible',
        zIndex: 2, flexShrink: 0,
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            width: 36, height: 36, borderRadius: 10, marginBottom: 16,
            background: 'rgba(255,255,255,0.20)',
            border: '1.5px solid rgba(255,255,255,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <BarChart3 size={18} strokeWidth={2.2} style={{ color: '#fff' }} />
        </div>

        <RailBtn icon={MessageSquare} active={isChat}     onClick={() => navigate('/')}         tooltip="AI Workspace" />
        <RailBtn icon={LayoutGrid}    active={isProjects} onClick={() => navigate('/projects')} tooltip="Projects" />

        <div style={{ flex: 1 }} />

        <RailBtn icon={HelpCircle} active={false} onClick={() => {}} tooltip="Help" />
        <RailBtn icon={Settings}   active={false} onClick={() => {}} tooltip="Settings" />

        {/* Collapse */}
        <button
          onClick={onCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            width: 32, height: 32, borderRadius: 9, marginTop: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.20)',
            color: 'rgba(255,255,255,0.65)', cursor: 'pointer', outline: 'none',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.22)'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
          }}
        >
          {collapsed ? <ChevronsRight size={14} strokeWidth={2} /> : <ChevronsLeft size={14} strokeWidth={2} />}
        </button>
      </div>

      {/* ══ WHITE PANEL ═════════════════════════════════════════════ */}
      <div style={{
        width:    collapsed ? 0 : PANEL_W,
        minWidth: collapsed ? 0 : PANEL_W,
        background: WHITE,
        borderRight: collapsed ? 'none' : `1px solid ${P.border}`,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        zIndex: 1,
      }}>
        {!collapsed && (
          <>
            <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${P.divider}`, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text, letterSpacing: '-0.03em', lineHeight: 1, fontFamily: FONT }}>DataFlow</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: P.dim, letterSpacing: '0.09em', marginTop: 3, textTransform: 'uppercase', fontFamily: FONT }}>AI Analytics</div>
            </div>

            <div style={{ padding: '10px 8px 6px', flexShrink: 0 }}>
              <PanelRow icon={MessageSquare} label="AI Workspace" active={isChat}     onClick={() => navigate('/')} />
              <PanelRow icon={LayoutGrid}    label="Projects"     active={isProjects} onClick={() => navigate('/projects')} />
            </div>

            <Divider />

            <div style={{ padding: '4px 14px 6px', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT }}>Projects</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', scrollbarWidth: 'thin', scrollbarColor: `${P.divider} transparent` }}>
              {loading
                ? <p style={{ fontSize: 12, color: P.dim, padding: '8px 12px', margin: 0, fontFamily: FONT }}>Loading…</p>
                : projects.length === 0
                  ? <p style={{ fontSize: 12, color: P.dim, padding: '8px 12px', lineHeight: 1.7, margin: 0, fontFamily: FONT }}>No projects yet.<br />Create your first one.</p>
                  : projects.map(p => <ProjectNode key={p.id} project={p} activePage={activePage} />)
              }

              <button
                onClick={() => navigate('/projects')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 12px', borderRadius: 8, marginTop: 8,
                  border: `1.5px dashed ${P.accentBd}`,
                  background: 'transparent', cursor: 'pointer',
                  color: P.accent, transition: 'all 0.15s', fontFamily: FONT,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = P.accentLt; e.currentTarget.style.borderColor = P.accent }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = P.accentBd }}
              >
                <Plus size={13} strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>New Project</span>
              </button>
            </div>

            <Divider />

            <div style={{ padding: '4px 8px 10px', flexShrink: 0 }}>
              <PanelRow icon={Settings} label="Settings" active={false} onClick={() => {}} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}