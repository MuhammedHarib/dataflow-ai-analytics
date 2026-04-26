// src/layouts/AppShell.jsx
// Design: "Refined Monochrome Pro" — matches Sidebar
// FIXES: removed Google Fonts @import (offline-safe system font stack)
// White topbar + #f7f7f8 content bg + Lucide icons

import React, { useState } from 'react'
import { Search, Bell, Command } from 'lucide-react'
import Sidebar from '../components/sidebar/Sidebar'

// Offline-safe — no network request
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

const T = {
  pageBg:    '#f7f7f8',
  topbar:    '#ffffff',
  border:    '#ebebed',
  text:      '#0f1117',
  muted:     '#6b7280',
  dim:       '#a1a1aa',
  inputBg:   '#f4f4f6',
  accent:    '#6366f1',
  accentBg:  '#eef2ff',
  accentBd:  '#c7d2fe',
}

// ─── Topbar icon button ───────────────────────────────────────────
function TopbarBtn({ icon: Icon, tooltip, badge, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={tooltip}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hov ? '#f4f4f6' : 'transparent',
        border: `1px solid ${hov ? '#d4d4d8' : T.border}`,
        color: hov ? T.text : T.muted,
        cursor: 'pointer', outline: 'none', position: 'relative',
        transition: 'all 0.15s', flexShrink: 0,
        fontFamily: FONT,
      }}
    >
      <Icon size={14} strokeWidth={1.8} />
      {badge && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 6, height: 6, borderRadius: '50%',
          background: T.accent,
          border: '1.5px solid #ffffff',
        }} />
      )}
    </button>
  )
}

// ─── Shell ────────────────────────────────────────────────────────
export default function AppShell({ children, activePage }) {
  const [collapsed,    setCollapsed]    = useState(false)
  const [searchFocus,  setSearchFocus]  = useState(false)

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: T.pageBg,
      fontFamily: FONT,
      color: T.text, overflow: 'hidden',
    }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar              { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track        { background: transparent; }
        ::-webkit-scrollbar-thumb        { background: #d4d4d8; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover  { background: #a1a1aa; }
        input::placeholder, textarea::placeholder { color: #a1a1aa; }
        button { font-family: inherit; }
      `}</style>

      <Sidebar
        collapsed={collapsed}
        onCollapse={() => setCollapsed(c => !c)}
        activePage={activePage}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Topbar ─────────────────────────────────────────── */}
        <header style={{
          height: 52, background: T.topbar,
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>

          {/* Search */}
          <div style={{
            flex: '1 1 0', minWidth: 120, maxWidth: 440, height: 34,
            background: searchFocus ? '#ffffff' : T.inputBg,
            border: `1px solid ${searchFocus ? T.accent : T.border}`,
            borderRadius: 9,
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px',
            transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
            boxShadow: searchFocus ? `0 0 0 3px rgba(99,102,241,0.15)` : 'none',
            cursor: 'text',
          }}>
            <Search
              size={13} strokeWidth={2}
              style={{ color: searchFocus ? T.accent : T.dim, flexShrink: 0, transition: 'color 0.15s' }}
            />
            <input
              placeholder="Search projects, dashboards, chats…"
              onFocus={() => setSearchFocus(true)}
              onBlur={()  => setSearchFocus(false)}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: T.text, fontSize: 13, flex: 1, minWidth: 0,
                fontFamily: FONT, fontWeight: 400,
              }}
            />
            {/* ⌘K hint — fades when focused */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 2,
              background: T.topbar, border: `1px solid ${T.border}`,
              borderRadius: 6, padding: '2px 6px', flexShrink: 0,
              opacity: searchFocus ? 0 : 1, transition: 'opacity 0.15s',
              pointerEvents: 'none',
            }}>
              <Command size={9} strokeWidth={2} style={{ color: T.dim }} />
              <span style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace', lineHeight: 1 }}>K</span>
            </div>
          </div>

          <div style={{ flex: '1 0 0' }} />

          {/* Right cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 12, color: T.dim, whiteSpace: 'nowrap',
              fontWeight: 400, letterSpacing: '-0.01em',
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>

            <div style={{ width: 1, height: 18, background: T.border, flexShrink: 0 }} />

            <TopbarBtn icon={Bell} tooltip="Notifications" badge />

            {/* Avatar */}
            <div
              title="Account"
              style={{
                width: 32, height: 32, borderRadius: 9,
                background: T.accentBg,
                border: `1.5px solid ${T.accentBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: T.accent, cursor: 'pointer',
                letterSpacing: '0.02em', userSelect: 'none',
                transition: 'box-shadow 0.15s', fontFamily: FONT,
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 0 3px rgba(99,102,241,0.2)`}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >MH</div>
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────── */}
        <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  )
}