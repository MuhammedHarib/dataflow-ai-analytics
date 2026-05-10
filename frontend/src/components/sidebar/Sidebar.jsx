// src/components/sidebar/Sidebar.jsx
// Liquid cut-out active rail effect
// Architecture: The rail itself is a <canvas>-free approach.
// The active "cut-out" shape is drawn as an ABSOLUTELY POSITIONED
// white SVG shape that sits BETWEEN the rail and the panel,
// with the icon rendered on top. No overflow issues.

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, MessageSquare, LayoutGrid, LayoutDashboard,
  ChevronRight, Plus, Settings, ChevronsLeft, ChevronsRight,
  Pin, Hash, HelpCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/client'

// ─── Layout constants ─────────────────────────────────────────────
const RAIL_W    = 64    // icon rail width px
const PANEL_W   = 228   // white text panel width px
const SLOT_H    = 56    // height of each nav slot px
const PILL_H    = 48    // height of white active pill px
const RADIUS    = 14    // left border-radius of pill px
const CURVE     = 16    // concave corner curve radius px

// ─── Colors ───────────────────────────────────────────────────────
const RAIL_COLOR = '#6366f1'
const WHITE      = '#ffffff'
const FONT       = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const P = {
  bg: WHITE, border: '#ebebed',
  text: '#111827', dim: '#a1a1aa',
  hov: '#eef2ff', hovTx: '#4338ca',
  active: RAIL_COLOR, activeTx: WHITE,
  accent: RAIL_COLOR, accentLt: '#eef2ff', accentBd: '#c7d2fe',
  divider: '#f0f0f2',
}

// ─── CSS injected once ────────────────────────────────────────────
const CSS = `
  .rail-slot {
    position: relative;
    width: 100%;
    height: ${SLOT_H}px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .rail-btn {
    position: relative;
    z-index: 3;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    outline: none;
    cursor: pointer;
    background: transparent;
    color: rgba(255,255,255,0.55);
    transition: color 0.18s, background 0.18s, transform 0.15s;
    padding: 0;
  }

  .rail-btn:hover {
    background: rgba(255,255,255,0.13);
    color: rgba(255,255,255,0.92);
    transform: scale(1.06);
  }

  .rail-btn.is-active {
    color: ${RAIL_COLOR};
    background: transparent !important;
    transform: none !important;
  }

  /* The white pill + concave corners SVG sits absolutely in the slot */
  .rail-cutout {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: 0;
    /* width = rail width so pill is flush to right edge */
    width: ${RAIL_W}px;
    height: ${PILL_H + CURVE * 2}px;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.22s cubic-bezier(.4,0,.2,1);
  }

  .rail-cutout.visible {
    opacity: 1;
  }
`

// ─── CutoutShape SVG ──────────────────────────────────────────────
// This SVG draws the white pill with concave quarter-circle corners
// The shape looks like this (viewed from the right side of the rail):
//
//    rail color fills here
//    ╲
//     ╲__   ← concave top curve
//    |    |
//    |    |  ← white pill (height = PILL_H)
//    |____|
//     ╱
//    ╱      ← concave bottom curve
//
// SVG path breakdown:
//   Start at top-left of the bounding box
//   → Draw the top concave curve (quarter circle curving inward)
//   → Straight line to top-right (flush right edge, no radius)
//   → Straight line down the right side
//   → Straight line to bottom-right
//   → Draw the bottom concave curve
//   → Close path

