// src/components/dashboards/DashboardBuilder.jsx
// Light theme redesign — all logic 100% preserved, only visual tokens changed
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GridLayout from 'react-grid-layout'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { dashboardsApi, datasetsApi, projectsApi } from '../../api/client'

// ── Light design tokens ──────────────────────────────────────────────────────
const L = {
  pageBg:      '#F7F8FA',
  card:        '#FFFFFF',
  cardHov:     '#FAFAFA',
  border:      '#E5E7EB',
  borderHov:   '#D1D5DB',
  text:        '#111827',
  textSub:     '#6B7280',
  textDim:     '#9CA3AF',
  accent:      '#6366f1',
  accentBg:    '#EEF2FF',
  accentBd:    '#C7D2FE',
  accentHov:   '#4F46E5',
  green:       '#10B981',
  greenBg:     '#ECFDF5',
  red:         '#EF4444',
  redBg:       '#FEF2F2',
  amber:       '#F59E0B',
  amberBg:     '#FFFBEB',
  font:        "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
}

// ── Themes ───────────────────────────────────────────────────────────────────
// Light is the new default. All dark themes preserved for user switching.
const SCHEMES = {
  'Light':       { bg: L.pageBg, card: L.card, border: L.border, text: L.text, muted: L.textSub, dim: L.textDim, accent: L.accent, accent2: '#818CF8', palette: ['#6366f1','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16','#F97316'], pos: '#10B981', neg: '#EF4444', isLight: true },
  'Metric Flow': { bg:'#111318', card:'#1a1d28', border:'rgba(255,255,255,0.08)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.4)', dim:'rgba(255,255,255,0.2)', accent:'#e05c2d', accent2:'#6366f1', palette:['#e05c2d','#6366f1','#f59e0b','#10b981','#ec4899','#06b6d4','#84cc16','#f97316'], pos:'#10b981', neg:'#e05c2d', isLight: false },
  'Neon Dark':   { bg:'#0d0f1a', card:'#131626', border:'rgba(255,255,255,0.07)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.4)', dim:'rgba(255,255,255,0.2)', accent:'#00ffb4', accent2:'#4f8cff', palette:['#00ffb4','#4f8cff','#ffd93d','#ff6b6b','#c77dff','#00d4ff','#43e97b','#fa8231'], pos:'#00ffb4', neg:'#ff6b6b', isLight: false },
  'Ocean Blue':  { bg:'#050d1a', card:'#091428', border:'rgba(99,179,237,0.12)', text:'rgba(255,255,255,0.92)', muted:'rgba(255,255,255,0.38)', dim:'rgba(255,255,255,0.18)', accent:'#63b3ed', accent2:'#4fd1c5', palette:['#63b3ed','#4fd1c5','#f6ad55','#fc8181','#b794f4','#68d391','#fbd38d','#9ae6b4'], pos:'#68d391', neg:'#fc8181', isLight: false },
  'Solar Gold':  { bg:'#12100a', card:'#1c1810', border:'rgba(245,163,26,0.1)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.38)', dim:'rgba(255,255,255,0.18)', accent:'#f5a31a', accent2:'#f0c040', palette:['#f5a31a','#f0c040','#3ecfb2','#5b8cff','#a68cff','#3dd68c','#f97272','#e2e8f0'], pos:'#3dd68c', neg:'#f97272', isLight: false },
  'Rose Quartz': { bg:'#110d12', card:'#1a1220', border:'rgba(236,72,153,0.1)', text:'rgba(255,255,255,0.92)', muted:'rgba(255,255,255,0.38)', dim:'rgba(255,255,255,0.18)', accent:'#ec4899', accent2:'#a78bfa', palette:['#ec4899','#a78bfa','#f59e0b','#10b981','#06b6d4','#f97316','#84cc16','#fb923c'], pos:'#10b981', neg:'#f97316', isLight: false },
  'Cyberpunk':   { bg:'#08050f', card:'#100d1a', border:'rgba(255,255,0,0.08)', text:'#fff', muted:'rgba(255,255,255,0.4)', dim:'rgba(255,255,255,0.18)', accent:'#ffff00', accent2:'#ff00ff', palette:['#ffff00','#ff00ff','#00ffff','#ff6600','#00ff88','#ff0066','#6600ff','#ffaa00'], pos:'#00ff88', neg:'#ff0066', isLight: false },
}

const CHART_TYPES = [
  { id:'kpi',     label:'KPI Card', w:3,  h:3 },
  { id:'bar',     label:'Bar',      w:6,  h:5 },
  { id:'line',    label:'Line',     w:6,  h:5 },
  { id:'area',    label:'Area',     w:6,  h:5 },
  { id:'pie',     label:'Pie',      w:5,  h:5 },
  { id:'donut',   label:'Donut',    w:5,  h:5 },
  { id:'scatter', label:'Scatter',  w:6,  h:5 },
  { id:'radar',   label:'Radar',    w:5,  h:5 },
  { id:'table',   label:'Table',    w:12, h:7 },
  { id:'ranking', label:'Ranking',  w:4,  h:5 },
]

const CHART_ICON_PATHS = {
  kpi:     'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83|circle:12,12,4',
  bar:     'M3 3v18h18M7 16v-5M11 16V9M15 16v-3M19 16V7',
  line:    'M3 17l4-8 4 4 4-6 4 3',
  area:    'M3 17l4-8 4 4 4-6 4 3v4H3z',
  pie:     'M12 2a10 10 0 1 0 10 10H12V2z',
  donut:   'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-4a6 6 0 1 1 0-12 6 6 0 0 1 0 12z',
  scatter: 'M3 3l18 18',
  radar:   'M12 2L22 8.5v7L12 22l-10-6.5v-7L12 2z',
  table:   'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zM3 10h18M10 3v18',
  ranking: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
}

function ChartIcon({ type, color, size = 12 }) {
  const path = CHART_ICON_PATHS[type] || CHART_ICON_PATHS.bar
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ pointerEvents: 'none', flexShrink: 0 }}>
      {path.split('|').map((p, i) => {
        if (p.startsWith('circle:')) {
          const parts = p.slice(7).split(',')
          return <circle key={i} cx={parts[0]} cy={parts[1]} r={parts[2]} />
        }
        return <path key={i} d={p} />
      })}
    </svg>
  )
}

