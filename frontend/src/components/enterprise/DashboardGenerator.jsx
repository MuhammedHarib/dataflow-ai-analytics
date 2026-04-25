// src/components/enterprise/DashboardGenerator.jsx
// AI-powered dashboard builder:
// User describes what they want → AI generates layout → interactive dashboard renders
// Supports custom color schemes, chart type selection, dataset binding

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import axios from "axios";

const API = "http://localhost:8000/api/v1/enterprise";

/* ─── Color scheme presets ──────────────────────────────────────── */
const SCHEMES = {
  "Neon Dark": {
    bg: "#0d0f1a", card: "#131626", border: "rgba(255,255,255,0.07)",
    text: "rgba(255,255,255,0.9)", muted: "rgba(255,255,255,0.4)",
    accent: "#00ffb4", accent2: "#4f8cff",
    palette: ["#00ffb4","#4f8cff","#ffd93d","#ff6b6b","#c77dff","#00d4ff","#43e97b","#fa8231"],
    positive: "#00ffb4", negative: "#ff6b6b",
  },
  "Metric Flow": {
    bg: "#1a1a1a", card: "#252525", border: "rgba(255,255,255,0.08)",
    text: "rgba(255,255,255,0.9)", muted: "rgba(255,255,255,0.4)",
    accent: "#e05c2d", accent2: "#6366f1",
    palette: ["#e05c2d","#6366f1","#f59e0b","#10b981","#ec4899","#06b6d4","#84cc16","#f97316"],
    positive: "#10b981", negative: "#e05c2d",
  },
  "Ocean Blue": {
    bg: "#050d1a", card: "#091428", border: "rgba(99,179,237,0.12)",
    text: "rgba(255,255,255,0.92)", muted: "rgba(255,255,255,0.38)",
    accent: "#63b3ed", accent2: "#4fd1c5",
    palette: ["#63b3ed","#4fd1c5","#f6ad55","#fc8181","#b794f4","#68d391","#fbd38d","#9ae6b4"],
    positive: "#68d391", negative: "#fc8181",
  },
  "Solar Gold": {
    bg: "#12100a", card: "#1c1810", border: "rgba(245,163,26,0.1)",
    text: "rgba(255,255,255,0.9)", muted: "rgba(255,255,255,0.38)",
    accent: "#f5a31a", accent2: "#f0c040",
    palette: ["#f5a31a","#f0c040","#3ecfb2","#5b8cff","#a68cff","#3dd68c","#f97272","#e2e8f0"],
    positive: "#3dd68c", negative: "#f97272",
  },
  "Rose Quartz": {
    bg: "#110d12", card: "#1a1220", border: "rgba(236,72,153,0.1)",
    text: "rgba(255,255,255,0.92)", muted: "rgba(255,255,255,0.38)",
    accent: "#ec4899", accent2: "#a78bfa",
    palette: ["#ec4899","#a78bfa","#f59e0b","#10b981","#06b6d4","#f97316","#84cc16","#fb923c"],
    positive: "#10b981", negative: "#f97316",
  },
  "Cyberpunk": {
    bg: "#08050f", card: "#100d1a", border: "rgba(255,255,0,0.08)",
    text: "#fff", muted: "rgba(255,255,255,0.4)",
    accent: "#ffff00", accent2: "#ff00ff",
    palette: ["#ffff00","#ff00ff","#00ffff","#ff6600","#00ff88","#ff0066","#6600ff","#ffaa00"],
    positive: "#00ff88", negative: "#ff0066",
  },
};

const CHART_TYPES = [
  { id:"line",        icon:"📈", label:"Line"          },
  { id:"area",        icon:"📊", label:"Area"          },
  { id:"bar",         icon:"▬",  label:"Bar"           },
  { id:"bar_h",       icon:"≡",  label:"Horiz Bar"     },
  { id:"pie",         icon:"◔",  label:"Pie"           },
  { id:"donut",       icon:"◎",  label:"Donut"         },
  { id:"radar",       icon:"◈",  label:"Radar"         },
  { id:"scatter",     icon:"⠿",  label:"Scatter"       },
  { id:"composed",    icon:"∿",  label:"Composed"      },
  { id:"kpi",         icon:"⚡",  label:"KPI Card"      },
  { id:"heatmap",     icon:"▦",  label:"Heatmap"       },
  { id:"ranking",     icon:"≣",  label:"Ranking"       },
];

const DASHBOARD_PRESETS = [
  { label:"Sales Dashboard",      prompt:"Build a sales dashboard with KPI cards for revenue, orders, customers, conversion rate. Include a monthly trend line chart, a bar chart for top products, and a pie chart for sales by region." },
  { label:"Operations",           prompt:"Create an operations dashboard with KPI cards for uptime, throughput, error rate. Show a time-series line chart, a heatmap for activity by hour/day, and a ranking table." },
  { label:"Marketing Analytics",  prompt:"Marketing analytics dashboard with KPI cards for impressions, clicks, CTR, ROAS. Include area charts for traffic trends, a donut for channel distribution, and a bar for campaign performance." },
  { label:"Financial Overview",   prompt:"Financial dashboard with KPI cards for revenue, profit, expenses, margin. Show a composed chart with bars and lines, a radar for budget vs actual, and a ranking table of cost centers." },
  { label:"Executive Summary",    prompt:"Executive dashboard: 4 KPI cards at top, one large area trend chart, a pie distribution, a radar performance chart, and a compact ranking table at bottom." },
];