function CutoutShape({ visible }) {
  const W  = RAIL_W          // total width of SVG
  const TH = PILL_H + CURVE * 2  // total height of SVG
  const r  = CURVE           // concave corner radius
  const ph = PILL_H          // pill height
  const lr = RADIUS          // left border-radius

  // Key Y coordinates
  const pillTop    = r           // where the pill top starts (after top curve space)
  const pillBottom = r + ph      // where the pill bottom ends

  // The SVG path for the white shape:
  // We want a white shape that:
  // - Starts at top-left and goes right
  // - Has a concave curve at top-right corner (curving LEFT into the rail)
  // - Goes straight down the right edge
  // - Has a concave curve at bottom-right corner
  // - Returns to bottom-left with rounded corners on left side

  // Actually the shape is: white pill flush right, with the RAIL color
  // filling the concave "bites" above and below using the SVG background.

  // Simpler and more reliable approach:
  // Draw the white shape as a path with:
  //   - left side: rounded rectangle (lr radius)
  //   - right side: flat (flush with rail edge = SVG right edge)
  //   - top-right concave corner: quarter circle biting into the shape
  //   - bottom-right concave corner: quarter circle biting into the shape

  const path = [
    // Start at top-left, just below the top-left radius
    `M ${lr} ${pillTop}`,
    // Top-left corner (rounded)
    `Q 0 ${pillTop} 0 ${pillTop + lr}`,
    // Left edge — straight down
    `L 0 ${pillBottom - lr}`,
    // Bottom-left corner (rounded)
    `Q 0 ${pillBottom} ${lr} ${pillBottom}`,
    // Bottom edge — straight right to where concave corner starts
    `L ${W - r} ${pillBottom}`,
    // Bottom-right CONCAVE corner — quarter circle curving UP-LEFT
    // Arc: rx=r ry=r, x-rotation=0, large-arc=0, sweep=0 (counter-clockwise)
    `Q ${W} ${pillBottom} ${W} ${pillBottom - r}`,
    // Right edge — straight up
    `L ${W} ${pillTop + r}`,
    // Top-right CONCAVE corner — quarter circle curving DOWN-LEFT
    `Q ${W} ${pillTop} ${W - r} ${pillTop}`,
    // Top edge — back to start
    `L ${lr} ${pillTop}`,
    'Z',
  ].join(' ')

  return (
    <div className={`rail-cutout${visible ? ' visible' : ''}`}
      style={{ top: '50%', transform: 'translateY(-50%)' }}>
      <svg
        width={W}
        height={TH}
        viewBox={`0 0 ${W} ${TH}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* The rail color fills the concave corner gaps */}
        {/* Top concave "bite" — circle in rail color */}
        <circle
          cx={W}
          cy={pillTop}
          r={r}
          fill={RAIL_COLOR}
        />
        {/* Bottom concave "bite" */}
        <circle
          cx={W}
          cy={pillBottom}
          r={r}
          fill={RAIL_COLOR}
        />
        {/* White pill shape on top — covers the circles except the corners */}
        <path d={path} fill={WHITE} />
      </svg>
    </div>
  )
}

// ─── Rail slot ────────────────────────────────────────────────────
function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <div className="rail-slot">
      {/* Cutout shape — white pill with concave corners */}
      <CutoutShape visible={active} />

      {/* Button */}
      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={`rail-btn${active ? ' is-active' : ''}`}
        style={{
          color: active
            ? RAIL_COLOR
            : hov ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)',
        }}
      >
        <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
      </button>
    </div>
  )
}

// ─── Panel row ────────────────────────────────────────────────────
function PanelRow({ icon: Icon, label, active, onClick, depth = 0, dim, indent }) {
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
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.20)' : 'none',
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
      {/* overflow:hidden — the SVG cutout is sized to fit exactly within
          the rail width. No bleed needed. The concave corners are drawn
          INSIDE the SVG using circles in the rail color. */}
      <div style={{
        width: RAIL_W, minWidth: RAIL_W,
        background: RAIL_COLOR,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14, paddingBottom: 12,
        position: 'relative',
        overflow: 'hidden',       // ← HIDDEN — no overflow bleed
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
            cursor: 'pointer', flexShrink: 0, position: 'relative', zIndex: 3,
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
            transition: 'all 0.15s', position: 'relative', zIndex: 3,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
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