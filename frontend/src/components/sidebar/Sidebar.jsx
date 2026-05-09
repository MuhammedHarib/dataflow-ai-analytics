// src/components/sidebar/Sidebar.jsx
// "Liquid cut-out" active rail effect
// — Indigo rail bleeds seamlessly into white panel via concave corners
// — box-shadow trick on ::before / ::after pseudo-elements
// — White block flush to RIGHT edge of rail, icon turns indigo

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, MessageSquare, LayoutGrid, LayoutDashboard,
  ChevronRight, Plus, Settings, ChevronsLeft, ChevronsRight,
  Pin, Hash, HelpCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/client'

// ─── Core measurements ────────────────────────────────────────────
const RAIL_W   = 64    // px — icon rail width
const PANEL_W  = 228   // px — white text panel width
const ITEM_H   = 52    // px — height of each rail slot
const PILL_H   = 44    // px — height of white pill inside slot
const CORNER_R = 14    // px — radius of concave corner circles

// ─── Colors ───────────────────────────────────────────────────────
const RAIL   = '#6366f1'   // indigo — must match AppShell content bg exactly
const WHITE  = '#ffffff'   // active pill + panel bg — MUST be same as page bg
const FONT   = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const P = {
  bg:       WHITE,
  border:   '#ebebed',
  text:     '#111827',
  dim:      '#a1a1aa',
  hov:      '#eef2ff',
  hovTx:    '#4338ca',
  active:   RAIL,
  activeTx: WHITE,
  accent:   RAIL,
  accentLt: '#eef2ff',
  accentBd: '#c7d2fe',
  divider:  '#f0f0f2',
}

// ─── Injected CSS ─────────────────────────────────────────────────
// The concave-corner trick explained:
//
//  ┌──────────┐  ← rail top
//  │          │
//  │    ◉     │  ← non-active icon, transparent bg
//  │          │
//  │  ╭──────── ← HERE: concave top corner
//  │  │ ◉    │  ← active icon, white bg, icon = indigo
//  │  ╰──────── ← HERE: concave bottom corner
//  │          │
//
// Each corner is a tiny div (CORNER_R × CORNER_R) with:
//   background: transparent
//   border-radius: 50%
//   box-shadow: Xpx Ypx 0 Xpx ${RAIL}
//
// The shadow "fills" the outside of the circle with rail color,
// making it look like the rail is bending inward.

const CSS = `
  /* ── Slot wrapper — full-width, fixed height ─────────────────── */
  .rs-slot {
    position: relative;
    width: 100%;
    height: ${ITEM_H}px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* ── Rail button ─────────────────────────────────────────────── */
  .rs-btn {
    position: relative;
    width: 100%;
    height: ${ITEM_H}px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    cursor: pointer;
    background: transparent;
    z-index: 1;
    padding: 0;
    transition: color 0.2s ease;
    color: rgba(255,255,255,0.55);
  }

  .rs-btn:hover .rs-icon-box {
    background: rgba(255,255,255,0.14);
    transform: scale(1.05);
  }

  /* ── Icon box — the rounded square holding the icon ──────────── */
  .rs-icon-box {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, transform 0.15s ease;
    position: relative;
    z-index: 2;
  }

  /* ── ACTIVE STATE ─────────────────────────────────────────────── */

  /* White pill — extends flush to the RIGHT edge of the rail
     Left side has border-radius, right side is flat (0px) so it
     merges with the white panel seamlessly */
  .rs-btn.rs-active {
    color: ${RAIL} !important;
  }

  .rs-btn.rs-active .rs-icon-box {
    background: transparent !important;
    transform: none !important;
    color: ${RAIL};
  }

  /* The white block itself */
  .rs-btn.rs-active::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    /* flush to right edge, indented from left */
    right: 0px;
    left: 8px;
    height: ${PILL_H}px;
    background: ${WHITE};
    /* round only left side */
    border-radius: ${CORNER_R}px 0 0 ${CORNER_R}px;
    z-index: 0;
    /* subtle shadow to lift it off the rail */
    box-shadow: -2px 0 8px rgba(0,0,0,0.06);
  }

  /* ── Concave corner elements ─────────────────────────────────── */
  /* These are injected as sibling divs (not pseudo-elements)
     because React can't use ::before/::after on arbitrary siblings.
     Each is a transparent circle with a thick box-shadow in RAIL color */

  .rs-corner {
    position: absolute;
    right: 0;
    width: ${CORNER_R * 2}px;
    height: ${CORNER_R * 2}px;
    background: transparent;
    border-radius: 50%;
    z-index: 4;
    pointer-events: none;
  }

  /* Top corner — sits just above the white pill */
  .rs-corner-top {
    /* position: bottom of corner circle = top of pill */
    bottom: calc(50% + ${PILL_H / 2}px);
    /* Shadow shoots DOWN-RIGHT, filling the gap with rail color */
    box-shadow: ${CORNER_R}px ${CORNER_R}px 0 ${CORNER_R}px ${RAIL};
  }

  /* Bottom corner — sits just below the white pill */
  .rs-corner-bottom {
    /* position: top of corner circle = bottom of pill */
    top: calc(50% + ${PILL_H / 2}px);
    /* Shadow shoots UP-RIGHT */
    box-shadow: ${CORNER_R}px -${CORNER_R}px 0 ${CORNER_R}px ${RAIL};
  }

  /* ── Smooth transition when switching active items ───────────── */
  .rs-btn::before {
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  .rs-btn:not(.rs-active)::before {
    opacity: 0;
    transform: translateY(-50%) scaleX(0.7);
  }
  .rs-btn.rs-active::before {
    opacity: 1;
    transform: translateY(-50%) scaleX(1);
  }

  .rs-corner {
    transition: opacity 0.25s ease;
  }
  .rs-corner.rs-corner-hidden {
    opacity: 0;
  }
  .rs-corner.rs-corner-visible {
    opacity: 1;
  }
`

