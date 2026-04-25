// src/layouts/AppShell.jsx
import React, { useState } from 'react'
import Sidebar from '../components/sidebar/Sidebar'

const T = {
  bg:     '#0e1018',
  topbar: '#13151e',
  border: 'rgba(255,255,255,0.07)',
  text:   'rgba(255,255,255,0.88)',
  muted:  'rgba(255,255,255,0.35)',
  accent: '#e05c2d',
}

export default function AppShell({ children, activePage }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: T.bg,
      fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
      color: T.text, overflow: 'hidden',
    }}>
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(c => !c)} activePage={activePage}/>

      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* ── Topbar ─────────────────────────────────────────────── */}
        <div style={{
          height: 54, background: T.topbar,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12, flexShrink: 0,
        }}>

          {/* Search — takes available space, max 480px, not fixed-centered */}
          <div style={{
            flex: '1 1 0',       /* grows but can shrink */
            minWidth: 120,
            maxWidth: 480,
            height: 36,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,0.09)`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center',
            gap: 8, padding: '0 12px',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" style={{ color:'rgba(255,255,255,0.28)', flexShrink:0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Search projects, dashboards, chats…"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: T.text, fontSize: 13, flex: 1, minWidth: 0,
              }}/>
            <span style={{
              fontSize: 10, color: 'rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 5, padding: '2px 6px', flexShrink: 0,
              fontFamily: 'monospace',
            }}>⌘K</span>
          </div>

          {/* Spacer — pushes right actions to the right */}
          <div style={{ flex: '1 0 0' }}/>

          {/* Right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <span style={{ fontSize: 11, color: T.muted, whiteSpace:'nowrap' }}>
              {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
            </span>

            <button style={{
              width:34, height:34, borderRadius:9,
              background:'rgba(255,255,255,0.04)', border:`1px solid ${T.border}`,
              color:'rgba(255,255,255,0.4)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'all 0.15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>

            <div style={{
              width:34, height:34, borderRadius:9,
              background:`linear-gradient(135deg, ${T.accent}55, ${T.accent}22)`,
              border:`1px solid ${T.accent}55`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:12, fontWeight:800, color:T.accent, cursor:'pointer',
            }}>MH</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:'auto', position:'relative' }}>
          {children}
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.22); }
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  )
}