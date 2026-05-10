// src/components/sidebar/Sidebar.jsx
// Liquid cut-out active rail — matches reference image exactly
// SVG approach: draw the ENTIRE rail slot background as SVG
// including the concave corners as part of the white shape path

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  BarChart3, MessageSquare, LayoutGrid, LayoutDashboard,
  ChevronRight, Plus, Settings, ChevronsLeft, ChevronsRight,
  Pin, Hash, HelpCircle,
} from 'lucide-react'
import { projectsApi } from '../../api/client'

// ─── Tune these values to match reference ────────────────────────
const RAIL_W   = 64    // rail width px
const PANEL_W  = 228   // white panel width px
const SLOT_H   = 56    // each nav slot height px
const PILL_H   = 46    // white pill height px
const LR       = 14    // pill left border-radius px
const CR       = 18    // concave corner radius px — bigger = smoother curve

const RAIL_BG  = '#6366f1'
const WHITE    = '#ffffff'
const FONT     = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const P = {
  bg: WHITE, border: '#ebebed', text: '#111827', dim: '#a1a1aa',
  hov: '#eef2ff', hovTx: '#4338ca',
  active: RAIL_BG, activeTx: WHITE,
  accent: RAIL_BG, accentLt: '#eef2ff', accentBd: '#c7d2fe',
  divider: '#f0f0f2',
}

// ─── CSS ──────────────────────────────────────────────────────────
const CSS = `
  .rs { position:relative; width:100%; height:${SLOT_H}px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .rs-svg { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; }
  .rs-icon { position:relative; z-index:2; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; border:none; outline:none; cursor:pointer; background:transparent; padding:0; transition:background 0.18s, transform 0.15s; }
  .rs-icon:hover { background:rgba(255,255,255,0.13); transform:scale(1.06); }
  .rs-icon.active { background:transparent !important; transform:none !important; }
  .rs-cutout { transition: opacity 0.22s cubic-bezier(.4,0,.2,1); }
`

// ─── CutoutSVG ───────────────────────────────────────────────────
// The SVG fills the entire slot (RAIL_W × SLOT_H).
// It draws the white pill shape using a single SVG path that includes
// the concave quarter-circle corners as part of the path itself.
//
// Path anatomy (all coordinates within RAIL_W × SLOT_H viewBox):
//
//   The pill occupies:
//     x: 0 → RAIL_W  (full width, flush right)
//     y: (SLOT_H - PILL_H)/2  →  (SLOT_H + PILL_H)/2
//
//   pillTop    = (SLOT_H - PILL_H) / 2
//   pillBottom = (SLOT_H + PILL_H) / 2
//
//   The concave corners are at the TOP-RIGHT and BOTTOM-RIGHT.
//   Each corner is a quarter circle of radius CR that "bites" into
//   the shape from the right side.
//
//   We use SVG arc commands:
//     A rx ry x-rotation large-arc-flag sweep-flag x y
//   sweep=0 = counter-clockwise (concave bite)
//   sweep=1 = clockwise (convex)

function CutoutSVG({ active }) {
  const W   = RAIL_W
  const H   = SLOT_H
  const pt  = (H - PILL_H) / 2   // pill top Y
  const pb  = (H + PILL_H) / 2   // pill bottom Y
  const r   = CR                  // concave corner radius

  // The white shape path:
  // Start: top-left of pill (with left radius)
  // → arc top-left corner (convex, rounding the left-top)
  // → straight across top to right side, stopping CR before right edge
  // → arc top-right CONCAVE corner (bites in from right)
  // → straight down right edge
  // → arc bottom-right CONCAVE corner
  // → straight across bottom back to left, stopping at left radius
  // → arc bottom-left corner (convex)
  // → up left edge back to start

  const path = `
    M ${LR} ${pt}
    L ${W - r} ${pt}
    A ${r} ${r} 0 0 0 ${W} ${pt + r}
    L ${W} ${pb - r}
    A ${r} ${r} 0 0 0 ${W - r} ${pb}
    L ${LR} ${pb}
    A ${LR} ${LR} 0 0 1 0 ${pb - LR}
    L 0 ${pt + LR}
    A ${LR} ${LR} 0 0 1 ${LR} ${pt}
    Z
  `

  return (
    <svg
      className="rs-svg rs-cutout"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ opacity: active ? 1 : 0 }}
    >
      <path d={path} fill={WHITE} />
    </svg>
  )
}