const fmtN = v => {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

// ── computeWidgetData (unchanged logic) ─────────────────────────────────────
function computeWidgetData(rawData, cfg, filters) {
  if (!rawData?.rows?.length) return []
  let rows = rawData.rows
  filters.forEach(f => {
    rows = rows.filter(r => {
      const v = r[f.col]
      const sv = String(v ?? '').toLowerCase()
      const fv = String(f.val ?? '').toLowerCase()
      switch (f.op) {
        case '=':        return sv === fv
        case '!=':       return sv !== fv
        case '>':        return Number(v) > Number(f.val)
        case '<':        return Number(v) < Number(f.val)
        case '>=':       return Number(v) >= Number(f.val)
        case '<=':       return Number(v) <= Number(f.val)
        case 'contains': return sv.includes(fv)
        default: return true
      }
    })
  })
  if (cfg.type === 'table') {
    const cols = cfg.columns?.length ? cfg.columns : rawData.headers
    let result = rows.map(r => { const o = {}; cols.forEach(c => { o[c] = r[c] }); return o })
    if (cfg.sortBy) {
      result.sort((a, b) => {
        const av = a[cfg.sortBy], bv = b[cfg.sortBy]
        const na = Number(av), nb = Number(bv)
        if (!isNaN(na) && !isNaN(nb)) return cfg.sortDir === 'asc' ? na - nb : nb - na
        return cfg.sortDir === 'asc'
          ? String(av ?? '').localeCompare(String(bv ?? ''))
          : String(bv ?? '').localeCompare(String(av ?? ''))
      })
    }
    return result
  }
  if (cfg.type === 'kpi') {
    const col = cfg.y_col || cfg.x_col
    if (!col) return [{ value: rows.length }]
    const nums = rows.map(r => Number(r[col]) || 0)
    const agg = cfg.aggregation || 'sum'
    let value = agg === 'sum'   ? nums.reduce((a, b) => a + b, 0)
      : agg === 'avg'   ? (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0)
      : agg === 'count' ? rows.length
      : agg === 'min'   ? Math.min(...nums)
      : agg === 'max'   ? Math.max(...nums)
      : rows.length
    return [{ value: Math.round(value * 100) / 100 }]
  }
  if (cfg.type === 'scatter') {
    const xc = cfg.x_col, yc = cfg.y_col
    if (!xc || !yc) return []
    return rows.slice(0, 200).map(r => ({ x: Number(r[xc]) || 0, y: Number(r[yc]) || 0 }))
  }
  if (!cfg.x_col) return []
  const groups = {}
  rows.forEach(r => {
    const key = String(r[cfg.x_col] ?? '(empty)')
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })
  const yCol = cfg.y_col
  const agg  = cfg.aggregation || 'sum'
  let result = Object.entries(groups).map(([name, gRows]) => {
    let value
    if (!yCol) {
      value = gRows.length
    } else {
      const nums = gRows.map(r => Number(r[yCol]) || 0)
      value = agg === 'sum'   ? nums.reduce((a, b) => a + b, 0)
        : agg === 'avg'   ? (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0)
        : agg === 'count' ? gRows.length
        : agg === 'min'   ? Math.min(...nums)
        : agg === 'max'   ? Math.max(...nums)
        : gRows[0]?.[yCol]
    }
    return { name, value: typeof value === 'number' ? Math.round(value * 100) / 100 : value }
  })
  result.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
  if (cfg.topN) result = result.slice(0, cfg.topN)
  return result
}

function computeSchema(rd) {
  if (!rd?.headers?.length) return null
  const numeric = rd.headers.filter(h =>
    rd.rows.slice(0, 20).some(r => typeof r[h] === 'number' || (!isNaN(Number(r[h])) && String(r[h]).trim() !== ''))
  )
  const dates = rd.headers.filter(h =>
    rd.rows.slice(0, 5).some(r => /\d{4}/.test(String(r[h] ?? '')))
  )
  const categorical = rd.headers.filter(h => !numeric.includes(h))
  return { numeric, dates, categorical, all: rd.headers }
}

// ── KPI color palette — cycles per widget index to differentiate cards ────────
const KPI_PALETTES = [
  { accent: '#6366f1', bg: '#EEF2FF', bd: '#C7D2FE', icon: '#6366f1' },  // indigo
  { accent: '#10B981', bg: '#ECFDF5', bd: '#A7F3D0', icon: '#10B981' },  // green
  { accent: '#F59E0B', bg: '#FFFBEB', bd: '#FDE68A', icon: '#F59E0B' },  // amber
  { accent: '#EC4899', bg: '#FDF2F8', bd: '#FBCFE8', icon: '#EC4899' },  // pink
  { accent: '#06B6D4', bg: '#ECFEFF', bd: '#A5F3FC', icon: '#06B6D4' },  // cyan
  { accent: '#8B5CF6', bg: '#F5F3FF', bd: '#DDD6FE', icon: '#8B5CF6' },  // purple
]

// Derive a stable palette index from the widget id string
function kpiPaletteIndex(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % KPI_PALETTES.length
}

// ── KPIWidget — rich, color-differentiated, modern ───────────────────────────
function KPIWidget({ cfg, data, S }) {
  const value     = data?.[0]?.value ?? 0
  const change    = Number(cfg.change ?? 0)
  const up        = change >= 0
  const threshold = cfg.threshold ? Number(cfg.threshold) : null
  const aboveThreshold = threshold != null && value > threshold
  const belowThreshold = threshold != null && value < threshold

  // Pick palette — light theme gets rich color-per-card treatment
  // Dark themes use the scheme accent uniformly
  const pal = S.isLight
    ? KPI_PALETTES[kpiPaletteIndex(cfg.id)]
    : { accent: S.accent, bg: `${S.accent}14`, bd: `${S.accent}30`, icon: S.accent }

  const valueColor = aboveThreshold ? (cfg.aboveColor || S.pos)
    : belowThreshold ? (cfg.belowColor || S.neg)
    : S.isLight ? pal.accent : S.text

  // Sparkline mini bars — decorative, derived from value magnitude
  const spark = [0.4, 0.6, 0.5, 0.8, 0.65, 0.9, 0.75, 1.0]

  return (
    <div style={{
      height: '100%',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      background: S.isLight ? '#FFFFFF' : S.card,
    }}>
      {/* Bold left accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
        background: pal.accent,
        borderRadius: '14px 0 0 14px',
      }} />

      {/* Subtle tinted bg wash on light */}
      {S.isLight && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 4,
          background: `linear-gradient(135deg, ${pal.bg} 0%, #ffffff 60%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '18px 18px 14px 22px',
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* Top row: icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: pal.bg,
            border: `1.5px solid ${pal.bd}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke={pal.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18M7 12v5M12 8v9M17 5v12" />
            </svg>
          </div>
          {/* Mini sparkline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, opacity: 0.5 }}>
            {spark.map((h, i) => (
              <div key={i} style={{
                width: 4, borderRadius: 2,
                height: `${h * 100}%`,
                background: pal.accent,
              }} />
            ))}
          </div>
        </div>

        {/* Label */}
        <div style={{
          fontSize: 11, fontWeight: 600, color: S.muted,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cfg.title || 'Metric'}
        </div>

        {/* Value — large, bold, colored */}
        <div style={{
          fontSize: 30, fontWeight: 800,
          color: valueColor,
          letterSpacing: '-1.5px', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 12,
          flex: 1, display: 'flex', alignItems: 'center',
        }}>
          {fmtN(value)}
        </div>

        {/* Footer: trend chip + threshold */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {change !== 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700,
              color: up ? '#059669' : '#DC2626',
              background: up ? '#D1FAE5' : '#FEE2E2',
              border: `1px solid ${up ? '#A7F3D0' : '#FECACA'}`,
              borderRadius: 99, padding: '3px 10px',
            }}>
              {up ? '↑' : '↓'} {up ? '+' : ''}{change.toFixed(1)}%
            </span>
          )}
          {change === 0 && (
            <span style={{
              fontSize: 11, color: S.muted,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pal.accent, display: 'inline-block' }} />
              {cfg.y_col || 'metric'}
            </span>
          )}
          {threshold != null && (
            <span style={{
              fontSize: 10, color: S.dim || S.muted,
              borderLeft: `2px solid ${S.border}`, paddingLeft: 7,
            }}>
              vs {fmtN(threshold)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ChartWidget — light theme ────────────────────────────────────────────────
function ChartWidget({ cfg, data, S, onDrillDown }) {
  if (!data?.length) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${S.accent}10`,
        border: `1px dashed ${S.accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ChartIcon type={cfg.type} color={`${S.accent}88`} size={16} />
      </div>
      <div style={{ fontSize: 11, color: S.dim || S.muted, textAlign: 'center' }}>
        {cfg.x_col ? 'No data' : 'Click ⚙ to configure'}
      </div>
    </div>
  )

  const PAL = S.palette
  const isLight = S.isLight

  // Light-aware axis / grid / tooltip styles
  const ap = {
    tick: { fontSize: 10, fill: S.muted },
    axisLine: false,
    tickLine: false,
  }
  const gp = {
    stroke: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.04)',
    strokeDasharray: '3 3',
    vertical: false,
  }
  const tt = {
    contentStyle: {
      background: S.card,
      border: `1px solid ${S.border}`,
      borderRadius: 10, fontSize: 11,
      color: S.text,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    },
    labelStyle: { color: S.muted },
    itemStyle: { color: S.text },
  }
  const mg = { top: 12, right: 12, left: -8, bottom: 8 }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const tfmt = v => {
    const s = String(v)
    const dm = s.match(/^\d{4}-(\d{2})-(\d{2})/)
    if (dm) return `${MONTHS[parseInt(dm[1])-1]} ${dm[2]}`
    const ym = s.match(/^\d{4}-(\d{2})$/)
    if (ym) return `${MONTHS[parseInt(ym[1])-1]}`
    return s.length > 8 ? s.slice(0, 8) + '…' : s
  }

  const handleClick = entry => {
    if (onDrillDown && cfg.x_col && entry?.name) onDrillDown(cfg.x_col, entry.name)
  }

  if (cfg.type === 'line') return (
    <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={mg}>
          <CartesianGrid {...gp} horizontal vertical={false} />
          <XAxis dataKey="name" {...ap} tickFormatter={tfmt} />
          <YAxis {...ap} tickFormatter={fmtN} width={38} />
          <Tooltip {...tt} />
          <Line dataKey="value" stroke={PAL[0]} strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: PAL[0], stroke: S.card, strokeWidth: 2 }} />
          {cfg.showAvg && (() => {
            const avg = data.reduce((s, d) => s + (Number(d.value) || 0), 0) / data.length
            return <ReferenceLine y={avg} stroke={`${PAL[1]}88`} strokeDasharray="4 2"
              label={{ value: `avg ${fmtN(avg)}`, fill: PAL[1], fontSize: 9, position: 'insideTopRight' }} />
          })()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'area') return (
    <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={mg}>
          <defs>
            <linearGradient id={`ag_${cfg.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PAL[0]} stopOpacity={isLight ? 0.25 : 0.4} />
              <stop offset="90%" stopColor={PAL[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gp} horizontal vertical={false} />
          <XAxis dataKey="name" {...ap} tickFormatter={tfmt} />
          <YAxis {...ap} tickFormatter={fmtN} width={38} />
          <Tooltip {...tt} />
          <Area dataKey="value" stroke={PAL[0]} fill={`url(#ag_${cfg.id})`} strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: PAL[0], stroke: S.card, strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'bar') return (
    <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={mg} barCategoryGap="28%" barGap={2}>
          <defs>
            {PAL.map((color, i) => (
              <linearGradient key={i} id={`barGrad_${cfg.id}_${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={isLight ? 1 : 0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={isLight ? 0.65 : 0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...gp} horizontal vertical={false} />
          <XAxis dataKey="name" {...ap} tickFormatter={tfmt}
            interval={data.length > 12 ? Math.floor(data.length / 8) : 0}
            angle={data.length > 10 ? -35 : 0}
            textAnchor={data.length > 10 ? 'end' : 'middle'}
            height={data.length > 10 ? 48 : 24} />
          <YAxis {...ap} tickFormatter={fmtN} width={42} />
          <Tooltip {...tt} cursor={{ fill: isLight ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.04)', radius: [4,4,0,0] }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}
            cursor={onDrillDown ? 'pointer' : 'default'} onClick={handleClick}>
            {data.map((d, i) => {
              let fill = `url(#barGrad_${cfg.id}_${i % PAL.length})`
              if (cfg.threshold && cfg.belowColor && Number(d.value) < Number(cfg.threshold)) fill = cfg.belowColor
              if (cfg.threshold && cfg.aboveColor && Number(d.value) > Number(cfg.threshold)) fill = cfg.aboveColor
              return <Cell key={i} fill={fill} />
            })}
          </Bar>
          {cfg.threshold && (
            <ReferenceLine y={Number(cfg.threshold)} stroke={S.neg} strokeDasharray="4 2" strokeWidth={1.5}
              label={{ value: `${fmtN(cfg.threshold)}`, fill: S.neg, fontSize: 9, position: 'insideTopRight' }} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'pie' || cfg.type === 'donut') {
    const inner = cfg.type === 'donut' ? 60 : 0
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
    return (
      <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius="68%" innerRadius={`${inner}%`} paddingAngle={2}
              onClick={handleClick}>
              {data.map((_, i) => <Cell key={i} fill={PAL[i % PAL.length]} />)}
            </Pie>
            <Tooltip {...tt} formatter={(v) => [fmtN(v), `${((v / total) * 100).toFixed(1)}%`]} />
            <Legend wrapperStyle={{ fontSize: 10, color: S.muted }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (cfg.type === 'radar') return (
    <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke={isLight ? '#E5E7EB' : 'rgba(255,255,255,0.08)'} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: S.muted }} />
          <PolarRadiusAxis tick={false} />
          <Radar dataKey="value" stroke={PAL[0]} fill={PAL[0]} fillOpacity={0.2} strokeWidth={2} />
          <Tooltip {...tt} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'scatter') return (
    <div style={{ width:'100%', height:'100%', minWidth:0, minHeight:0, overflow:'hidden' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={mg}>
          <CartesianGrid {...gp} />
          <XAxis dataKey="x" {...ap} tickFormatter={fmtN} name={cfg.x_col} />
          <YAxis dataKey="y" {...ap} tickFormatter={fmtN} name={cfg.y_col} />
          <Tooltip {...tt} formatter={(v, n) => [fmtN(v), n]} />
          <Scatter data={data} fill={PAL[0]} opacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )

  // ranking
  const sorted = [...data].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 10)
  const max = sorted[0]?.value || 1
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 2px' }}>
      {sorted.map((row, i) => (
        <div key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.12s' }}
          onClick={() => handleClick(row)}
          onMouseEnter={e => e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: S.dim || S.muted, flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: S.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
            <div style={{ height: 4, background: isLight ? '#F3F4F6' : S.border, borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${(Number(row.value) / Number(max)) * 100}%`, background: PAL[i % PAL.length], borderRadius: 99, transition: 'width 0.4s' }} />
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: S.muted, flexShrink: 0, fontFamily: 'monospace' }}>{fmtN(row.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── TableWidget — light theme ─────────────────────────────────────────────────
function TableWidget({ cfg, data, S }) {
  const [colFilters, setColFilters] = useState({})
  const [sortBy,     setSortBy]     = useState(cfg.sortBy || '')
  const [sortDir,    setSortDir]    = useState(cfg.sortDir || 'desc')
  const [page,       setPage]       = useState(0)
  const PAGE_SIZE = 20
  const isLight = S.isLight

  if (!data?.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: S.muted, fontSize: 12 }}>No data</div>
  )

  const cols = Object.keys(data[0] || {})
  let rows = data
  Object.entries(colFilters).forEach(([col, val]) => {
    if (!val) return
    rows = rows.filter(r => String(r[col] ?? '').toLowerCase().includes(val.toLowerCase()))
  })
  if (sortBy) {
    rows = [...rows].sort((a, b) => {
      const av = a[sortBy], bv = b[sortBy]
      const na = Number(av), nb = Number(bv)
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''))
    })
  }
  const totalPages = Math.ceil(rows.length / PAGE_SIZE)
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const inputStyle = {
    minWidth: 80, maxWidth: 130,
    background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${S.border}`,
    borderRadius: 7, color: S.text,
    fontSize: 11, padding: '5px 8px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Column filters */}
      <div style={{ display: 'flex', gap: 5, padding: '8px 10px', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${S.border}` }}>
        {cols.map(col => (
          <input key={col} placeholder={`${col}…`} value={colFilters[col] || ''}
            onChange={e => { setColFilters(p => ({ ...p, [col]: e.target.value })); setPage(0) }}
            style={inputStyle} />
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: isLight ? '#F9FAFB' : S.card, zIndex: 1 }}>
              {cols.map(col => (
                <th key={col}
                  onClick={() => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('desc') } }}
                  style={{
                    padding: '9px 12px', textAlign: 'left',
                    color: S.muted, fontWeight: 600, fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
                    borderBottom: `1px solid ${S.border}`,
                  }}>
                  {col} {sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri}
                style={{ borderBottom: `1px solid ${isLight ? '#F9FAFB' : 'rgba(255,255,255,0.03)'}` }}
                onMouseEnter={e => e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cols.map(col => {
                  const v = row[col]
                  const isNum = typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')
                  return (
                    <td key={col} style={{
                      padding: '8px 12px', color: S.text,
                      textAlign: isNum ? 'right' : 'left',
                      fontFamily: isNum ? 'monospace' : 'inherit',
                    }}>
                      {isNum ? fmtN(v) : String(v ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderTop: `1px solid ${S.border}`, flexShrink: 0,
          background: isLight ? '#F9FAFB' : 'transparent',
        }}>
          <span style={{ fontSize: 11, color: S.muted }}>{rows.length.toLocaleString()} rows · Page {page + 1}/{totalPages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['<', '>'].map((lbl, idx) => {
              const disabled = idx === 0 ? page === 0 : page >= totalPages - 1
              return (
                <button key={lbl}
                  onClick={() => setPage(p => idx === 0 ? Math.max(0, p - 1) : Math.min(totalPages - 1, p + 1))}
                  disabled={disabled}
                  style={{
                    width: 26, height: 26, borderRadius: 6,
                    border: `1px solid ${S.border}`,
                    background: isLight ? '#fff' : 'transparent',
                    color: disabled ? S.dim || S.muted : S.text,
                    cursor: disabled ? 'default' : 'pointer', fontSize: 12,
                  }}>{lbl}</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── WidgetCard — modern, professional, strong visual presence ────────────────
function WidgetCard({ cfg, rawData, allFilters, editMode, onEdit, onRemove, onDrillDown, onExpand, S }) {
  const data    = useMemo(() => computeWidgetData(rawData, cfg, allFilters), [rawData, cfg, allFilters])
  const isTable = cfg.type === 'table'
  const isKPI   = cfg.type === 'kpi'
  const isLight = S.isLight

  // For KPI cards, pass through to KPIWidget with no wrapper chrome
  if (isKPI) {
    return (
      <div style={{
        height: '100%',
        background: isLight ? '#FFFFFF' : S.card,
        border: `1px solid ${isLight ? '#E5E7EB' : S.border}`,
        borderRadius: 14, overflow: 'hidden',
        position: 'relative',
        boxShadow: isLight
          ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)'
          : '0 2px 16px rgba(0,0,0,0.25)',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = isLight
            ? '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(99,102,241,0.15)'
            : `0 8px 32px rgba(0,0,0,0.4)`
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = isLight
            ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)'
            : '0 2px 16px rgba(0,0,0,0.25)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}>
        {/* Edit/remove overlay buttons — top right, only in edit mode */}
        {editMode && (
          <div className="drag-handle" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10, cursor: 'grab',
          }}>
            <div style={{
              position: 'absolute', top: 8, right: 8,
              display: 'flex', gap: 4, zIndex: 11,
            }}>
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid #E5E7EB',
                  color: '#6B7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(4px)',
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ pointerEvents: 'none' }}>
                  <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-8.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-12.1 1.4 1.4m9.9 9.9 1.4 1.4" />
                </svg>
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRemove() }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(254,242,242,0.95)',
                  border: '1px solid #FECACA',
                  color: '#EF4444', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ pointerEvents: 'none' }}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <KPIWidget cfg={cfg} data={data} S={S} />
      </div>
    )
  }

  // Chart / table cards
  const typeColors = {
    bar:     '#6366f1', line:    '#10B981', area:    '#06B6D4',
    pie:     '#F59E0B', donut:   '#EC4899', scatter: '#8B5CF6',
    radar:   '#F97316', table:   '#6B7280', ranking: '#EF4444',
  }
  const typeColor = isLight ? (typeColors[cfg.type] || S.accent) : S.accent

  return (
    <div style={{
      height: '100%',
      background: isLight ? '#FFFFFF' : S.card,
      border: `1px solid ${isLight ? '#E5E7EB' : S.border}`,
      borderRadius: 14, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      boxShadow: isLight
        ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)'
        : '0 2px 16px rgba(0,0,0,0.25)',
      transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = isLight
          ? '0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(99,102,241,0.15)'
          : `0 8px 32px rgba(0,0,0,0.4)`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = isLight
          ? '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)'
          : '0 2px 16px rgba(0,0,0,0.25)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}>

      {/* ── Title bar / drag handle ── */}
      <div className="drag-handle" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 14px',
        borderBottom: `1px solid ${isLight ? '#F3F4F6' : 'rgba(255,255,255,0.05)'}`,
        flexShrink: 0,
        cursor: editMode ? 'grab' : 'default',
        userSelect: 'none',
        minHeight: 44,
        background: isLight ? '#FAFBFF' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
          {/* Colored type dot */}
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${typeColor}14`,
            border: `1px solid ${typeColor}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChartIcon type={cfg.type} color={typeColor} size={13} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: S.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}>
              {cfg.title || cfg.type}
            </div>
            {cfg.x_col && (
              <div style={{
                fontSize: 10, color: S.muted, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {cfg.x_col}{cfg.y_col ? ` · ${cfg.y_col}` : ''}
              </div>
            )}
          </div>
        </div>

        {/* Right-side buttons: expand always visible, edit/remove in edit mode */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
          {/* Expand button — always visible */}
          <button
            onClick={e => { e.stopPropagation(); onExpand && onExpand(cfg.id) }}
            onMouseDown={e => e.stopPropagation()}
            title="Expand to fullscreen"
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${S.border}`,
              color: S.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = L.accentBg; e.currentTarget.style.color = L.accent; e.currentTarget.style.borderColor = L.accentBd }}
            onMouseLeave={e => { e.currentTarget.style.background = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.border }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ pointerEvents: 'none' }}>
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>

          {editMode && (<>
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              onMouseDown={e => e.stopPropagation()}
              title="Configure"
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${S.border}`,
                color: S.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = L.accentBg; e.currentTarget.style.color = L.accent; e.currentTarget.style.borderColor = L.accentBd }}
              onMouseLeave={e => { e.currentTarget.style.background = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.border }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ pointerEvents: 'none' }}>
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-8.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-12.1 1.4 1.4m9.9 9.9 1.4 1.4" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onRemove() }}
              onMouseDown={e => e.stopPropagation()}
              title="Remove"
              style={{
                width: 26, height: 26, borderRadius: 7,
                background: isLight ? '#FEF2F2' : 'rgba(249,114,114,0.08)',
                border: `1px solid ${isLight ? '#FECACA' : 'rgba(249,114,114,0.15)'}`,
                color: isLight ? '#EF4444' : 'rgba(249,114,114,0.6)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#DC2626' }}
              onMouseLeave={e => { e.currentTarget.style.background = isLight ? '#FEF2F2' : 'rgba(249,114,114,0.08)'; e.currentTarget.style.color = isLight ? '#EF4444' : 'rgba(249,114,114,0.6)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ pointerEvents: 'none' }}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </>)}
        </div>
      </div>

      {/* Chart body */}
      <div style={{
        flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden',
        position: 'relative', width: '100%',
        padding: isTable ? 0 : '8px 8px 6px',
      }}>
        {isTable
          ? <TableWidget cfg={cfg} data={data} S={S} />
          : <ChartWidget cfg={cfg} data={data} S={S} onDrillDown={onDrillDown} />
        }
      </div>
    </div>
  )
}

// ── ConfigDrawer — light theme ────────────────────────────────────────────────
function ConfigDrawer({ cfg, schema, S, onSave, onClose }) {
  const [local, setLocal] = useState({ ...cfg })
  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }))
  const numCols = schema?.numeric || []
  const allCols = schema?.all || []
  const isLight = S.isLight

  const labelStyle = {
    fontSize: 11, color: S.muted, display: 'block',
    marginBottom: 6, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const inputStyle = {
    width: '100%',
    background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${S.border}`,
    borderRadius: 9, color: S.text,
    fontSize: 13, padding: '9px 11px',
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 300,
      zIndex: 100,
      background: isLight ? '#FFFFFF' : S.card,
      borderLeft: `1px solid ${S.border}`,
      display: 'flex', flexDirection: 'column',
      boxShadow: isLight
        ? '-8px 0 32px rgba(0,0,0,0.08)'
        : '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px',
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        background: isLight ? '#F9FAFB' : 'transparent',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: L.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={L.accent} strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-8.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-12.1 1.4 1.4m9.9 9.9 1.4 1.4" />
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>Configure Widget</div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 7,
          background: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${S.border}`,
          color: S.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Chart type */}
        <div>
          <label style={labelStyle}>Chart Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {CHART_TYPES.map(t => (
              <button key={t.id} onClick={() => set('type', t.id)} style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                background: local.type === t.id ? L.accentBg : (isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)'),
                border: `1px solid ${local.type === t.id ? L.accentBd : S.border}`,
                color: local.type === t.id ? L.accent : S.muted,
                fontWeight: local.type === t.id ? 600 : 400,
                fontFamily: 'inherit',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title</label>
          <input value={local.title || ''} onChange={e => set('title', e.target.value)} style={inputStyle} placeholder="Widget title" />
        </div>

        {local.type !== 'kpi' && (
          <div>
            <label style={labelStyle}>{local.type === 'scatter' ? 'X Column (numeric)' : 'Dimension (X axis)'}</label>
            <select value={local.x_col || ''} onChange={e => set('x_col', e.target.value)} style={inputStyle}>
              <option value="">— select column —</option>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {local.type !== 'table' && (
          <div>
            <label style={labelStyle}>{local.type === 'kpi' ? 'Metric Column' : 'Value (Y axis)'}</label>
            <select value={local.y_col || ''} onChange={e => set('y_col', e.target.value)} style={inputStyle}>
              <option value="">— select column —</option>
              {(local.type === 'kpi' ? allCols : numCols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {local.type !== 'scatter' && local.type !== 'table' && (
          <div>
            <label style={labelStyle}>Aggregation</label>
            <select value={local.aggregation || 'sum'} onChange={e => set('aggregation', e.target.value)} style={inputStyle}>
              {['sum', 'avg', 'count', 'min', 'max'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
          </div>
        )}

        {!['kpi', 'table', 'scatter'].includes(local.type) && (
          <div>
            <label style={labelStyle}>Top N (leave blank for all)</label>
            <input type="number" min="1" max="100" value={local.topN || ''}
              onChange={e => set('topN', e.target.value ? Number(e.target.value) : null)}
              style={inputStyle} placeholder="e.g. 10" />
          </div>
        )}

        {local.type === 'kpi' && (
          <>
            <div>
              <label style={labelStyle}>Trend % Change</label>
              <input type="number" value={local.change || ''} onChange={e => set('change', e.target.value)} style={inputStyle} placeholder="e.g. 8.5" />
            </div>
            <div>
              <label style={labelStyle}>Threshold (conditional color)</label>
              <input type="number" value={local.threshold || ''} onChange={e => set('threshold', e.target.value || null)} style={inputStyle} placeholder="e.g. 50000" />
            </div>
          </>
        )}

        {local.type === 'bar' && (
          <div>
            <label style={labelStyle}>Reference Line Value</label>
            <input type="number" value={local.threshold || ''}
              onChange={e => set('threshold', e.target.value || null)} style={inputStyle} placeholder="e.g. 1000" />
          </div>
        )}

        {local.type === 'table' && (
          <div>
            <label style={labelStyle}>Sort by</label>
            <select value={local.sortBy || ''} onChange={e => set('sortBy', e.target.value)} style={inputStyle}>
              <option value="">— none —</option>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Sort direction</label>
              <select value={local.sortDir || 'desc'} onChange={e => set('sortDir', e.target.value)} style={inputStyle}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 18px', borderTop: `1px solid ${S.border}`,
        display: 'flex', gap: 8,
        background: isLight ? '#F9FAFB' : 'transparent',
      }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '9px', borderRadius: 9,
          background: isLight ? '#fff' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${S.border}`,
          color: S.muted, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
        }}>Cancel</button>
        <button onClick={() => onSave(local)} style={{
          flex: 1, padding: '9px', borderRadius: 9,
          background: L.accent, border: 'none',
          color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}>Apply</button>
      </div>
    </div>
  )
}

// ── LeftPanel — light theme ───────────────────────────────────────────────────
function LeftPanel({ open, onToggle, schema, schemeName, setSchemeName, aiPrompt, setAiPrompt, onGenerate, generating, S, draggingTypeRef }) {
  const isLight = S.isLight

  const inputStyle = {
    width: '100%',
    background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${S.border}`,
    borderRadius: 9, color: S.text,
    fontSize: 12, padding: '9px 11px',
    outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      width: open ? 224 : 48, minWidth: open ? 224 : 48,
      background: isLight ? '#FFFFFF' : S.card,
      borderRight: `1px solid ${S.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Toggle button */}
      <button onClick={onToggle} style={{
        width: '100%', height: 48, background: 'transparent', border: 'none',
        borderBottom: `1px solid ${S.border}`,
        color: S.muted, cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        padding: open ? '0 14px' : 0,
        fontSize: 12, fontWeight: 600,
        transition: 'background 0.12s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {open && <span style={{ fontSize: 11, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charts</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open
            ? <path d="M15 18l-6-6 6-6" />
            : <path d="M9 18l6-6-6-6" />}
        </svg>
      </button>

      {open && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Chart tiles */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S.dim || S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Drag to canvas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {CHART_TYPES.map(t => (
                <div
                  key={t.id}
                  draggable={true}
                  onDragStart={e => {
                    e.dataTransfer.setData('chartType', t.id)
                    e.dataTransfer.effectAllowed = 'copy'
                    draggingTypeRef.current = t.id
                  }}
                  onDragEnd={() => { draggingTypeRef.current = null }}
                  style={{
                    padding: '8px 10px', borderRadius: 9, cursor: 'grab',
                    background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${S.border}`,
                    display: 'flex', alignItems: 'center', gap: 9,
                    transition: 'all 0.12s', userSelect: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = L.accentBg
                    e.currentTarget.style.borderColor = L.accentBd
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = S.border
                  }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: `${L.accent}12`,
                    border: `1px solid ${L.accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <ChartIcon type={t.id} color={L.accent} size={12} />
                  </div>
                  <span style={{ fontSize: 12, color: S.text, fontWeight: 500, pointerEvents: 'none' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: S.border }} />

          {/* Color scheme */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S.dim || S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Color Scheme
            </div>
            {Object.keys(SCHEMES).map(name => {
              const active = schemeName === name
              const sc = SCHEMES[name]
              return (
                <div key={name} onClick={() => setSchemeName(name)} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 9px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: active ? (isLight ? L.accentBg : `${S.accent}15`) : 'transparent',
                  border: `1px solid ${active ? (isLight ? L.accentBd : `${S.accent}33`) : 'transparent'}`,
                  transition: 'all 0.12s',
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: sc.accent, flexShrink: 0, boxShadow: `0 0 4px ${sc.accent}66` }} />
                  <span style={{ fontSize: 12, color: active ? (isLight ? L.accent : S.accent) : S.muted, fontWeight: active ? 600 : 400 }}>{name}</span>
                  {active && (
                    <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isLight ? L.accent : S.accent} strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: S.border }} />

          {/* AI Generate */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S.dim || S.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              AI Generate
            </div>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. 4 KPI cards for revenue, orders, customers. Monthly line chart. Bar chart top 5 products."
              rows={4}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }} />
            <button onClick={onGenerate} disabled={generating || !aiPrompt.trim()} style={{
              width: '100%', marginTop: 8, padding: '9px',
              borderRadius: 9, fontWeight: 600, fontSize: 12,
              cursor: generating || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
              background: generating || !aiPrompt.trim()
                ? (isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)')
                : L.accent,
              border: `1px solid ${generating || !aiPrompt.trim() ? S.border : L.accent}`,
              color: generating || !aiPrompt.trim() ? S.muted : '#fff',
              fontFamily: 'inherit', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {generating
                ? <><svg style={{ animation: 'db-spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Building…</>
                : <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Generate
                  </>
              }
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

// ── DashboardBuilder (main) — logic 100% unchanged ───────────────────────────
export default function DashboardBuilder() {
  const { projectId, dashboardId } = useParams()
  const navigate = useNavigate()
  const isNew = dashboardId === 'new'

  const [rawData,       setRawData]       = useState(null)
  const [schema,        setSchema]        = useState(null)
  const [dataset,       setDataset]       = useState(null)
  const [project,       setProject]       = useState(null)
  const [widgets,       setWidgets]       = useState([])
  const [gridLayout,    setGridLayout]    = useState([])
  const [globalFilters, setGlobalFilters] = useState([])
  const [drillFilters,  setDrillFilters]  = useState([])
  const [filterBarOpen, setFilterBarOpen] = useState(false)
  const [editMode,      setEditMode]      = useState(isNew)
  const [editingId,     setEditingId]     = useState(null)
  const [leftOpen,      setLeftOpen]      = useState(true)
  const [dashTitle,     setDashTitle]     = useState('')
  const [schemeName,    setSchemeName]    = useState('Light')
  const [aiPrompt,      setAiPrompt]      = useState('')
  const [generating,    setGenerating]    = useState(false)
  const [dbId,          setDbId]          = useState(isNew ? null : Number(dashboardId))
  const [saveStatus,    setSaveStatus]    = useState('')
  const [expandedId,    setExpandedId]    = useState(null)   // widget id currently in fullscreen

  const draggingTypeRef = useRef(null)
  const autoSave        = useRef(null)
  const canvasRef       = useRef(null)
  const [canvasW,       setCanvasW]       = useState(1200)

  useEffect(() => {
    const obs = new ResizeObserver(entries => setCanvasW(entries[0].contentRect.width || 1200))
    if (canvasRef.current) obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [])

  const S = SCHEMES[schemeName] || SCHEMES['Light']
  const isLight = S.isLight

  // Load project + dataset
  useEffect(() => {
    const load = async () => {
      try {
        const [pr, dsr] = await Promise.all([projectsApi.get(projectId), datasetsApi.list(projectId)])
        setProject(pr.data)
        const ds = dsr.data?.[0] || null
        setDataset(ds)
        if (ds) {
          const cd = await datasetsApi.getChartData(ds.id)
          setRawData(cd.data)
          setSchema(computeSchema(cd.data))
        }
      } catch {}
    }
    load()
  }, [projectId])

  // Load existing dashboard
  useEffect(() => {
    if (isNew) { setDashTitle('New Dashboard'); return }
    dashboardsApi.get(dashboardId).then(r => {
      const db = r.data
      setDbId(db.id)
      setDashTitle(db.name || 'Dashboard')
      setSchemeName(db.scheme || 'Light')
      if (db.layout?.widgets?.length) {
        const wids = db.layout.widgets.map(({ gx, gy, gw, gh, ...rest }) => rest)
        const pos  = db.layout.widgets.map(({ id, gx, gy, gw, gh }) =>
          ({ i: id, x: gx ?? 0, y: gy ?? 0, w: gw ?? 6, h: gh ?? 5 })
        )
        setWidgets(wids)
        setGridLayout(pos)
        setEditMode(false)
      }
    }).catch(() => {})
  }, [dashboardId, isNew])

  const allFilters = useMemo(() => [...globalFilters, ...drillFilters], [globalFilters, drillFilters])

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault()
    const type = e.dataTransfer?.getData('chartType') || draggingTypeRef.current
    draggingTypeRef.current = null
    if (!type) return
    const tid = CHART_TYPES.find(t => t.id === type)
    const id = `w_${Date.now()}`
    setWidgets(prev => [...prev, {
      id, type,
      title: tid?.label || type,
      x_col: schema?.categorical?.[0] || schema?.all?.[0] || '',
      y_col: schema?.numeric?.[0] || '',
      aggregation: 'sum',
      topN: null,
    }])
    setGridLayout(prev => {
      const col = (prev.filter(l => l.i !== '__dropping-elem__').length % 2) * 6
      return [
        ...prev.filter(l => l.i !== '__dropping-elem__'),
        { i: id, x: col, y: 9999, w: tid?.w ?? 6, h: tid?.h ?? 5 },
      ]
    })
  }, [schema])

  const save = useCallback(async (silent = false) => {
    if (!widgets.length && !silent) return
    if (!silent) setSaveStatus('saving')
    const layoutToSave = {
      title: dashTitle, scheme: schemeName,
      widgets: widgets.map(w => {
        const pos = gridLayout.find(l => l.i === w.id)
        return { ...w, gx: pos?.x ?? 0, gy: pos?.y ?? 0, gw: pos?.w ?? 6, gh: pos?.h ?? 5 }
      }),
    }
    try {
      if (dbId) {
        await dashboardsApi.update(dbId, { name: dashTitle, scheme: schemeName, layout: layoutToSave })
      } else {
        const r = await dashboardsApi.create({ project_id: Number(projectId), dataset_id: dataset?.id || null, name: dashTitle, scheme: schemeName, layout: layoutToSave })
        setDbId(r.data.id)
        navigate(`/projects/${projectId}/dashboards/${r.data.id}`, { replace: true })
      }
      if (!silent) { setSaveStatus('saved'); setTimeout(() => setSaveStatus(''), 2500) }
    } catch {
      if (!silent) { setSaveStatus('error'); setTimeout(() => setSaveStatus(''), 3000) }
    }
  }, [widgets, gridLayout, dashTitle, schemeName, dbId, dataset, projectId, navigate])

  useEffect(() => {
    if (!dbId || !widgets.length) return
    clearTimeout(autoSave.current)
    autoSave.current = setTimeout(() => save(true), 2000)
    return () => clearTimeout(autoSave.current)
  }, [widgets, gridLayout, dbId])

  const handleGenerate = useCallback(() => {
    if (!aiPrompt.trim()) return
    // ── Fix 1: Clear prompt immediately so field doesn't linger ──
    const prompt = aiPrompt.trim()
    setAiPrompt('')
    setGenerating(true)

    setTimeout(() => {
      const p = prompt.toLowerCase()
      const newWidgets = []
      const newLayout  = []
      const numCols    = schema?.numeric || []
      const catCol     = schema?.categorical?.[0] || schema?.all?.[0] || ''
      const numCol     = numCols[0] || ''

      // ── Fix 2: Standardised Bento layout template ─────────────
      // KPI cards always sit in a fixed top row of 3-wide × 3-high slots
      // Charts always 6-wide × 5-high (half canvas)
      // Wide charts (table, ranking+chart pairs) get 12 or 8 wide
      // Row cursor tracks the current y position

      let curY = 0   // current row top in grid units

      // ── Helper: place a widget at absolute x,y with fixed dims ──
      const place = (type, title, x, y, w, h, extraCfg = {}) => {
        const id = `w_${Date.now()}_${newWidgets.length}`
        newWidgets.push({
          id, type, title,
          x_col: catCol, y_col: numCol,
          aggregation: 'sum', topN: null,
          ...extraCfg,
        })
        newLayout.push({ i: id, x, y, w, h })
      }

      // ─── KPI row: up to 4 KPIs, each w:3 h:3, side-by-side ───
      const numKPI = (() => {
        const m = prompt.match(/(\d+)\s*kpi/i)
        return m ? Math.min(parseInt(m[1]), 4) : /kpi|card|metric|score/i.test(p) ? 4 : 0
      })()
      const KPI_LABELS = ['Total Revenue', 'Total Orders', 'Active Users', 'Conversion Rate', 'Avg Order Value', 'Profit Margin']

      if (numKPI > 0) {
        // Exactly 4 KPIs → row of four 3-wide cards = full 12-col width
        // 3 KPIs → 4+4+4
        // 2 KPIs → 6+6
        const kpiW = numKPI === 1 ? 6 : numKPI === 2 ? 6 : numKPI === 3 ? 4 : 3
        for (let i = 0; i < numKPI && i < 6; i++) {
          place('kpi', KPI_LABELS[i], i * kpiW, curY, kpiW, 3, {
            y_col: numCols[i] || numCol,
            aggregation: i === 3 ? 'avg' : 'sum',
          })
        }
        curY += 3
      }

      // ── Chart pairs: two charts side by side (6+6), each h:5 ──
      // Collect which chart types the prompt wants
      const chartQueue = []
      if (/line|trend|time|monthly|weekly|daily|over/i.test(p))
        chartQueue.push({ type: 'line',    title: 'Trend Over Time' })
      if (/area|filled|shaded/i.test(p))
        chartQueue.push({ type: 'area',    title: 'Performance Area' })
      if (/bar|column|categ|product|region|compar/i.test(p))
        chartQueue.push({ type: 'bar',     title: 'Category Comparison' })
      if (/pie|donut|ring|distribution|share/i.test(p))
        chartQueue.push({ type: 'pie',     title: 'Distribution' })
      if (/radar|spider|performance/i.test(p))
        chartQueue.push({ type: 'radar',   title: 'Performance Radar' })
      if (/scatter|correl|vs\b/i.test(p))
        chartQueue.push({ type: 'scatter', title: 'Correlation',
          x_col: numCols[0] || '', y_col: numCols[1] || '' })
      if (/rank|top|list/i.test(p))
        chartQueue.push({ type: 'ranking', title: 'Top Rankings' })

      // Default if nothing matched and no KPIs either
      if (!chartQueue.length && numKPI === 0) {
        chartQueue.push({ type: 'bar',  title: 'Category Comparison' })
        chartQueue.push({ type: 'line', title: 'Trend Over Time' })
        place('kpi', 'Key Metric', 0, curY, 3, 3, { y_col: numCol })
        place('kpi', 'Total Count', 3, curY, 3, 3, { aggregation: 'count' })
        curY += 3
      }

      // Lay charts out in pairs of 6+6 per row, each row h=5
      for (let i = 0; i < chartQueue.length; i += 2) {
        const left  = chartQueue[i]
        const right = chartQueue[i + 1]
        const { type: lt, title: ll, ...lExtra } = left
        place(lt, ll, 0, curY, right ? 6 : 12, 5, lExtra)
        if (right) {
          const { type: rt, title: rl, ...rExtra } = right
          place(rt, rl, 6, curY, 6, 5, rExtra)
        }
        curY += 5
      }

      // Table always goes full-width at the bottom if requested
      if (/table/i.test(p)) {
        place('table', 'Data Table', 0, curY, 12, 7, {
          sortBy: numCol, sortDir: 'desc',
        })
      }

      setWidgets(newWidgets)
      setGridLayout(newLayout)
      setGenerating(false)
      setLeftOpen(false)
      setEditMode(false)
    }, 700)
  }, [aiPrompt, schema])

  const addFilter    = () => setGlobalFilters(prev => [...prev, { id: Date.now(), col: schema?.all?.[0] || '', op: '=', val: '' }])
  const removeFilter = id => setGlobalFilters(prev => prev.filter(f => f.id !== id))
  const updateFilter = (id, k, v) => setGlobalFilters(prev => prev.map(f => f.id === id ? { ...f, [k]: v } : f))
  const clearAllFilters = () => { setGlobalFilters([]); setDrillFilters([]) }
  const handleDrillDown = (col, val) => { setDrillFilters(prev => [...prev, { id: Date.now(), col, op: '=', val }]); setFilterBarOpen(true) }

  const editingWidget = widgets.find(w => w.id === editingId)

  // Shared input style for filter bar
  const filterInputStyle = {
    background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${S.border}`,
    borderRadius: 8, color: S.text,
    fontSize: 11, padding: '5px 9px',
    outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: isLight ? L.pageBg : S.bg,
      color: S.text,
      fontFamily: L.font,
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 20px', height: 56,
        borderBottom: `1px solid ${S.border}`,
        flexShrink: 0,
        background: isLight ? '#FFFFFF' : S.card,
        boxShadow: isLight ? '0 1px 0 #E5E7EB' : 'none',
      }}>
        {/* Back */}
        <button onClick={() => navigate(`/projects/${projectId}`)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          background: 'transparent',
          border: `1px solid ${S.border}`,
          color: S.muted, cursor: 'pointer', fontSize: 12, fontWeight: 500,
          transition: 'all 0.15s', fontFamily: L.font,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = S.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = S.muted }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Projects
        </button>

        {/* Separator */}
        <span style={{ color: S.border, fontSize: 18 }}>/</span>

        {/* Dashboard title */}
        <input value={dashTitle} onChange={e => setDashTitle(e.target.value)} readOnly={!editMode}
          style={{
            background: 'transparent', border: 'none',
            color: S.text, fontSize: 15, fontWeight: 700,
            outline: 'none', minWidth: 160, maxWidth: 300,
            cursor: editMode ? 'text' : 'default',
            letterSpacing: '-0.02em',
          }} />

        <div style={{ flex: 1 }} />

        {/* Scheme dots */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {Object.entries(SCHEMES).map(([name, sch]) => (
            <button key={name} title={name} onClick={() => setSchemeName(name)} style={{
              width: 14, height: 14, borderRadius: 99,
              background: sch.accent,
              border: `2px solid ${schemeName === name ? (isLight ? L.accent : '#fff') : 'transparent'}`,
              cursor: 'pointer',
              outline: schemeName === name ? `2px solid ${sch.accent}44` : 'none',
              outlineOffset: 1,
              transition: 'all 0.12s',
            }} />
          ))}
        </div>

        {/* Filter toggle */}
        <button onClick={() => setFilterBarOpen(o => !o)} style={{
          padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
          background: allFilters.length > 0 ? L.accentBg : (isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)'),
          border: `1px solid ${allFilters.length > 0 ? L.accentBd : S.border}`,
          color: allFilters.length > 0 ? L.accent : S.muted,
          display: 'flex', alignItems: 'center', gap: 5, fontFamily: L.font,
          transition: 'all 0.15s',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters {allFilters.length > 0 ? `(${allFilters.length})` : ''}
        </button>

        {/* Edit toggle */}
        <button onClick={() => setEditMode(m => !m)} style={{
          padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500,
          cursor: 'pointer',
          background: editMode ? L.accentBg : (isLight ? '#F9FAFB' : 'rgba(255,255,255,0.06)'),
          border: `1px solid ${editMode ? L.accentBd : S.border}`,
          color: editMode ? L.accent : S.muted,
          fontFamily: L.font, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {editMode ? 'Editing' : 'Edit'}
        </button>

        {/* Save */}
        <button onClick={() => save(false)} style={{
          padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: L.font,
          background: saveStatus === 'saved' ? '#ECFDF5'
            : saveStatus === 'error' ? '#FEF2F2'
            : L.accent,
          border: `1px solid ${saveStatus === 'saved' ? '#A7F3D0'
            : saveStatus === 'error' ? '#FECACA'
            : L.accent}`,
          color: saveStatus === 'saved' ? '#059669'
            : saveStatus === 'error' ? '#DC2626'
            : '#fff',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {saveStatus === 'saving' ? 'Saving…'
            : saveStatus === 'saved' ? '✓ Saved'
            : saveStatus === 'error' ? 'Error'
            : <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Save
              </>
          }
        </button>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      {filterBarOpen && (
        <div style={{
          padding: '10px 18px',
          borderBottom: `1px solid ${S.border}`,
          background: isLight ? '#FAFAFA' : `${S.card}cc`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          {drillFilters.map(f => (
            <span key={f.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px',
              background: L.accentBg, border: `1px solid ${L.accentBd}`,
              borderRadius: 99, fontSize: 11, color: L.accent, fontWeight: 500,
            }}>
              {f.col} = {f.val}
              <span onClick={() => setDrillFilters(prev => prev.filter(x => x.id !== f.id))}
                style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.6, fontSize: 14 }}>×</span>
            </span>
          ))}

          {globalFilters.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <select value={f.col} onChange={e => updateFilter(f.id, 'col', e.target.value)}
                style={{ ...filterInputStyle, width: 120 }}>
                {(schema?.all || []).map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={f.op} onChange={e => updateFilter(f.id, 'op', e.target.value)}
                style={{ ...filterInputStyle, width: 80 }}>
                {['=', '!=', '>', '<', '>=', '<=', 'contains'].map(op => <option key={op}>{op}</option>)}
              </select>
              <input value={f.val} onChange={e => updateFilter(f.id, 'val', e.target.value)}
                placeholder="value" style={{ ...filterInputStyle, width: 100 }} />
              <button onClick={() => removeFilter(f.id)} style={{
                width: 22, height: 22, borderRadius: 5,
                background: L.redBg, border: `1px solid #FECACA`,
                color: L.red, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          ))}

          <button onClick={addFilter} style={{
            padding: '5px 11px', borderRadius: 8,
            background: L.accentBg, border: `1px solid ${L.accentBd}`,
            color: L.accent, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: L.font,
          }}>+ Add Filter</button>

          {allFilters.length > 0 && (
            <button onClick={clearAllFilters} style={{
              padding: '5px 11px', borderRadius: 8,
              background: isLight ? '#F9FAFB' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${S.border}`,
              color: S.muted, cursor: 'pointer', fontSize: 11, fontFamily: L.font,
            }}>Clear all</button>
          )}
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        <LeftPanel
          open={leftOpen} onToggle={() => setLeftOpen(o => !o)}
          schema={schema} schemeName={schemeName} setSchemeName={setSchemeName}
          aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
          onGenerate={handleGenerate} generating={generating}
          S={S} draggingTypeRef={draggingTypeRef} />

        {/* ── Canvas ─────────────────────────────────────────────── */}
        <div ref={canvasRef}
          style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            position: 'relative',
            background: isLight ? L.pageBg : S.bg,
          }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={handleCanvasDrop}>

          {/* No dataset state */}
          {!rawData && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              textAlign: 'center', pointerEvents: 'none', width: 320,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
                background: L.accentBg, border: `1px solid ${L.accentBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={L.accent} strokeWidth="1.6" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 8 }}>No dataset connected</div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>Go back to the project page and upload a dataset first.</div>
            </div>
          )}

          {/* Empty canvas state */}
          {rawData && widgets.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              textAlign: 'center', pointerEvents: 'none', width: 340,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
                background: L.accentBg,
                border: `2px dashed ${L.accentBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={L.accent} strokeWidth="1.6" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 8 }}>Canvas is empty</div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6 }}>
                Drag a chart from the left panel, or use AI Generate to build your dashboard automatically.
              </div>
            </div>
          )}

          <GridLayout
            className="layout"
            layout={gridLayout}
            cols={12}
            rowHeight={60}
            width={canvasW}
            isDraggable={editMode}
            isResizable={editMode}
            isDroppable={false}
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={newL => setGridLayout(newL)}
            draggableHandle=".drag-handle"
            margin={[12, 12]}
            containerPadding={[14, 14]}>
            {widgets.map(w => (
              <div key={w.id} style={{ height: '100%' }}>
                <WidgetCard
                  cfg={w} rawData={rawData} allFilters={allFilters}
                  editMode={editMode} S={S}
                  onEdit={() => setEditingId(w.id)}
                  onExpand={id => setExpandedId(id)}
                  onRemove={() => {
                    setWidgets(prev => prev.filter(x => x.id !== w.id))
                    setGridLayout(prev => prev.filter(l => l.i !== w.id))
                  }}
                  onDrillDown={handleDrillDown} />
              </div>
            ))}
          </GridLayout>
        </div>

        {/* Config drawer */}
        {editingId && editingWidget && (
          <ConfigDrawer
            cfg={editingWidget} schema={schema} S={S}
            onClose={() => setEditingId(null)}
            onSave={updated => {
              setWidgets(prev => prev.map(w => w.id === editingId ? updated : w))
              setEditingId(null)
            }} />
        )}
      </div>

      {/* ── Fullscreen expanded widget overlay ─────────────────────── */}
      {expandedId && (() => {
        const expandedWidget = widgets.find(w => w.id === expandedId)
        if (!expandedWidget) return null
        const expandedData = computeWidgetData(rawData, expandedWidget, allFilters)
        const isTable = expandedWidget.type === 'table'
        const typeColors = {
          bar:'#6366f1',line:'#10B981',area:'#06B6D4',pie:'#F59E0B',
          donut:'#EC4899',scatter:'#8B5CF6',radar:'#F97316',table:'#6B7280',ranking:'#EF4444',
        }
        const typeColor = isLight ? (typeColors[expandedWidget.type] || S.accent) : S.accent
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: isLight ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '28px',
            animation: 'db-fadein 0.18s ease',
          }}
            onClick={() => setExpandedId(null)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 1200,
                height: '85vh',
                background: isLight ? '#FFFFFF' : S.card,
                border: `1px solid ${isLight ? '#E5E7EB' : S.border}`,
                borderRadius: 18, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
              }}>
              {/* Expanded header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                borderBottom: `1px solid ${isLight ? '#F3F4F6' : S.border}`,
                background: isLight ? '#FAFBFF' : 'transparent',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: `${typeColor}14`,
                  border: `1px solid ${typeColor}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChartIcon type={expandedWidget.type} color={typeColor} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: S.text, letterSpacing: '-0.02em' }}>
                    {expandedWidget.title || expandedWidget.type}
                  </div>
                  {expandedWidget.x_col && (
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>
                      {expandedWidget.x_col}{expandedWidget.y_col ? ` · ${expandedWidget.y_col}` : ''}
                    </div>
                  )}
                </div>
                {/* Collapse button */}
                <button
                  onClick={() => setExpandedId(null)}
                  title="Close fullscreen"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 9,
                    background: isLight ? '#F3F4F6' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${S.border}`,
                    color: S.muted, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    fontFamily: L.font, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = L.accentBg; e.currentTarget.style.color = L.accent; e.currentTarget.style.borderColor = L.accentBd }}
                  onMouseLeave={e => { e.currentTarget.style.background = isLight ? '#F3F4F6' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = S.muted; e.currentTarget.style.borderColor = S.border }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                  </svg>
                  Close
                </button>
              </div>
              {/* Expanded chart body */}
              <div style={{
                flex: 1, minHeight: 0,
                padding: isTable ? 0 : '16px',
                overflow: 'hidden',
              }}>
                {isTable
                  ? <TableWidget cfg={expandedWidget} data={expandedData} S={S} />
                  : <ChartWidget cfg={expandedWidget} data={expandedData} S={S} onDrillDown={handleDrillDown} />
                }
              </div>
            </div>
          </div>
        )
      })()}

      {/* Global styles */}
      <style>{`
        @keyframes db-spin { to { transform: rotate(360deg); } }
        @keyframes db-fadein { from { opacity: 0; } to { opacity: 1; } }

        /* Grid layout placeholder */
        .react-grid-item.react-grid-placeholder {
          background: ${L.accentBg} !important;
          border: 2px dashed ${L.accentBd} !important;
          border-radius: 14px !important;
          opacity: 1 !important;
        }

        /* Resize handles */
        .react-grid-item > .react-resizable-handle { opacity: 0; transition: opacity 0.2s; }
        .react-grid-item:hover > .react-resizable-handle { opacity: 0.5; }
        .react-grid-item > .react-resizable-handle::after {
          border-color: ${L.accent}88 !important;
          width: 8px !important; height: 8px !important;
        }

        * { box-sizing: border-box; }

        /* Select options for dark themes */
        select option { background: ${S.isLight ? '#fff' : '#1a1d28'}; color: ${S.text}; }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: ${S.isLight ? '#D1D5DB' : 'rgba(255,255,255,0.1)'};
          border-radius: 99px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${S.isLight ? '#9CA3AF' : 'rgba(255,255,255,0.2)'};
        }
      `}</style>
    </div>
  )
}