// ─── Rail slot (button + corners) ────────────────────────────────
function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <div className="rs-slot">
      {/* Top concave corner */}
      <div className={`rs-corner rs-corner-top ${active ? 'rs-corner-visible' : 'rs-corner-hidden'}`} />

      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={`rs-btn${active ? ' rs-active' : ''}`}
      >
        <div
          className="rs-icon-box"
          style={{
            color: active
              ? RAIL
              : hov
                ? 'rgba(255,255,255,0.92)'
                : 'rgba(255,255,255,0.55)',
          }}
        >
          <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
        </div>
      </button>

      {/* Bottom concave corner */}
      <div className={`rs-corner rs-corner-bottom ${active ? 'rs-corner-visible' : 'rs-corner-hidden'}`} />
    </div>
  )
}

// ─── Panel nav row ────────────────────────────────────────────────
function PanelRow({ icon: Icon, label, active, onClick, depth = 0, badge, dim, indent }) {
  const [hov, setHov] = useState(false)
  const pl = 12 + depth * 14 + (indent ? 10 : 0)
  const bg    = active ? P.active  : hov ? P.hov  : 'transparent'
  const color = active ? P.activeTx : hov ? P.hovTx : dim ? P.dim : P.text

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: `6px ${10}px 6px ${pl}px`,
        borderRadius: 9, border: 'none', marginBottom: 2,
        background: bg, color,
        cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s, color 0.15s',
        fontFamily: FONT,
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.22)' : 'none',
      }}
    >
      {Icon && (
        <Icon size={13} strokeWidth={active ? 2.2 : 1.75}
          style={{ flexShrink: 0, opacity: active ? 1 : dim ? 0.45 : hov ? 0.85 : 0.6 }} />
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
  const [hov, setHov] = useState(false)
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
        textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1, fontFamily: FONT,
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
                : <p style={{ fontSize: 11, color: P.dim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No dashboards</p>
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

      {/* Scoped CSS */}
      <style>{CSS}</style>

      {/* ══ RAIL ════════════════════════════════════════════════════ */}
      <div style={{
        width: RAIL_W, minWidth: RAIL_W,
        background: RAIL,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14, paddingBottom: 12,
        position: 'relative',
        // CRITICAL: overflow visible so corner elements can bleed right
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

        {/* Nav items */}
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
            {/* Brand */}
            <div style={{
              padding: '18px 16px 14px',
              borderBottom: `1px solid ${P.divider}`, flexShrink: 0,
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text,
                letterSpacing: '-0.03em', lineHeight: 1, fontFamily: FONT }}>DataFlow</div>
              <div style={{ fontSize: 10, fontWeight: 500, color: P.dim,
                letterSpacing: '0.09em', marginTop: 3, textTransform: 'uppercase', fontFamily: FONT }}>
                AI Analytics
              </div>
            </div>

            {/* Top nav */}
            <div style={{ padding: '10px 8px 6px', flexShrink: 0 }}>
              <PanelRow icon={MessageSquare} label="AI Workspace" active={isChat}     onClick={() => navigate('/')} />
              <PanelRow icon={LayoutGrid}    label="Projects"     active={isProjects} onClick={() => navigate('/projects')} />
            </div>

            <Divider />

            {/* Projects label */}
            <div style={{ padding: '4px 14px 6px', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: P.dim,
                textTransform: 'uppercase', letterSpacing: '0.09em', fontFamily: FONT }}>
                Projects
              </span>
            </div>

            {/* Project tree */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '0 8px 8px',
              scrollbarWidth: 'thin', scrollbarColor: `${P.divider} transparent`,
            }}>
              {loading
                ? <p style={{ fontSize: 12, color: P.dim, padding: '8px 12px', margin: 0, fontFamily: FONT }}>Loading…</p>
                : projects.length === 0
                  ? <p style={{ fontSize: 12, color: P.dim, padding: '8px 12px', lineHeight: 1.7, margin: 0, fontFamily: FONT }}>
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