// ─── Rail button ──────────────────────────────────────────────────
function RailBtn({ icon: Icon, active, onClick, tooltip }) {
  const [hov, setHov] = useState(false)
  return (
    <div className="rs">
      <CutoutSVG active={active} />
      <button
        title={tooltip}
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className={`rs-icon${active ? ' active' : ''}`}
        style={{
          color: active
            ? RAIL_BG
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
  const bg    = active ? P.active : hov ? P.hov : 'transparent'
  const color = active ? P.activeTx : hov ? P.hovTx : dim ? P.dim : P.text
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: `6px 10px 6px ${pl}px`, borderRadius: 9, border: 'none', marginBottom: 2,
        background: bg, color, cursor: 'pointer', textAlign: 'left', fontFamily: FONT,
        transition: 'background 0.15s, color 0.15s',
        boxShadow: active ? '0 2px 8px rgba(99,102,241,0.20)' : 'none',
      }}
    >
      {Icon && <Icon size={13} strokeWidth={active ? 2.2 : 1.75}
        style={{ flexShrink: 0, opacity: active ? 1 : dim ? 0.45 : hov ? 0.85 : 0.65 }} />}
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
    <div onClick={onToggle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px 4px 12px', borderRadius: 6,
        cursor: 'pointer', marginBottom: 1,
        background: hov ? P.hov : 'transparent', transition: 'background 0.12s',
      }}
    >
      <ChevronRight size={11} style={{
        color: P.dim, flexShrink: 0,
        transition: 'transform 0.18s cubic-bezier(.4,0,.2,1)',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }} />
      {Icon && <Icon size={11} strokeWidth={2} style={{ color: P.dim, flexShrink: 0 }} />}
      <span style={{ fontSize: 10, fontWeight: 600, color: P.dim, textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1, fontFamily: FONT }}>{label}</span>
      {onAdd && (
        <button onClick={e => { e.stopPropagation(); onAdd() }}
          onMouseEnter={() => setAddHov(true)} onMouseLeave={() => setAddHov(false)}
          style={{
            width: 18, height: 18, borderRadius: 5, border: 'none',
            background: addHov ? P.accentLt : 'transparent',
            color: addHov ? P.accent : P.dim,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s', flexShrink: 0,
          }}><Plus size={11} strokeWidth={2.5} /></button>
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
    projectsApi.summary(project.id).then(r => { if (!cancelled) setSummary(r.data) }).catch(() => {})
    return () => { cancelled = true }
  }, [open, project.id, summary])

  useEffect(() => { if (isActive && !open) setOpen(true) }, [isActive])

  return (
    <div style={{ marginBottom: 1 }}>
      <button
        onClick={() => { setOpen(o => !o); navigate(`/projects/${project.id}`) }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '6px 10px 6px 12px', borderRadius: 9, cursor: 'pointer',
          textAlign: 'left', border: 'none', fontFamily: FONT,
          background: isActive ? P.active : hov ? P.hov : 'transparent',
          transition: 'background 0.15s',
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
        <div style={{ marginLeft: 20, paddingLeft: 10, borderLeft: `1px solid ${P.divider}`, marginTop: 2, marginBottom: 4 }}>
          <SectionHd icon={LayoutDashboard} label="Dashboards" open={openDash}
            onToggle={() => setOpenDash(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/dashboards/new`)} />
          {openDash && (<>
            {summary?.dashboards?.length
              ? summary.dashboards.map(d => (
                  <PanelRow key={d.id} icon={d.is_pinned ? Pin : Hash} label={d.name} depth={0} indent
                    active={activePage?.view === 'dashboard' && Number(activePage?.dashboardId) === d.id}
                    onClick={() => navigate(`/projects/${project.id}/dashboards/${d.id}`)} />
                ))
              : <p style={{ fontSize: 11, color: P.dim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No dashboards</p>
            }
            <PanelRow icon={Plus} label="New dashboard" depth={0} indent dim
              onClick={() => navigate(`/projects/${project.id}/dashboards/new`)} />
          </>)}

          <SectionHd icon={MessageSquare} label="Chats" open={openChats}
            onToggle={() => setOpenChats(o => !o)}
            onAdd={() => navigate(`/projects/${project.id}/chat`)} />
          {openChats && (<>
            {summary?.chats?.length
              ? summary.chats.slice(0, 5).map(c => (
                  <PanelRow key={c.id} icon={Hash} label={c.title || 'Untitled'} depth={0} indent
                    active={activePage?.view === 'project-chat' && Number(activePage?.chatId) === c.id}
                    onClick={() => navigate(`/projects/${project.id}/chat/${c.id}`)} />
                ))
              : <p style={{ fontSize: 11, color: P.dim, margin: '2px 0 4px 28px', fontFamily: FONT }}>No chats</p>
            }
            <PanelRow icon={Plus} label="New chat" depth={0} indent dim
              onClick={() => navigate(`/projects/${project.id}/chat`)} />
          </>)}
        </div>
      )}
    </div>
  )
}

const Divider = () => <div style={{ height: 1, background: P.divider, margin: '6px 14px' }} />

// ─── Root ─────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onCollapse, activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    setLoading(true)
    projectsApi.list().then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (location.pathname === '/projects') load() }, [location.pathname])

  const isChat     = location.pathname === '/'
  const isProjects = location.pathname === '/projects'

  return (
    <div style={{ display: 'flex', height: '100vh', flexShrink: 0, fontFamily: FONT }}>
      <style>{CSS}</style>

      {/* ══ RAIL ════════════════════════════════════════════════════ */}
      <div style={{
        width: RAIL_W, minWidth: RAIL_W,
        background: RAIL_BG,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14, paddingBottom: 12,
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2, flexShrink: 0,
      }}>
        {/* Logo */}
        <div onClick={() => navigate('/')} style={{
          width: 36, height: 36, borderRadius: 10, marginBottom: 16,
          background: 'rgba(255,255,255,0.20)', border: '1.5px solid rgba(255,255,255,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, position: 'relative', zIndex: 3,
        }}>
          <BarChart3 size={18} strokeWidth={2.2} style={{ color: '#fff' }} />
        </div>

        <RailBtn icon={MessageSquare} active={isChat}     onClick={() => navigate('/')}         tooltip="AI Workspace" />
        <RailBtn icon={LayoutGrid}    active={isProjects} onClick={() => navigate('/projects')} tooltip="Projects" />
        <div style={{ flex: 1 }} />
        <RailBtn icon={HelpCircle} active={false} onClick={() => {}} tooltip="Help" />
        <RailBtn icon={Settings}   active={false} onClick={() => {}} tooltip="Settings" />

        {/* Collapse */}
        <button onClick={onCollapse} title={collapsed ? 'Expand' : 'Collapse'}
          style={{
            width: 32, height: 32, borderRadius: 9, marginTop: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)',
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
        width: collapsed ? 0 : PANEL_W, minWidth: collapsed ? 0 : PANEL_W,
        background: WHITE, borderRight: collapsed ? 'none' : `1px solid ${P.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        zIndex: 1,
      }}>
        {!collapsed && (<>
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
            <button onClick={() => navigate('/projects')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', borderRadius: 8, marginTop: 8,
                border: `1.5px dashed ${P.accentBd}`, background: 'transparent',
                cursor: 'pointer', color: P.accent, transition: 'all 0.15s', fontFamily: FONT,
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
        </>)}
      </div>
    </div>
  )
}