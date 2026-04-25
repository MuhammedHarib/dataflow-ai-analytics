// src/components/sidebar/Sidebar.jsx
// Project-tree sidebar. Uses react-router useNavigate.
// Projects → Project subtree (Chats, Dashboards, Dataset)
// Dashboards are ONLY accessible through a project — no top-level dashboard nav.

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { projectsApi } from '../../api/client'

const S = {
  bg:       '#13151c',
  hover:    'rgba(255,255,255,0.05)',
  active:   'rgba(224,92,45,0.12)',
  activeBd: 'rgba(224,92,45,0.4)',
  border:   'rgba(255,255,255,0.07)',
  text:     'rgba(255,255,255,0.82)',
  muted:    'rgba(255,255,255,0.36)',
  dim:      'rgba(255,255,255,0.18)',
  accent:   '#e05c2d',
}
const W = { open: 240, closed: 58 }

const NavRow = ({ icon, label, active, onClick, depth = 0, badge, color, collapsed }) => (
  <div onClick={onClick} title={collapsed ? label : undefined}
    style={{
      display:'flex', alignItems:'center', gap:8,
      padding: collapsed ? '8px 0' : `7px ${8 + depth * 10}px`,
      justifyContent: collapsed ? 'center' : 'flex-start',
      borderRadius:7, cursor:'pointer', userSelect:'none',
      background: active ? S.active : 'transparent',
      borderLeft: active ? `2px solid ${color || S.accent}` : '2px solid transparent',
      transition:'background 0.12s', marginBottom:1,
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = S.hover }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
    <span style={{ fontSize:14, flexShrink:0, lineHeight:1, opacity: active ? 1 : 0.7 }}>{icon}</span>
    {!collapsed && (
      <>
        <span style={{
          fontSize:12, fontWeight: active ? 700 : 400,
          color: active ? (color || S.accent) : S.text,
          flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>{label}</span>
        {badge != null && (
          <span style={{ fontSize:9, fontWeight:700, color:S.muted,
            background:'rgba(255,255,255,0.07)', borderRadius:99, padding:'1px 6px' }}>{badge}</span>
        )}
      </>
    )}
  </div>
)

const SectionHeader = ({ icon, label, open, onToggle, collapsed, action }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6,
    padding: collapsed ? '6px 0' : '6px 8px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    cursor:'pointer', userSelect:'none' }}
    onClick={onToggle}>
    {!collapsed && (
      <span style={{ fontSize:9, color:S.dim, transition:'transform 0.15s',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink:0 }}>▶</span>
    )}
    <span style={{ fontSize:11, opacity:0.5 }}>{icon}</span>
    {!collapsed && (
      <>
        <span style={{ fontSize:10, fontWeight:700, color:S.muted,
          textTransform:'uppercase', letterSpacing:'0.6px', flex:1 }}>{label}</span>
        {action && (
          <span onClick={e => { e.stopPropagation(); action.fn() }}
            style={{ fontSize:14, color:S.muted, cursor:'pointer',
              width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center',
              borderRadius:4, transition:'all 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.color = S.accent}
            onMouseLeave={e => e.currentTarget.style.color = S.muted}>+</span>
        )}
      </>
    )}
  </div>
)

function ProjectNode({ project, activePage, collapsed }) {
  const navigate = useNavigate()
  const [open,      setOpen]      = useState(false)
  const [openChats, setOpenChats] = useState(false)
  const [openDash,  setOpenDash]  = useState(false)
  const [summary,   setSummary]   = useState(null)

  const isActiveProject = activePage?.projectId === project.id

  useEffect(() => {
    if (open && !summary) {
      projectsApi.summary(project.id).then(r => setSummary(r.data)).catch(() => {})
    }
  }, [open, project.id, summary])

  // Auto-open if this project is currently active
  useEffect(() => {
    if (isActiveProject && !open) setOpen(true)
  }, [isActiveProject])

  return (
    <div style={{ marginBottom:2 }}>
      <div onClick={() => { setOpen(o => !o); navigate(`/projects/${project.id}`) }}
        title={collapsed ? project.name : undefined}
        style={{
          display:'flex', alignItems:'center', gap:8,
          padding: collapsed ? '8px 0' : '8px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius:8, cursor:'pointer', userSelect:'none',
          background: isActiveProject ? S.active : 'transparent',
          borderLeft: isActiveProject ? `2px solid ${project.color}` : '2px solid transparent',
          transition:'background 0.12s',
        }}
        onMouseEnter={e => { if (!isActiveProject) e.currentTarget.style.background = S.hover }}
        onMouseLeave={e => { if (!isActiveProject) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ fontSize:16, flexShrink:0 }}>{project.icon}</span>
        {!collapsed && (
          <>
            <span style={{ fontSize:12, fontWeight:600,
              color: isActiveProject ? project.color : S.text,
              flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
            }}>{project.name}</span>
            <span style={{ fontSize:8, color:S.muted, transition:'transform 0.15s',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink:0 }}>▶</span>
          </>
        )}
      </div>

      {open && !collapsed && (
        <div style={{ paddingLeft:10, borderLeft:`1px solid ${S.border}`,
          marginLeft:14, marginTop:2, marginBottom:4 }}>

          {/* ── Dashboards ── */}
          <SectionHeader icon="📊" label="Dashboards" open={openDash}
            onToggle={() => setOpenDash(o => !o)}
            action={{ fn: () => navigate(`/projects/${project.id}/dashboards/new`) }}
            collapsed={false}/>
          {openDash && (
            <div style={{ paddingLeft:6 }}>
              {summary?.dashboards?.length ? summary.dashboards.map(d => (
                <NavRow key={d.id} icon={d.is_pinned ? '📌' : '📊'}
                  label={d.name} depth={1}
                  active={activePage?.view === 'dashboard' && Number(activePage?.dashboardId) === d.id}
                  onClick={() => navigate(`/projects/${project.id}/dashboards/${d.id}`)}/>
              )) : (
                <div style={{ fontSize:10, color:S.dim, padding:'4px 8px' }}>No dashboards yet</div>
              )}
              <NavRow icon="+" label="New Dashboard" depth={1} color={S.accent}
                onClick={() => navigate(`/projects/${project.id}/dashboards/new`)}/>
            </div>
          )}

          {/* ── Chats ── */}
          <SectionHeader icon="💬" label="Chats" open={openChats}
            onToggle={() => setOpenChats(o => !o)}
            action={{ fn: () => navigate(`/projects/${project.id}/chat`) }}
            collapsed={false}/>
          {openChats && (
            <div style={{ paddingLeft:6 }}>
              {summary?.chats?.length ? summary.chats.slice(0, 5).map(c => (
                <NavRow key={c.id} icon="💬" label={c.title || 'Untitled'} depth={1}
                  active={activePage?.view==='project-chat' && Number(activePage?.chatId)===c.id}
                  onClick={() => navigate(`/projects/${project.id}/chat/${c.id}`)}/>
              )) : (
                <div style={{ fontSize:10, color:S.dim, padding:'4px 8px' }}>No chats yet</div>
              )}
              <NavRow icon="+" label="New Chat" depth={1} color={S.accent}
                onClick={() => navigate(`/projects/${project.id}/chat`)}/>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ collapsed, onCollapse, activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = () => {
    projectsApi.list().then(r => setProjects(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Re-fetch on project-related navigation
  useEffect(() => {
    if (location.pathname === '/projects') load()
  }, [location.pathname])

  const isChat     = location.pathname === '/'
  const isProjects = location.pathname === '/projects'

  return (
    <div style={{
      width: collapsed ? W.closed : W.open, minWidth: collapsed ? W.closed : W.open,
      background: S.bg, borderRight:`1px solid ${S.border}`,
      display:'flex', flexDirection:'column', height:'100vh',
      transition:'width 0.2s ease, min-width 0.2s ease',
      overflow:'hidden', position:'relative',
    }}>

      {/* Logo + collapse */}
      <div style={{ display:'flex', alignItems:'center',
        padding: collapsed ? '16px 0' : '16px 14px',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom:`1px solid ${S.border}`, flexShrink:0 }}>
        {!collapsed && (
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:28, height:28, borderRadius:7,
              background:`linear-gradient(135deg, ${S.accent}, #f0a060)`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🔥</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:S.text, lineHeight:1.1 }}>DataFlow</div>
              <div style={{ fontSize:9, color:S.muted, letterSpacing:'0.5px' }}>AI ANALYTICS</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width:28, height:28, borderRadius:7,
            background:`linear-gradient(135deg, ${S.accent}, #f0a060)`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🔥</div>
        )}
        <button onClick={onCollapse} style={{ width:24, height:24, borderRadius:5,
          background:'transparent', border:'none', color:S.muted, cursor:'pointer',
          fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Top nav — Chat + Projects only */}
      <div style={{ padding: collapsed ? '10px 6px' : '10px 10px 4px', flexShrink:0 }}>
        <NavRow icon="💬" label="AI Workspace"
          active={isChat}
          onClick={() => navigate('/')}
          collapsed={collapsed}/>
        <NavRow icon="⊞" label="Projects"
          active={isProjects}
          onClick={() => navigate('/projects')}
          collapsed={collapsed}/>
      </div>

      <div style={{ height:1, background:S.border, margin:'4px 10px', flexShrink:0 }}/>

      {/* Projects tree */}
      <div style={{ flex:1, overflowY:'auto', padding: collapsed ? '4px 6px' : '4px 10px' }}>
        {!collapsed && (
          <div style={{ fontSize:10, fontWeight:700, color:S.dim,
            textTransform:'uppercase', letterSpacing:'0.7px', padding:'6px 8px 4px' }}>Projects</div>
        )}

        {loading ? (
          <div style={{ fontSize:11, color:S.dim, padding:'12px 8px',
            textAlign: collapsed ? 'center' : 'left' }}>{collapsed ? '…' : 'Loading…'}</div>
        ) : projects.length === 0 ? (
          !collapsed && (
            <div style={{ fontSize:11, color:S.dim, padding:'8px 8px 4px', lineHeight:1.5 }}>
              No projects yet.<br/>Create your first one.
            </div>
          )
        ) : (
          projects.map(p => (
            <ProjectNode key={p.id} project={p} activePage={activePage} collapsed={collapsed}/>
          ))
        )}

        {/* New project */}
        <div onClick={() => navigate('/projects')}
          title={collapsed ? 'New Project' : undefined}
          style={{ display:'flex', alignItems:'center', gap:8,
            padding: collapsed ? '8px 0' : '8px 10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius:8, cursor:'pointer',
            border:`1px dashed rgba(224,92,45,0.3)`, marginTop:6, transition:'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(224,92,45,0.08)'; e.currentTarget.style.borderColor='rgba(224,92,45,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(224,92,45,0.3)' }}>
          <span style={{ fontSize:14, color:S.accent }}>+</span>
          {!collapsed && <span style={{ fontSize:12, color:S.accent, fontWeight:600 }}>New Project</span>}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: collapsed ? '8px 6px' : '8px 10px',
        borderTop:`1px solid ${S.border}`, flexShrink:0 }}>
        <NavRow icon="⚙️" label="Settings" active={false}
          onClick={() => {}} collapsed={collapsed}/>
      </div>
    </div>
  )
}