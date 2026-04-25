// src/components/dashboards/DashboardBuilder.jsx
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

// ── Themes ──────────────────────────────────────────────────────────────────
const SCHEMES = {
  'Metric Flow': { bg:'#111318', card:'#1a1d28', border:'rgba(255,255,255,0.08)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.4)', accent:'#e05c2d', accent2:'#6366f1', palette:['#e05c2d','#6366f1','#f59e0b','#10b981','#ec4899','#06b6d4','#84cc16','#f97316'], pos:'#10b981', neg:'#e05c2d' },
  'Neon Dark':   { bg:'#0d0f1a', card:'#131626', border:'rgba(255,255,255,0.07)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.4)', accent:'#00ffb4', accent2:'#4f8cff', palette:['#00ffb4','#4f8cff','#ffd93d','#ff6b6b','#c77dff','#00d4ff','#43e97b','#fa8231'], pos:'#00ffb4', neg:'#ff6b6b' },
  'Ocean Blue':  { bg:'#050d1a', card:'#091428', border:'rgba(99,179,237,0.12)', text:'rgba(255,255,255,0.92)', muted:'rgba(255,255,255,0.38)', accent:'#63b3ed', accent2:'#4fd1c5', palette:['#63b3ed','#4fd1c5','#f6ad55','#fc8181','#b794f4','#68d391','#fbd38d','#9ae6b4'], pos:'#68d391', neg:'#fc8181' },
  'Solar Gold':  { bg:'#12100a', card:'#1c1810', border:'rgba(245,163,26,0.1)', text:'rgba(255,255,255,0.9)', muted:'rgba(255,255,255,0.38)', accent:'#f5a31a', accent2:'#f0c040', palette:['#f5a31a','#f0c040','#3ecfb2','#5b8cff','#a68cff','#3dd68c','#f97272','#e2e8f0'], pos:'#3dd68c', neg:'#f97272' },
  'Rose Quartz': { bg:'#110d12', card:'#1a1220', border:'rgba(236,72,153,0.1)', text:'rgba(255,255,255,0.92)', muted:'rgba(255,255,255,0.38)', accent:'#ec4899', accent2:'#a78bfa', palette:['#ec4899','#a78bfa','#f59e0b','#10b981','#06b6d4','#f97316','#84cc16','#fb923c'], pos:'#10b981', neg:'#f97316' },
  'Cyberpunk':   { bg:'#08050f', card:'#100d1a', border:'rgba(255,255,0,0.08)', text:'#fff', muted:'rgba(255,255,255,0.4)', accent:'#ffff00', accent2:'#ff00ff', palette:['#ffff00','#ff00ff','#00ffff','#ff6600','#00ff88','#ff0066','#6600ff','#ffaa00'], pos:'#00ff88', neg:'#ff0066' },
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
          const parts = p.slice(7).split(',')  // remove 'circle:' prefix then split
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

// ── computeWidgetData ────────────────────────────────────────────────────────
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

// ── KPIWidget ────────────────────────────────────────────────────────────────
function KPIWidget({ cfg, data, S }) {
  const value = data?.[0]?.value ?? 0
  const change = Number(cfg.change ?? 0)
  const up = change >= 0
  const threshold = cfg.threshold ? Number(cfg.threshold) : null
  const aboveThreshold = threshold != null && value > threshold
  const belowThreshold = threshold != null && value < threshold
  const color = aboveThreshold ? (cfg.aboveColor || S.pos)
    : belowThreshold ? (cfg.belowColor || S.neg)
    : S.text

  return (
    <div style={{
      height: '100%', padding: '18px 20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${S.card} 0%, rgba(255,255,255,0.02) 100%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -24, right: -24, width: 80, height: 80,
        borderRadius: '50%', background: `radial-gradient(circle, ${S.accent}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <svg style={{ position: 'absolute', top: 10, right: 12, opacity: 0.35, pointerEvents: 'none' }}
        width="14" height="14" viewBox="0 0 24 24" fill={S.accent}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <div style={{
          fontSize: 36, fontWeight: 900, color, letterSpacing: '-1px',
          lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          textShadow: color !== S.text ? `0 0 32px ${color}44` : 'none',
        }}>{fmtN(value)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {change !== 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700,
            color: up ? S.pos : S.neg,
            background: `${up ? S.pos : S.neg}18`,
            border: `1px solid ${up ? S.pos : S.neg}35`,
            borderRadius: 99, padding: '3px 9px',
          }}>
            {up ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
        {threshold != null && (
          <span style={{ fontSize: 10, color: S.muted, borderLeft: `2px solid ${S.border}`, paddingLeft: 6 }}>
            vs {fmtN(threshold)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── ChartWidget ──────────────────────────────────────────────────────────────
function ChartWidget({ cfg, data, S, onDrillDown }) {
  if (!data?.length) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ChartIcon type={cfg.type} color="rgba(255,255,255,0.2)" size={16} />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center' }}>
        {cfg.x_col ? 'Configure columns' : 'Click settings to set up'}
      </div>
    </div>
  )

  const PAL = S.palette
  const ap  = { tick: { fontSize: 10, fill: S.muted }, axisLine: false, tickLine: false }
  const gp  = { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '3 3', vertical: false }
  const tt  = { contentStyle: { background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, fontSize: 11, color: S.text }, labelStyle: { color: S.muted }, itemStyle: { color: S.text } }
  const mg  = { top: 12, right: 12, left: -8, bottom: 8 }
  const tfmt = v => { const s = String(v); return s.length > 9 ? s.slice(0, 9) + '…' : s }

  const handleClick = entry => {
    if (onDrillDown && cfg.x_col && entry?.name) onDrillDown(cfg.x_col, entry.name)
  }

  if (cfg.type === 'line') return (
    <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={mg}>
        <CartesianGrid {...gp} horizontal vertical={false} />
        <XAxis dataKey="name" {...ap} tickFormatter={tfmt} />
        <YAxis {...ap} tickFormatter={fmtN} width={38} />
        <Tooltip {...tt} />
        <Line dataKey="value" stroke={PAL[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: PAL[0], stroke: S.bg, strokeWidth: 2 }} />
        {cfg.showAvg && (() => {
          const avg = data.reduce((s, d) => s + (Number(d.value) || 0), 0) / data.length
          return <ReferenceLine y={avg} stroke={`${PAL[1]}88`} strokeDasharray="4 2" label={{ value: `avg ${fmtN(avg)}`, fill: PAL[1], fontSize: 9, position: 'insideTopRight' }} />
        })()}
      </LineChart>
    </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'area') return (
    <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={mg}>
        <defs>
          <linearGradient id={`ag_${cfg.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PAL[0]} stopOpacity={0.4} />
            <stop offset="90%" stopColor={PAL[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gp} horizontal vertical={false} />
        <XAxis dataKey="name" {...ap} tickFormatter={tfmt} />
        <YAxis {...ap} tickFormatter={fmtN} width={38} />
        <Tooltip {...tt} />
        <Area dataKey="value" stroke={PAL[0]} fill={`url(#ag_${cfg.id})`} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: PAL[0], stroke: S.bg, strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'bar') return (
    <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={mg} barCategoryGap="30%">
        <defs>
          {PAL.map((color, i) => (
            <linearGradient key={i} id={`barGrad_${cfg.id}_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gp} horizontal vertical={false} />
        <XAxis dataKey="name" {...ap} tickFormatter={tfmt}
          interval={0} angle={data.length > 8 ? -30 : 0}
          textAnchor={data.length > 8 ? 'end' : 'middle'}
          height={data.length > 8 ? 44 : 24} />
        <YAxis {...ap} tickFormatter={fmtN} width={38} />
        <Tooltip {...tt} cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]} cursor={onDrillDown ? 'pointer' : 'default'} onClick={handleClick}>
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
      <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
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
    <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: S.muted }} />
        <PolarRadiusAxis tick={false} />
        <Radar dataKey="value" stroke={PAL[0]} fill={PAL[0]} fillOpacity={0.25} strokeWidth={2} />
        <Tooltip {...tt} />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  )

  if (cfg.type === 'scatter') return (
    <div style={{ width:"100%", height:"100%", minWidth:0, minHeight:0, overflow:"hidden" }}>
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
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 0' }}>
      {sorted.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', borderRadius: 6 }}
          onClick={() => handleClick(row)}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ width: 18, fontSize: 10, color: S.muted, flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: S.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
            <div style={{ height: 3, background: S.border, borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${(Number(row.value) / Number(max)) * 100}%`, background: PAL[i % PAL.length], borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
          </div>
          <span style={{ fontSize: 11, color: S.muted, flexShrink: 0, fontFamily: 'monospace' }}>{fmtN(row.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── TableWidget ──────────────────────────────────────────────────────────────
function TableWidget({ cfg, data, S }) {
  const [colFilters, setColFilters] = useState({})
  const [sortBy,     setSortBy]     = useState(cfg.sortBy || '')
  const [sortDir,    setSortDir]    = useState(cfg.sortDir || 'desc')
  const [page,       setPage]       = useState(0)
  const PAGE_SIZE = 20

  if (!data?.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: S.muted, fontSize: 11 }}>No data</div>
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px', overflowX: 'auto', flexShrink: 0 }}>
        {cols.map(col => (
          <input key={col} placeholder={`Filter ${col}`} value={colFilters[col] || ''}
            onChange={e => { setColFilters(p => ({ ...p, [col]: e.target.value })); setPage(0) }}
            style={{ minWidth: 80, maxWidth: 120, background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, borderRadius: 6, color: S.text, fontSize: 10, padding: '4px 7px', outline: 'none', fontFamily: 'inherit' }} />
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: S.card, zIndex: 1 }}>
              {cols.map(col => (
                <th key={col} onClick={() => { if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('desc') } }}
                  style={{ padding: '7px 10px', textAlign: 'left', color: S.muted, fontWeight: 700, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', borderBottom: `1px solid ${S.border}` }}>
                  {col} {sortBy === col ? (sortDir === 'asc' ? ' ^' : ' v') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cols.map(col => {
                  const v = row[col]
                  const isNum = typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')
                  return (
                    <td key={col} style={{ padding: '6px 10px', color: S.text, textAlign: isNum ? 'right' : 'left', fontFamily: isNum ? 'monospace' : 'inherit' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: S.muted }}>{rows.length.toLocaleString()} rows · Page {page + 1}/{totalPages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${S.border}`, background: 'transparent', color: page === 0 ? S.muted : S.text, cursor: page === 0 ? 'default' : 'pointer', fontSize: 11 }}>{'<'}</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${S.border}`, background: 'transparent', color: page >= totalPages - 1 ? S.muted : S.text, cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 11 }}>{'>'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── WidgetCard ───────────────────────────────────────────────────────────────
function WidgetCard({ cfg, rawData, allFilters, editMode, onEdit, onRemove, onDrillDown, S }) {
  const data    = useMemo(() => computeWidgetData(rawData, cfg, allFilters), [rawData, cfg, allFilters])
  const isTable = cfg.type === 'table'
  const isKPI   = cfg.type === 'kpi'

  return (
    <div style={{
      height: '100%', background: S.card, border: `1px solid ${S.border}`,
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      position: 'relative', boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
      transition: 'box-shadow 0.2s, border-color 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${S.accent}44`; e.currentTarget.style.boxShadow = `0 4px 28px rgba(0,0,0,0.38), 0 0 0 1px ${S.accent}18` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.25)' }}>

      {editMode && <div style={{ height: 2, background: `linear-gradient(90deg,${S.accent},${S.accent2 || S.accent}88,transparent)`, flexShrink: 0 }} />}

      {/* Title bar — this is the drag handle */}
      <div className="drag-handle"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderBottom: `1px solid rgba(255,255,255,0.05)`,
          flexShrink: 0, cursor: editMode ? 'grab' : 'default', userSelect: 'none', minHeight: 36,
        }}>
        <span style={{
          fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {cfg.title || ''}
        </span>
        {editMode && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 8 }}>
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              onMouseDown={e => e.stopPropagation()}
              title="Configure"
              style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ pointerEvents: 'none' }}>
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-8.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-12.1 1.4 1.4m9.9 9.9 1.4 1.4" />
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onRemove() }}
              onMouseDown={e => e.stopPropagation()}
              title="Remove"
              style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(249,114,114,0.08)', border: '1px solid rgba(249,114,114,0.15)', color: 'rgba(249,114,114,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(249,114,114,0.2)'; e.currentTarget.style.color = '#f97272' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(249,114,114,0.08)'; e.currentTarget.style.color = 'rgba(249,114,114,0.6)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ pointerEvents: 'none' }}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', position: 'relative', width: '100%', padding: isKPI ? 0 : (isTable ? 0 : '6px 6px 4px') }}>
        {isKPI   ? <KPIWidget   cfg={cfg} data={data} S={S} /> :
         isTable ? <TableWidget cfg={cfg} data={data} S={S} /> :
                   <ChartWidget cfg={cfg} data={data} S={S} onDrillDown={onDrillDown} />}
      </div>
    </div>
  )
}

// ── ConfigDrawer ─────────────────────────────────────────────────────────────
const lbl = { fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }
const inp = S => ({ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${S.border}`, borderRadius: 8, color: 'rgba(255,255,255,0.9)', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit' })

function ConfigDrawer({ cfg, schema, S, onSave, onClose }) {
  const [local, setLocal] = useState({ ...cfg })
  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }))
  const numCols = schema?.numeric || []
  const allCols = schema?.all || []

  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 300, zIndex: 100, background: S.card, borderLeft: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>Configure Widget</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Chart Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {CHART_TYPES.map(t => (
              <button key={t.id} onClick={() => set('type', t.id)}
                style={{ padding: '5px 9px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: local.type === t.id ? `${S.accent}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${local.type === t.id ? S.accent + '55' : 'rgba(255,255,255,0.08)'}`, color: local.type === t.id ? S.accent : 'rgba(255,255,255,0.6)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Title</label>
          <input value={local.title || ''} onChange={e => set('title', e.target.value)} style={inp(S)} />
        </div>
        {local.type !== 'kpi' && (
          <div>
            <label style={lbl}>{local.type === 'scatter' ? 'X Column (numeric)' : 'Dimension (X axis)'}</label>
            <select value={local.x_col || ''} onChange={e => set('x_col', e.target.value)} style={inp(S)}>
              <option value="">— select column —</option>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {local.type !== 'table' && (
          <div>
            <label style={lbl}>{local.type === 'kpi' ? 'Metric Column' : 'Value (Y axis)'}</label>
            <select value={local.y_col || ''} onChange={e => set('y_col', e.target.value)} style={inp(S)}>
              <option value="">— select column —</option>
              {(local.type === 'kpi' ? allCols : numCols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {local.type !== 'scatter' && local.type !== 'table' && (
          <div>
            <label style={lbl}>Aggregation</label>
            <select value={local.aggregation || 'sum'} onChange={e => set('aggregation', e.target.value)} style={inp(S)}>
              {['sum', 'avg', 'count', 'min', 'max'].map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
            </select>
          </div>
        )}
        {!['kpi', 'table', 'scatter'].includes(local.type) && (
          <div>
            <label style={lbl}>Top N (leave blank for all)</label>
            <input type="number" min="1" max="100" value={local.topN || ''} onChange={e => set('topN', e.target.value ? Number(e.target.value) : null)} style={inp(S)} placeholder="e.g. 10" />
          </div>
        )}
        {local.type === 'kpi' && (
          <>
            <div>
              <label style={lbl}>Trend % Change (optional)</label>
              <input type="number" value={local.change || ''} onChange={e => set('change', e.target.value)} style={inp(S)} placeholder="e.g. 8.5" />
            </div>
            <div>
              <label style={lbl}>Threshold (conditional color)</label>
              <input type="number" value={local.threshold || ''} onChange={e => set('threshold', e.target.value || null)} style={inp(S)} placeholder="e.g. 50000" />
            </div>
          </>
        )}
        {local.type === 'bar' && (
          <div>
            <label style={lbl}>Reference Line Value</label>
            <input type="number" value={local.threshold || ''} onChange={e => set('threshold', e.target.value || null)} style={inp(S)} placeholder="e.g. 1000" />
          </div>
        )}
        {local.type === 'table' && (
          <div>
            <label style={lbl}>Sort by</label>
            <select value={local.sortBy || ''} onChange={e => set('sortBy', e.target.value)} style={inp(S)}>
              <option value="">— none —</option>
              {allCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Sort direction</label>
              <select value={local.sortDir || 'desc'} onChange={e => set('sortDir', e.target.value)} style={inp(S)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
        <button onClick={() => onSave(local)} style={{ flex: 1, padding: '9px', borderRadius: 9, background: `linear-gradient(135deg,${S.accent},${S.accent2 || S.accent})`, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Apply</button>
      </div>
    </div>
  )
}

// ── LeftPanel — sidebar with draggable chart tiles ───────────────────────────
// KEY: draggable tiles use plain text labels. All child elements have pointerEvents:'none'
// so the parent div always receives mousedown and fires dragstart correctly.
function LeftPanel({ open, onToggle, schema, schemeName, setSchemeName, aiPrompt, setAiPrompt, onGenerate, generating, S, draggingTypeRef }) {
  return (
    <div style={{
      width: open ? 220 : 44, minWidth: open ? 220 : 44,
      background: S.card, borderRight: `1px solid ${S.border}`,
      display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden',
      flexShrink: 0, position: 'relative',
    }}>
      <button onClick={onToggle}
        style={{ width: '100%', height: 40, background: 'transparent', border: 'none', borderBottom: `1px solid ${S.border}`, color: S.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-end' : 'center', padding: open ? '0 12px' : 0, fontSize: 12 }}>
        {open ? '< Charts' : '>'}
      </button>

      {open && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* CHART TILES — draggable */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Add charts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {CHART_TYPES.map(t => (
                <div
                  key={t.id}
                  draggable={true}
                  onDragStart={e => {
                    // Store type in both dataTransfer AND ref for reliability
                    e.dataTransfer.setData('chartType', t.id)
                    e.dataTransfer.effectAllowed = 'copy'
                    draggingTypeRef.current = t.id
                  }}
                  onDragEnd={() => { draggingTypeRef.current = null }}
                  style={{
                    padding: '8px 10px', borderRadius: 8, cursor: 'grab',
                    background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.07)`,
                    display: 'flex', alignItems: 'center', gap: 9,
                    transition: 'all 0.12s', userSelect: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${S.accent}14`; e.currentTarget.style.borderColor = `${S.accent}40` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
                  {/* All children MUST have pointerEvents:'none' so drag fires on parent */}
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${S.accent}18`, border: `1px solid ${S.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <ChartIcon type={t.id} color={S.accent} size={12} />
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, pointerEvents: 'none' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Color Scheme</div>
            {Object.keys(SCHEMES).map(name => (
              <div key={name} onClick={() => setSchemeName(name)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, background: schemeName === name ? `${S.accent}15` : 'transparent' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: SCHEMES[name].accent, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: schemeName === name ? S.accent : S.muted }}>{name}</span>
              </div>
            ))}
          </div>

          {/* AI Generate */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>AI Generate</div>
            <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. 4 KPI cards for revenue, orders, customers. Monthly line chart. Bar chart top 5 products."
              rows={4} style={{ ...inp(S), resize: 'none', fontSize: 11, lineHeight: 1.5 }} />
            <button onClick={onGenerate} disabled={generating || !aiPrompt.trim()}
              style={{ width: '100%', marginTop: 6, padding: '9px', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: generating || !aiPrompt.trim() ? 'not-allowed' : 'pointer', background: generating || !aiPrompt.trim() ? 'rgba(255,255,255,0.05)' : `${S.accent}22`, border: `1px solid ${generating || !aiPrompt.trim() ? S.border : S.accent + '55'}`, color: generating || !aiPrompt.trim() ? S.muted : S.accent }}>
              {generating ? 'Building...' : 'Generate Dashboard'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── DashboardBuilder (main) ──────────────────────────────────────────────────
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
  const [schemeName,    setSchemeName]    = useState('Metric Flow')
  const [aiPrompt,      setAiPrompt]      = useState('')
  const [generating,    setGenerating]    = useState(false)
  const [dbId,          setDbId]          = useState(isNew ? null : Number(dashboardId))
  const [saveStatus,    setSaveStatus]    = useState('')

  // Ref tracks dragging type synchronously — never use state for this
  // because state updates are async and onDrop reads it immediately
  const draggingTypeRef = useRef(null)
  const autoSave        = useRef(null)
  const canvasRef       = useRef(null)
  const [canvasW,       setCanvasW]       = useState(1200)

  useEffect(() => {
    const obs = new ResizeObserver(entries => setCanvasW(entries[0].contentRect.width || 1200))
    if (canvasRef.current) obs.observe(canvasRef.current)
    return () => obs.disconnect()
  }, [])

  const S = SCHEMES[schemeName] || SCHEMES['Metric Flow']

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
      setSchemeName(db.scheme || 'Metric Flow')
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

  // ── DRAG-DROP: The only reliable implementation for react-grid-layout external DnD
  //
  // How it works:
  // 1. Sidebar tile sets e.dataTransfer AND draggingTypeRef.current on dragstart
  // 2. GridLayout has isDroppable={true} + a stable droppingItem object (always defined)
  // 3. onDropDragOver returns correct w/h for the current chart type (reads ref synchronously)
  // 4. onDrop reads type from dataTransfer (primary) or ref (fallback), creates widget
  // 5. onLayoutChange preserves __dropping-elem__ while drag is in progress,
  //    and only keeps positions for widgets that actually exist
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
    // Place at y:9999 — RGL compactType="vertical" pulls it up to first free slot
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
    setGenerating(true)
    setTimeout(() => {
      const p = aiPrompt.toLowerCase()
      const newWidgets = [], newLayout = []
      let row = 0, col = 0

      const add = (type, title, extraCfg = {}) => {
        const tid = CHART_TYPES.find(t => t.id === type)
        const w = tid?.w ?? 6, h = tid?.h ?? 5
        if (col + w > 12) { col = 0; row += h }
        const id = `w_${Date.now()}_${newWidgets.length}`
        newWidgets.push({ id, type, title, x_col: schema?.categorical?.[0] || '', y_col: schema?.numeric?.[0] || '', aggregation: 'sum', ...extraCfg })
        newLayout.push({ i: id, x: col, y: row, w, h })
        col += w; if (col >= 12) { col = 0; row += h }
      }

      const numKPI = (() => { const m = aiPrompt.match(/(\d+)\s*kpi/i); return m ? parseInt(m[1]) : /kpi|card|metric|score/i.test(p) ? 4 : 0 })()
      const KPI_LABELS = ['Total Revenue', 'Total Orders', 'Active Users', 'Conversion Rate', 'Avg Order Value', 'Profit Margin']
      const numCols = schema?.numeric || []
      for (let i = 0; i < numKPI && i < 6; i++) add('kpi', KPI_LABELS[i], { y_col: numCols[i] || numCols[0] || '', aggregation: i === 3 ? 'avg' : 'sum' })

      if (/line|trend|time|monthly|weekly|daily|over/i.test(p))  add('line',    'Trend Over Time')
      if (/area|filled|shaded/i.test(p))                         add('area',    'Performance Area')
      if (/bar|column|categ|product|region|compar/i.test(p))     add('bar',     'Category Comparison')
      if (/pie|donut|ring|distribution|share/i.test(p))          add('pie',     'Distribution')
      if (/radar|spider|performance/i.test(p))                   add('radar',   'Performance Radar')
      if (/scatter|correl|vs\b/i.test(p))                        add('scatter', 'Correlation', { x_col: schema?.numeric?.[0] || '', y_col: schema?.numeric?.[1] || '' })
      if (/rank|top|list/i.test(p))                              add('ranking', 'Top Rankings')
      if (/table/i.test(p))                                      add('table',   'Data Table', { sortBy: schema?.numeric?.[0] || '', sortDir: 'desc' })

      if (!newWidgets.length) {
        add('kpi', 'Key Metric', { y_col: schema?.numeric?.[0] || '' })
        add('bar', 'Category Comparison')
        add('line', 'Trend Over Time')
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: S.bg, color: S.text, fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 52, borderBottom: `1px solid ${S.border}`, flexShrink: 0, background: S.card }}>
        <button onClick={() => navigate(`/projects/${projectId}`)}
          style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${S.border}`, borderRadius: 7, color: S.muted, cursor: 'pointer', padding: '5px 12px', fontSize: 11 }}>
          Back
        </button>
        <input value={dashTitle} onChange={e => setDashTitle(e.target.value)} readOnly={!editMode}
          style={{ background: 'transparent', border: 'none', color: S.text, fontSize: 15, fontWeight: 800, outline: 'none', minWidth: 180, cursor: editMode ? 'text' : 'default' }} />
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          {Object.entries(SCHEMES).map(([name, sch]) => (
            <button key={name} title={name} onClick={() => setSchemeName(name)}
              style={{ width: 14, height: 14, borderRadius: 3, background: sch.accent, border: `2px solid ${schemeName === name ? '#fff' : 'transparent'}`, cursor: 'pointer', boxShadow: `0 0 4px ${sch.accent}66`, transition: 'all 0.1s' }} />
          ))}
        </div>
        <button onClick={() => setFilterBarOpen(o => !o)}
          style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: allFilters.length > 0 ? `${S.accent}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${allFilters.length > 0 ? S.accent + '55' : S.border}`, color: allFilters.length > 0 ? S.accent : S.muted }}>
          Filters {allFilters.length > 0 ? `(${allFilters.length})` : ''}
        </button>
        <button onClick={() => setEditMode(m => !m)}
          style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: editMode ? `${S.accent}22` : 'rgba(255,255,255,0.06)', border: `1px solid ${editMode ? S.accent + '55' : S.border}`, color: editMode ? S.accent : S.muted }}>
          {editMode ? 'Editing' : 'View'}
        </button>
        <button onClick={() => save(false)}
          style={{ padding: '5px 16px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: saveStatus === 'saved' ? 'rgba(16,185,129,0.15)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : `${S.accent}22`, border: `1px solid ${saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : S.accent + '44'}`, color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : S.accent, transition: 'all 0.2s' }}>
          {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
        </button>
      </div>

      {/* Filter bar */}
      {filterBarOpen && (
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.border}`, background: `${S.card}cc`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {drillFilters.map(f => (
            <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${S.accent}22`, border: `1px solid ${S.accent}44`, borderRadius: 99, fontSize: 11, color: S.accent }}>
              {f.col} = {f.val}
              <span onClick={() => setDrillFilters(prev => prev.filter(x => x.id !== f.id))} style={{ cursor: 'pointer', marginLeft: 2, opacity: 0.6, fontSize: 13 }}>×</span>
            </span>
          ))}
          {globalFilters.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <select value={f.col} onChange={e => updateFilter(f.id, 'col', e.target.value)} style={{ ...inp(S), padding: '4px 6px', fontSize: 10, width: 110 }}>
                {(schema?.all || []).map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={f.op} onChange={e => updateFilter(f.id, 'op', e.target.value)} style={{ ...inp(S), padding: '4px 6px', fontSize: 10, width: 50 }}>
                {['=', '!=', '>', '<', '>=', '<=', 'contains'].map(op => <option key={op}>{op}</option>)}
              </select>
              <input value={f.val} onChange={e => updateFilter(f.id, 'val', e.target.value)} placeholder="value" style={{ ...inp(S), padding: '4px 8px', fontSize: 10, width: 90 }} />
              <button onClick={() => removeFilter(f.id)} style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(249,114,114,0.1)', border: 'none', color: '#f97272', cursor: 'pointer', fontSize: 12 }}>×</button>
            </div>
          ))}
          <button onClick={addFilter} style={{ padding: '4px 10px', borderRadius: 7, background: `${S.accent}15`, border: `1px solid ${S.accent}44`, color: S.accent, cursor: 'pointer', fontSize: 11 }}>+ Add Filter</button>
          {allFilters.length > 0 && (
            <button onClick={clearAllFilters} style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.border}`, color: S.muted, cursor: 'pointer', fontSize: 11 }}>Clear all</button>
          )}
        </div>
      )}

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        <LeftPanel
          open={leftOpen} onToggle={() => setLeftOpen(o => !o)}
          schema={schema} schemeName={schemeName} setSchemeName={setSchemeName}
          aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
          onGenerate={handleGenerate} generating={generating}
          S={S} draggingTypeRef={draggingTypeRef} />

        {/* Canvas */}
        <div ref={canvasRef}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', background: S.bg }}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={handleCanvasDrop}>

          {!rawData && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: 320 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px', background: `${S.accent}12`, border: `1px solid ${S.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.accent} strokeWidth="1.5" strokeOpacity="0.7">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>No dataset connected</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6 }}>Go back to the project page and upload a dataset</div>
            </div>
          )}

          {rawData && widgets.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: 340 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px', background: `${S.accent}10`, border: `1px dashed ${S.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={S.accent} strokeWidth="1.5" strokeOpacity="0.6">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>Canvas is empty</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
                Drag a chart type from the left panel onto the canvas
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
            margin={[10, 10]}
            containerPadding={[12, 12]}>
            {widgets.map(w => (
              <div key={w.id} style={{ height: '100%' }}>
                <WidgetCard
                  cfg={w} rawData={rawData} allFilters={allFilters}
                  editMode={editMode} S={S}
                  onEdit={() => setEditingId(w.id)}
                  onRemove={() => {
                    setWidgets(prev => prev.filter(x => x.id !== w.id))
                    setGridLayout(prev => prev.filter(l => l.i !== w.id))
                  }}
                  onDrillDown={handleDrillDown} />
              </div>
            ))}
          </GridLayout>
        </div>

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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .react-grid-item.react-grid-placeholder { background: ${S.accent}18 !important; border: 1.5px dashed ${S.accent}55 !important; border-radius: 14px !important; }
        .react-grid-item > .react-resizable-handle { opacity: 0; transition: opacity 0.2s; }
        .react-grid-item:hover > .react-resizable-handle { opacity: 0.45; }
        .react-grid-item > .react-resizable-handle::after { border-color: ${S.accent}99 !important; width: 8px !important; height: 8px !important; }
        * { box-sizing: border-box; }
        select option { background: #1a1d28; color: rgba(255,255,255,0.85); }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}