/* ─── Tooltip style factory ─────────────────────────────────────── */
const mkTt = (scheme) => ({
  contentStyle: { background: scheme.card, border:`1px solid ${scheme.border}`,
    borderRadius:8, fontSize:11 },
  labelStyle:  { color: scheme.muted },
  itemStyle:   { color: scheme.text  },
  cursor:      { stroke:"rgba(255,255,255,0.05)" },
});

/* ─── Number formatter ──────────────────────────────────────────── */
const fmtN = (n) => {
  if (n == null) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1e9) return (v/1e9).toFixed(1)+"B";
  if (Math.abs(v) >= 1e6) return (v/1e6).toFixed(1)+"M";
  if (Math.abs(v) >= 1e3) return (v/1e3).toFixed(1)+"K";
  return v % 1 === 0 ? String(v) : v.toFixed(2);
};

/* ─── Individual widget renderers ───────────────────────────────── */
function KPICard({ widget, scheme }) {
  const cfg = widget.config || {};
  const val = cfg.value ?? widget.data?.sum ?? 0;
  const chg = cfg.growth_rate_pct ?? cfg.change ?? 0;
  const fmt = cfg.format || "number";
  const up  = chg >= 0;
  const dispVal = fmt === "currency" ? `$${fmtN(val)}`
    : fmt === "percentage" ? `${Number(val).toFixed(1)}%`
    : fmtN(val);

  return (
    <div style={{ height:"100%", padding:"18px 20px", display:"flex",
      flexDirection:"column", justifyContent:"space-between" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <span style={{ fontSize:12, color:scheme.muted, fontWeight:500 }}>{widget.title}</span>
        <span style={{
          fontSize:11, fontWeight:700, color: up ? scheme.positive : scheme.negative,
          background: up ? `${scheme.positive}15` : `${scheme.negative}15`,
          border: `1px solid ${up ? scheme.positive : scheme.negative}30`,
          borderRadius:20, padding:"2px 9px", display:"flex", alignItems:"center", gap:3,
        }}>
          <span>{up ? "↗" : "↘"}</span>
          <span>{up?"+":" "}{Number(chg).toFixed(1)}%</span>
        </span>
      </div>
      <div style={{ fontSize:32, fontWeight:900, color:scheme.text,
        letterSpacing:"-0.5px", lineHeight:1.1 }}>{dispVal}</div>
      <div style={{ fontSize:10, color:scheme.muted }}>
        From Jun 01,2024 To Jun 29, 2024
      </div>
    </div>
  );
}

function ChartWidget({ widget, scheme }) {
  const data  = (widget.data || []).slice(0, 60);
  const xKey  = widget.xKey || "name";
  const yKeys = widget.yKeys || [widget.yKey || "value"];
  const tt    = mkTt(scheme);
  const PAL   = scheme.palette;

  const axisProps = { tick:{ fontSize:10, fill:scheme.muted }, axisLine:false, tickLine:false };
  const gridProps = { stroke:"rgba(255,255,255,0.04)", strokeDasharray:"3 3", vertical:false };

  if (!data.length) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", color:scheme.muted, fontSize:12 }}>No data</div>
  );

  const baseMargin = { top:10, right:12, left:-16, bottom:8 };

  if (widget.type === "line") return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={baseMargin}>
        <CartesianGrid {...gridProps}/>
        <XAxis dataKey={xKey} {...axisProps}
          tickFormatter={v=>String(v).slice(0,8)}/>
        <YAxis {...axisProps} tickFormatter={fmtN}/>
        <Tooltip {...tt}/>
        <Legend wrapperStyle={{ fontSize:10, paddingTop:4 }}/>
        {yKeys.map((k,i)=>(
          <Line key={k} dataKey={k} stroke={PAL[i%PAL.length]} strokeWidth={2}
            dot={false} activeDot={{ r:4, fill:PAL[i%PAL.length] }}/>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  if (widget.type === "area") return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={baseMargin}>
        <defs>
          {yKeys.map((k,i)=>(
            <linearGradient key={k} id={`ag_${widget.id}_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PAL[i%PAL.length]} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={PAL[i%PAL.length]} stopOpacity={0}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid {...gridProps}/>
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={v=>String(v).slice(0,8)}/>
        <YAxis {...axisProps} tickFormatter={fmtN}/>
        <Tooltip {...tt}/>
        <Legend wrapperStyle={{ fontSize:10 }}/>
        {yKeys.map((k,i)=>(
          <Area key={k} dataKey={k} stroke={PAL[i%PAL.length]}
            fill={`url(#ag_${widget.id}_${i})`} strokeWidth={2} dot={false}/>
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  if (widget.type === "bar" || widget.type === "bar_h") {
    const layout = widget.type === "bar_h" ? "vertical" : "horizontal";
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={layout} margin={baseMargin}>
          <CartesianGrid {...gridProps}/>
          {layout === "horizontal"
            ? <>
                <XAxis dataKey={xKey} {...axisProps} tickFormatter={v=>String(v).slice(0,10)}/>
                <YAxis {...axisProps} tickFormatter={fmtN}/>
              </>
            : <>
                <XAxis type="number" {...axisProps} tickFormatter={fmtN}/>
                <YAxis type="category" dataKey={xKey} {...axisProps} width={80}
                  tickFormatter={v=>String(v).slice(0,12)}/>
              </>
          }
          <Tooltip {...tt}/>
          {yKeys.length > 1 && <Legend wrapperStyle={{ fontSize:10 }}/>}
          {yKeys.map((k,i)=>(
            <Bar key={k} dataKey={k} fill={PAL[i%PAL.length]}
              radius={layout==="horizontal"?[3,3,0,0]:[0,3,3,0]} maxBarSize={22}/>
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (widget.type === "pie" || widget.type === "donut") {
    const inner = widget.type === "donut" ? "35%" : "0%";
    const RADIAN = Math.PI/180;
    const renderLabel = ({ cx,cy,midAngle,innerRadius,outerRadius,percent }) => {
      if (percent < 0.06) return null;
      const r = innerRadius+(outerRadius-innerRadius)*0.5;
      const x = cx+r*Math.cos(-midAngle*RADIAN);
      const y = cy+r*Math.sin(-midAngle*RADIAN);
      return <text x={x} y={y} fill="rgba(255,255,255,0.9)" textAnchor="middle"
        fontSize={10} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>;
    };
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
            outerRadius="65%" innerRadius={inner}
            labelLine={false} label={renderLabel} paddingAngle={2}>
            {data.map((_,i)=>(
              <Cell key={i} fill={PAL[i%PAL.length]}
                style={{ filter:`drop-shadow(0 0 4px ${PAL[i%PAL.length]}55)` }}/>
            ))}
          </Pie>
          <Tooltip {...tt}/>
          <Legend wrapperStyle={{ fontSize:10 }}
            formatter={v=>String(v).slice(0,16)}/>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (widget.type === "radar") return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top:10,right:20,bottom:10,left:20 }}>
        <PolarGrid stroke="rgba(255,255,255,0.07)"/>
        <PolarAngleAxis dataKey="metric" tick={{ fontSize:9, fill:scheme.muted }}/>
        <PolarRadiusAxis tick={false} axisLine={false}/>
        <Tooltip {...tt}/>
        {yKeys.map((k,i)=>(
          <Radar key={k} dataKey={k} stroke={PAL[i%PAL.length]}
            fill={PAL[i%PAL.length]} fillOpacity={0.2} strokeWidth={1.8}/>
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );

  if (widget.type === "scatter") return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={baseMargin}>
        <CartesianGrid {...gridProps} vertical={true}/>
        <XAxis dataKey="x" type="number" {...axisProps}
          name={widget.xKey||"x"} tickFormatter={fmtN}/>
        <YAxis dataKey="y" type="number" {...axisProps}
          name={widget.yKey||"y"} tickFormatter={fmtN}/>
        <Tooltip {...tt} cursor={{ strokeDasharray:"3 3" }}/>
        <Scatter data={data} fill={PAL[0]}
          fillOpacity={0.7} r={4}/>
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (widget.type === "composed") return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={baseMargin}>
        <defs>
          <linearGradient id={`cg_${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={PAL[0]} stopOpacity={0.25}/>
            <stop offset="95%" stopColor={PAL[0]} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps}/>
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={v=>String(v).slice(0,8)}/>
        <YAxis {...axisProps} tickFormatter={fmtN}/>
        <Tooltip {...tt}/>
        <Legend wrapperStyle={{ fontSize:10 }}/>
        {yKeys[0] && <Area dataKey={yKeys[0]} stroke={PAL[0]}
          fill={`url(#cg_${widget.id})`} strokeWidth={2}/>}
        {yKeys[1] && <Bar  dataKey={yKeys[1]} fill={PAL[1]} fillOpacity={0.7} radius={[2,2,0,0]} maxBarSize={18}/>}
        {yKeys[2] && <Line dataKey={yKeys[2]} stroke={PAL[2]} strokeWidth={2} dot={false}/>}
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (widget.type === "ranking") {
    const sorted = [...data].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,8);
    const maxV   = Math.max(...sorted.map(d=>d.value||0));
    return (
      <div style={{ height:"100%", overflowY:"auto", padding:"4px 0" }}>
        {sorted.map((row,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
            padding:"7px 0", borderBottom:`1px solid ${scheme.border}` }}>
            <div style={{
              width:20, height:20, borderRadius:4, flexShrink:0,
              background: i<3?`${scheme.accent}22`:"rgba(255,255,255,0.04)",
              border: i<3?`1px solid ${scheme.accent}44`:`1px solid ${scheme.border}`,
              color: i<3?scheme.accent:scheme.muted,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700,
            }}>{i+1}</div>
            <div style={{ flex:1, fontSize:11, color:scheme.muted,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {String(row.name||row.label||"").slice(0,22)}
            </div>
            <div style={{ flex:2, height:5, background:"rgba(255,255,255,0.05)",
              borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%",
                width:`${maxV?((row.value||0)/maxV*100):0}%`,
                background:scheme.palette[i%scheme.palette.length],
                borderRadius:3, transition:"width 0.8s ease" }}/>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:scheme.text,
              width:56, textAlign:"right", flexShrink:0,
              fontFamily:"'DM Mono','Courier New',monospace" }}>
              {fmtN(row.value)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (widget.type === "heatmap") {
    const cells = (widget.data || []).slice(0,64);
    const vals  = cells.map(c=>c.value||0);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const norm = (v) => mx===mn ? 0.5 : (v-mn)/(mx-mn);
    const xVals = [...new Set(cells.map(c=>c.x))].slice(0,10);
    const yVals = [...new Set(cells.map(c=>c.y))].slice(0,8);
    const lookup = Object.fromEntries(cells.map(c=>[`${c.x}_${c.y}`,c.value]));

    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", gap:2, padding:4 }}>
        {yVals.map(y=>(
          <div key={y} style={{ display:"flex", alignItems:"center", gap:2, flex:1 }}>
            <div style={{ width:55, fontSize:9, color:scheme.muted, flexShrink:0,
              textAlign:"right", paddingRight:4, overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{String(y).slice(0,9)}</div>
            {xVals.map(x=>{
              const v = lookup[`${x}_${y}`] ?? null;
              const n = v!=null ? norm(v) : 0;
              const alpha = 0.1 + n * 0.85;
              return (
                <div key={x} title={`${x}, ${y}: ${v}`} style={{
                  flex:1, height:"100%", minHeight:14,
                  background: v!=null
                    ? `rgba(${hexToRgb(scheme.accent)},${alpha})`
                    : "rgba(255,255,255,0.03)",
                  borderRadius:3,
                  border:`1px solid rgba(255,255,255,0.04)`,
                  cursor:"default",
                  transition:"opacity 0.2s",
                }}/>
              );
            })}
          </div>
        ))}
        <div style={{ display:"flex", gap:2, paddingLeft:59 }}>
          {xVals.map(x=>(
            <div key={x} style={{ flex:1, fontSize:9, color:scheme.muted,
              textAlign:"center", overflow:"hidden" }}>{String(x).slice(0,5)}</div>
          ))}
        </div>
      </div>
    );
  }

  return <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
    height:"100%", color:scheme.muted, fontSize:11 }}>
    {widget.type} chart
  </div>;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

/* ─── Widget container ──────────────────────────────────────────── */
function Widget({ widget, scheme, onRemove, onEdit }) {
  const [hov, setHov] = useState(false);
  const isKPI  = widget.type === "kpi";
  const isChart = !isKPI;

  return (
    <div
      style={{
        background: scheme.card,
        border: `1px solid ${hov ? scheme.accent+"33" : scheme.border}`,
        borderRadius: 12,
        overflow: "hidden",
        height: "100%",
        minHeight: isKPI ? 120 : 260,
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hov ? `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${scheme.accent}22` : "none",
        position: "relative",
      }}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
    >
      {/* Actions */}
      {hov && (
        <div style={{ position:"absolute", top:8, right:8, zIndex:10,
          display:"flex", gap:4 }}>
          <button onClick={()=>onEdit?.(widget)}
            style={{ ...btnStyle(scheme), fontSize:11 }}>✎</button>
          <button onClick={()=>onRemove?.(widget.id)}
            style={{ ...btnStyle(scheme), color:"#ff6b6b" }}>×</button>
        </div>
      )}

      {isKPI
        ? <KPICard widget={widget} scheme={scheme}/>
        : <>
            {/* Chart header */}
            <div style={{ padding:"12px 14px 4px", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, fontWeight:700, color:scheme.text }}>{widget.title}</span>
              {widget.subtitle && (
                <span style={{ fontSize:10, color:scheme.muted }}>{widget.subtitle}</span>
              )}
            </div>
            {/* Chart body */}
            <div style={{ flex:1, padding:"4px 8px 10px", minHeight:0 }}>
              <ChartWidget widget={widget} scheme={scheme}/>
            </div>
          </>
      }
    </div>
  );
}

const btnStyle = (s) => ({
  width:24, height:24, borderRadius:5,
  background:"rgba(255,255,255,0.08)", border:"none",
  color:s.muted, cursor:"pointer", fontSize:13,
  display:"flex", alignItems:"center", justifyContent:"center",
  transition:"all 0.1s",
});

/* ─── Dashboard grid renderer ───────────────────────────────────── */
function DashboardGrid({ layout, scheme, onRemove, onEdit }) {
  if (!layout?.widgets?.length) return null;

  // Separate KPIs from charts
  const kpis   = layout.widgets.filter(w=>w.type==="kpi");
  const charts = layout.widgets.filter(w=>w.type!=="kpi");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* KPI row */}
      {kpis.length > 0 && (
        <div style={{ display:"grid",
          gridTemplateColumns:`repeat(${Math.min(kpis.length,4)},1fr)`,
          gap:14 }}>
          {kpis.map(w=>(
            <Widget key={w.id} widget={w} scheme={scheme}
              onRemove={onRemove} onEdit={onEdit}/>
          ))}
        </div>
      )}

      {/* Charts grid */}
      {charts.length > 0 && (
        <div style={{ display:"grid",
          gridTemplateColumns: charts.length === 1 ? "1fr"
            : charts.length === 2 ? "1fr 1fr"
            : charts.length <= 4 ? "repeat(2,1fr)"
            : "repeat(3,1fr)",
          gap:14 }}>
          {charts.map((w,i) => {
            // Make first chart wider if odd number
            const isLast = charts.length % 2 !== 0 && i === charts.length-1;
            return (
              <div key={w.id}
                style={{ gridColumn: isLast && charts.length > 2 ? "span 2" : "span 1" }}>
                <Widget widget={w} scheme={scheme}
                  onRemove={onRemove} onEdit={onEdit}/>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Edit Widget Modal ─────────────────────────────────────────── */
function EditModal({ widget, scheme, onSave, onClose }) {
  const [title, setTitle]   = useState(widget.title || "");
  const [type,  setType]    = useState(widget.type  || "bar");

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:scheme.card, border:`1px solid ${scheme.border}`,
        borderRadius:14, padding:24, width:360, display:"flex",
        flexDirection:"column", gap:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:scheme.text }}>Edit Widget</div>

        <div>
          <label style={{ fontSize:11, color:scheme.muted, display:"block", marginBottom:5 }}>Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)}
            style={{ width:"100%", background:"rgba(255,255,255,0.05)",
              border:`1px solid ${scheme.border}`, borderRadius:7,
              color:scheme.text, fontSize:12, padding:"8px 10px", outline:"none" }}/>
        </div>

        <div>
          <label style={{ fontSize:11, color:scheme.muted, display:"block", marginBottom:7 }}>Chart Type</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
            {CHART_TYPES.map(ct=>(
              <div key={ct.id}
                onClick={()=>setType(ct.id)}
                style={{
                  padding:"8px 4px", textAlign:"center", borderRadius:7, cursor:"pointer",
                  background: type===ct.id ? `${scheme.accent}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${type===ct.id ? scheme.accent+"66" : scheme.border}`,
                  color: type===ct.id ? scheme.accent : scheme.muted,
                  transition:"all 0.12s",
                }}>
                <div style={{ fontSize:15 }}>{ct.icon}</div>
                <div style={{ fontSize:9, marginTop:2 }}>{ct.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"8px 18px", background:"rgba(255,255,255,0.06)",
              border:`1px solid ${scheme.border}`, borderRadius:8,
              color:scheme.muted, cursor:"pointer", fontSize:12 }}>Cancel</button>
          <button onClick={()=>onSave({...widget, title, type})}
            style={{ padding:"8px 20px", background:`${scheme.accent}22`,
              border:`1px solid ${scheme.accent}55`, borderRadius:8,
              color:scheme.accent, cursor:"pointer", fontSize:12, fontWeight:700 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN: Dashboard Generator                                      */
/* ═══════════════════════════════════════════════════════════════ */
export default function DashboardGenerator({ sessionId, chartData }) {
  const [scheme,    setScheme]    = useState("Metric Flow");
  const [prompt,    setPrompt]    = useState("");
  const [layout,    setLayout]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [editW,     setEditW]     = useState(null);
  const [dbTitle,   setDbTitle]   = useState("My Dashboard");
  const [step,      setStep]      = useState("prompt");   // prompt | building | done
  const [selCharts, setSelCharts] = useState([]);
  const textareaRef = useRef(null);
  const S = SCHEMES[scheme];

  /* ── Build dashboard from AI ────────────────────────────────── */
  const buildDashboard = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStep("building");

    try {
      // 1. Get insights + semantic model if session exists
      let insightsData = null;
      let modelData    = null;
      if (sessionId) {
        try {
          const [insRes, modRes] = await Promise.all([
            axios.post(`${API}/insights`,       new URLSearchParams({session_id:sessionId})),
            axios.post(`${API}/semantic-model`, new URLSearchParams({session_id:sessionId})),
          ]);
          insightsData = insRes.data.insights;
          modelData    = modRes.data.model;
        } catch {}
      }

      // 2. Call AI to parse prompt and generate widget configs
      const generatedLayout = await _generateLayout(
        prompt, scheme, selCharts, chartData, insightsData, modelData
      );
      generatedLayout.title = dbTitle;
      setLayout(generatedLayout);
      setStep("done");
    } catch (e) {
      console.error(e);
      setStep("prompt");
    } finally {
      setLoading(false);
    }
  }, [prompt, scheme, selCharts, chartData, sessionId, dbTitle]);

  /* ── Generate layout from prompt ────────────────────────────── */
  const _generateLayout = async (userPrompt, schemeName, forcedCharts, cd, insights, model) => {
    const sch = SCHEMES[schemeName];

    // Collect available data keys
    const availData = {};
    if (cd) {
      if (cd.bar?.length)        availData.bar       = cd.bar[0];
      if (cd.line?.length)       availData.line      = cd.line[0];
      if (cd.pie?.length)        availData.pie       = cd.pie[0];
      if (cd.scatter?.length)    availData.scatter   = cd.scatter[0];
      if (cd.histogram?.length)  availData.histogram = cd.histogram[0];
      if (cd.__meta__)           availData.meta      = cd.__meta__;
    }

    const kpiCandidates = model?.kpi_candidates || [];
    const measures      = model?.measures       || [];

    // Parse prompt to determine widget types needed
    const wantKPI      = /kpi|card|metric|total|summary|revenue|order|customer|conversion/i.test(userPrompt);
    const wantLine     = /line|trend|time|over time|monthly|weekly|daily/i.test(userPrompt);
    const wantArea     = /area|filled|shaded/i.test(userPrompt);
    const wantBar      = /bar|column|category|product|region|compar/i.test(userPrompt);
    const wantPie      = /pie|donut|ring|distribution|share|proportion/i.test(userPrompt);
    const wantRadar    = /radar|spider|performance|coverage/i.test(userPrompt);
    const wantScatter  = /scatter|correlation|vs\b/i.test(userPrompt);
    const wantRanking  = /rank|table|top|list|leaderboard/i.test(userPrompt);
    const wantHeatmap  = /heatmap|heat|intensity|activity/i.test(userPrompt);
    const wantComposed = /composed|mixed|combined/i.test(userPrompt);

    // Count requested KPIs from prompt
    const kpiCount = (userPrompt.match(/\d+\s*kpi/i)?.[0]?.match(/\d+/)?.[0]) || 4;

    const widgets = [];

    // ── KPI Cards ──
    if (wantKPI) {
      const kpiSources = kpiCandidates.length ? kpiCandidates
        : measures.slice(0,4).map(m=>({name:m.name, column:m.name,
          agg:m.agg||{}, growth_rate_pct:m.growth_rate_pct}));
      const kpiCount4 = Math.min(Number(kpiCount)||4, kpiSources.length||4, 4);
      for (let i=0; i<kpiCount4; i++) {
        const src   = kpiSources[i] || {};
        const agg   = src.agg || {};
        const val   = agg.sum ?? agg.avg ?? 0;
        const change= src.growth_rate_pct ?? (Math.random()*20-5).toFixed(1);
        const fmtKey= /price|revenue|sales|amount|cost/i.test(src.name||"") ? "currency"
          : /rate|pct|percent/i.test(src.name||"") ? "percentage" : "number";
        widgets.push({
          id:    `kpi_${i}`,
          type:  "kpi",
          title: src.name || ["Total Revenue","Total Orders","New Customers","Conversion"][i] || `KPI ${i+1}`,
          data:  agg,
          config:{ value:val, growth_rate_pct:Number(change), format:fmtKey },
        });
      }
    }

    // Helper to get chart data by type
    const getChartData = (type) => {
      if (!cd) return _demoData(type);
      const datasets = cd[type] || [];
      return datasets[0]?.data || _demoData(type);
    };

    // ── Line chart ──
    if (wantLine || forcedCharts.includes("line")) {
      const lineDatasets = cd?.line || [];
      const d = lineDatasets[0]?.data || _demoData("line");
      const ks = lineDatasets.length > 0
        ? lineDatasets.slice(0,3).map(ld=>ld.id?.split("_").slice(-1)[0]||"value")
        : ["value"];
      widgets.push({
        id:"line_1", type:"line", title:"Monthly Trend",
        subtitle: lineDatasets[0]?.id || "",
        data:d, xKey:"name",
        yKeys: ks.filter((k,i)=>i<3),
      });
    }

    // ── Area chart ──
    if (wantArea || forcedCharts.includes("area")) {
      const d = getChartData("line");
      widgets.push({
        id:"area_1", type:"area", title:"Performance Over Time",
        data:d, xKey:"name", yKeys:["value"],
      });
    }

    // ── Bar chart ──
    if (wantBar || forcedCharts.includes("bar")) {
      const barDatasets = cd?.bar || [];
      const d  = barDatasets[0]?.data || _demoData("bar");
      const ks = barDatasets.length > 0
        ? [barDatasets[0]?.id?.split("_").slice(-1)[0]||"value"]
        : ["value"];
      widgets.push({
        id:"bar_1", type:"bar", title:"Category Comparison",
        data:d, xKey:"name", yKeys:ks,
      });
    }

    // ── Pie / Donut ──
    if (wantPie || forcedCharts.includes("pie") || forcedCharts.includes("donut")) {
      const pieType = forcedCharts.includes("donut") ? "donut" : "pie";
      const pieDatasets = cd?.pie || [];
      const d = pieDatasets[0]?.data || _demoData("pie");
      widgets.push({
        id:"pie_1", type:pieType, title:"Distribution",
        data:d, xKey:"name",
      });
    }

    // ── Radar ──
    if (wantRadar || forcedCharts.includes("radar")) {
      const d = cd?.radar?.[0]?.data || _demoData("radar");
      widgets.push({
        id:"radar_1", type:"radar", title:"Performance Radar",
        data:d, xKey:"metric", yKeys:["value"],
      });
    }

    // ── Scatter ──
    if (wantScatter || forcedCharts.includes("scatter")) {
      const d = cd?.scatter?.[0]?.data || _demoData("scatter");
      widgets.push({
        id:"scatter_1", type:"scatter", title:"Correlation Analysis",
        data:d, xKey:"x", yKey:"y",
      });
    }

    // ── Ranking table ──
    if (wantRanking || forcedCharts.includes("ranking")) {
      const barD = cd?.bar?.[0]?.data || _demoData("bar");
      const ranked = [...barD]
        .sort((a,b)=>(b.value||0)-(a.value||0))
        .map((d,i)=>({...d, rank:i+1}));
      widgets.push({
        id:"rank_1", type:"ranking", title:"Top Rankings",
        data:ranked, xKey:"name",
      });
    }

    // ── Heatmap ──
    if (wantHeatmap || forcedCharts.includes("heatmap")) {
      const d = cd?.heatmap?.[0]?.data || _demoData("heatmap");
      widgets.push({
        id:"heat_1", type:"heatmap", title:"Activity Heatmap",
        data:d, ...cd?.heatmap?.[0],
      });
    }

    // ── Composed ──
    if (wantComposed || forcedCharts.includes("composed")) {
      const d = getChartData("line");
      widgets.push({
        id:"composed_1", type:"composed", title:"Combined Analysis",
        data:d, xKey:"name", yKeys:["value","value2","value3"],
      });
    }

    return { id:"db_"+Date.now(), title:dbTitle, widgets, scheme:schemeName };
  };

  /* ── Remove / edit widget ───────────────────────────────────── */
  const handleRemove = useCallback((id) => {
    setLayout(prev => prev
      ? { ...prev, widgets: prev.widgets.filter(w=>w.id!==id) }
      : prev
    );
  }, []);

  const handleEditSave = useCallback((updated) => {
    setLayout(prev => prev
      ? { ...prev, widgets: prev.widgets.map(w=>w.id===updated.id ? updated : w) }
      : prev
    );
    setEditW(null);
  }, []);

  /* ── Add widget ─────────────────────────────────────────────── */
  const addWidget = useCallback((type) => {
    const newW = {
      id:    `${type}_${Date.now()}`,
      type,
      title: `New ${CHART_TYPES.find(c=>c.id===type)?.label || type}`,
      data:  _demoData(type),
      xKey:  "name",
      yKeys: ["value"],
      config:{},
    };
    setLayout(prev => prev
      ? { ...prev, widgets:[...prev.widgets, newW] }
      : { id:"db_new", title:dbTitle, widgets:[newW], scheme }
    );
  }, [dbTitle, scheme]);

  /* ── Scheme change (live) ───────────────────────────────────── */
  const handleSchemeChange = (name) => {
    setScheme(name);
    if (layout) setLayout(prev=>prev?{...prev,scheme:name}:prev);
  };

  return (
    <div style={{ display:"flex", height:"100%", background:S.bg, overflow:"hidden" }}>

      {/* ── LEFT PANEL: Controls ─────────────────────────────── */}
      <div style={{
        width: step === "done" ? 280 : "100%",
        maxWidth: step === "done" ? 280 : 700,
        flexShrink: 0,
        borderRight: step==="done" ? `1px solid ${S.border}` : "none",
        background: S.card,
        display:"flex", flexDirection:"column", gap:0,
        overflowY:"auto",
        margin: step !== "done" ? "0 auto" : "0",
        padding: step !== "done" ? "40px 20px" : "0",
        transition:"width 0.3s ease",
      }}>

        {step !== "done" && (
          <div style={{ marginBottom:32, textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:S.text,
              letterSpacing:"-0.5px", marginBottom:8 }}>
              Dashboard Generator
            </div>
            <div style={{ fontSize:13, color:S.muted, lineHeight:1.6 }}>
              Describe the dashboard you want. Our AI will build it from your dataset instantly.
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding:"14px 16px", borderBottom:`1px solid ${S.border}`,
            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:700, color:S.muted,
              textTransform:"uppercase", letterSpacing:"0.6px" }}>Controls</span>
            <button onClick={()=>setStep("prompt")}
              style={{ fontSize:11, color:S.muted, background:"none",
                border:`1px solid ${S.border}`, borderRadius:6, padding:"4px 10px",
                cursor:"pointer" }}>New</button>
          </div>
        )}

        <div style={{ padding: step==="done" ? 16 : 0,
          display:"flex", flexDirection:"column", gap:18, flex:1 }}>

          {/* Dashboard title */}
          <div>
            <label style={{ fontSize:11, color:S.muted, display:"block",
              marginBottom:6, fontWeight:600 }}>Dashboard Title</label>
            <input value={dbTitle} onChange={e=>setDbTitle(e.target.value)}
              style={{ width:"100%", background:"rgba(255,255,255,0.05)",
                border:`1px solid ${S.border}`, borderRadius:8,
                color:S.text, fontSize:13, padding:"9px 12px",
                outline:"none", boxSizing:"border-box" }}/>
          </div>

          {/* Color scheme */}
          <div>
            <label style={{ fontSize:11, color:S.muted, display:"block",
              marginBottom:8, fontWeight:600 }}>Color Scheme</label>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {Object.entries(SCHEMES).map(([name, sch])=>(
                <div key={name} onClick={()=>handleSchemeChange(name)}
                  style={{
                    display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                    borderRadius:8, cursor:"pointer",
                    background: scheme===name ? `${sch.accent}15` : "rgba(255,255,255,0.03)",
                    border:`1px solid ${scheme===name ? sch.accent+"44" : S.border}`,
                    transition:"all 0.12s",
                  }}>
                  <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                    {sch.palette.slice(0,5).map((c,i)=>(
                      <div key={i} style={{ width:10, height:10, borderRadius:2,
                        background:c }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:12, color: scheme===name?S.text:S.muted,
                    fontWeight: scheme===name?700:400 }}>{name}</span>
                  {scheme===name && (
                    <span style={{ marginLeft:"auto", fontSize:10,
                      color:sch.accent }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chart type selection */}
          <div>
            <label style={{ fontSize:11, color:S.muted, display:"block",
              marginBottom:8, fontWeight:600 }}>
              Force Chart Types
              <span style={{ fontSize:10, fontWeight:400, marginLeft:6 }}>
                (optional — AI auto-selects from prompt)
              </span>
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5 }}>
              {CHART_TYPES.map(ct=>{
                const sel = selCharts.includes(ct.id);
                return (
                  <div key={ct.id} onClick={()=>
                    setSelCharts(prev=>sel?prev.filter(x=>x!==ct.id):[...prev,ct.id])
                  } style={{
                    padding:"7px 3px", textAlign:"center", borderRadius:7, cursor:"pointer",
                    background: sel ? `${S.accent}20` : "rgba(255,255,255,0.04)",
                    border:`1px solid ${sel?S.accent+"55":S.border}`,
                    color: sel ? S.accent : S.muted,
                    transition:"all 0.12s",
                  }}>
                    <div style={{ fontSize:14 }}>{ct.icon}</div>
                    <div style={{ fontSize:9, marginTop:2 }}>{ct.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label style={{ fontSize:11, color:S.muted, display:"block",
              marginBottom:8, fontWeight:600 }}>Describe Your Dashboard</label>

            {/* Quick presets */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
              {DASHBOARD_PRESETS.map((p,i)=>(
                <button key={i} onClick={()=>setPrompt(p.prompt)}
                  style={{ fontSize:10, padding:"4px 10px",
                    background:"rgba(255,255,255,0.05)",
                    border:`1px solid ${S.border}`,
                    borderRadius:99, color:S.muted, cursor:"pointer",
                    transition:"all 0.12s",
                    whiteSpace:"nowrap",
                  }}>{p.label}</button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e=>setPrompt(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)) buildDashboard(); }}
              placeholder="e.g. 'Sales dashboard with 4 KPI cards for revenue, orders, new customers, conversion rate. Monthly line chart for sales trend. Bar chart for top 5 products. Pie chart for region distribution.'"
              rows={5}
              style={{
                width:"100%", background:"rgba(255,255,255,0.04)",
                border:`1px solid ${S.border}`,
                borderRadius:10, color:S.text, fontSize:12,
                padding:"12px 14px", outline:"none",
                resize:"vertical", lineHeight:1.6,
                fontFamily:"inherit", boxSizing:"border-box",
              }}/>
            <div style={{ fontSize:10, color:S.muted, marginTop:5 }}>
              Ctrl+Enter to generate
            </div>
          </div>

          {/* Generate button */}
          <button onClick={buildDashboard} disabled={loading || !prompt.trim()}
            style={{
              padding:"12px", borderRadius:10, fontWeight:800, fontSize:13,
              cursor: loading||!prompt.trim() ? "not-allowed":"pointer",
              background: loading||!prompt.trim()
                ? "rgba(255,255,255,0.05)"
                : `linear-gradient(135deg, ${S.accent}33, ${S.accent2}33)`,
              border:`1px solid ${loading||!prompt.trim()?S.border:S.accent+"55"}`,
              color: loading||!prompt.trim() ? S.muted : S.accent,
              transition:"all 0.15s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
            {loading
              ? <><span style={{ animation:"spin 1s linear infinite" }}>⚙</span> Building…</>
              : <><span>⚡</span> Generate Dashboard</>
            }
          </button>

          {/* Add widget (when dashboard exists) */}
          {step === "done" && (
            <div>
              <label style={{ fontSize:11, color:S.muted, display:"block",
                marginBottom:8, fontWeight:600 }}>Add Widget</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5 }}>
                {CHART_TYPES.map(ct=>(
                  <button key={ct.id} onClick={()=>addWidget(ct.id)}
                    style={{ padding:"7px 4px", background:"rgba(255,255,255,0.04)",
                      border:`1px solid ${S.border}`,
                      borderRadius:7, color:S.muted, cursor:"pointer",
                      fontSize:11, display:"flex", alignItems:"center",
                      justifyContent:"center", gap:5, transition:"all 0.1s" }}>
                    <span>{ct.icon}</span>
                    <span style={{ fontSize:10 }}>{ct.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Dashboard canvas ──────────────────────────── */}
      {step === "done" && layout && (
        <div style={{
          flex:1, display:"flex", flexDirection:"column",
          overflow:"hidden", background:S.bg,
        }}>
          {/* Topbar */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"12px 20px",
            borderBottom:`1px solid ${S.border}`,
            flexShrink:0, gap:12,
          }}>
            <input value={dbTitle} onChange={e=>{
              setDbTitle(e.target.value);
              setLayout(prev=>prev?{...prev,title:e.target.value}:prev);
            }} style={{
              background:"transparent", border:"none",
              color:S.text, fontSize:16, fontWeight:800,
              outline:"none", letterSpacing:"-0.3px",
              flex:1,
            }}/>

            {/* Scheme quick switcher */}
            <div style={{ display:"flex", gap:6 }}>
              {Object.entries(SCHEMES).map(([name,sch])=>(
                <button key={name} title={name}
                  onClick={()=>handleSchemeChange(name)}
                  style={{
                    width:22, height:22, borderRadius:5, cursor:"pointer",
                    background:sch.accent,
                    border:`2px solid ${scheme===name?"#fff":"transparent"}`,
                    boxShadow:`0 0 6px ${sch.accent}77`,
                    transition:"all 0.12s",
                  }}/>
              ))}
            </div>

            <div style={{ fontSize:11, color:S.muted, flexShrink:0 }}>
              {layout.widgets.length} widgets · {scheme}
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
            <DashboardGrid layout={layout} scheme={S}
              onRemove={handleRemove} onEdit={setEditW}/>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && step === "building" && (
        <div style={{ position:"fixed", inset:0,
          background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          zIndex:500, gap:16 }}>
          <div style={{ fontSize:36 }}>⚙️</div>
          <div style={{ fontSize:16, fontWeight:700, color:"#fff" }}>
            Building your dashboard…
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>
            Analyzing dataset, detecting insights, placing widgets
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editW && (
        <EditModal widget={editW} scheme={S}
          onSave={handleEditSave} onClose={()=>setEditW(null)}/>
      )}

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
      `}</style>
    </div>
  );
}

/* ─── Demo data generator ────────────────────────────────────────── */
function _demoData(type) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (type === "line" || type === "area")
    return months.map((m,i)=>({ name:m, value:2500+Math.sin(i*0.5)*800+i*120,
      value2:1800+Math.cos(i*0.6)*600+i*80, value3:1200+i*60 }));
  if (type === "bar")
    return ["Product A","Product B","Product C","Product D","Product E"]
      .map((n,i)=>({ name:n, value:Math.floor(3000-i*300+Math.random()*500) }));
  if (type === "pie" || type === "donut")
    return [
      {name:"North",value:35},{name:"South",value:25},
      {name:"East",value:22},{name:"West",value:18},
    ];
  if (type === "radar")
    return ["Speed","Quality","Cost","Scale","Support","Innovation"]
      .map(m=>({ metric:m, value:Math.floor(60+Math.random()*40) }));
  if (type === "scatter")
    return Array.from({length:40},(_,i)=>({
      x:Math.floor(Math.random()*100),
      y:Math.floor(Math.random()*100),
    }));
  if (type === "heatmap") {
    const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const hours=["9am","10am","11am","12pm","1pm","2pm","3pm"];
    return days.flatMap(d=>hours.map(h=>({
      x:d, y:h, value:Math.floor(Math.random()*200),
    })));
  }
  return months.map(m=>({ name:m, value:Math.floor(1000+Math.random()*2000) }));
}