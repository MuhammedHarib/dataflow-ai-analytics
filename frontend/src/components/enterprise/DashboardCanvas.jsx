// src/components/enterprise/DashboardCanvas.jsx
// Pixel-faithful replica of reference dashboard:
// Deep navy bg • arc gauge with tick marks • hex badge • dual horizontal bars
// radar spider • monthly bar chart • horizontal investment bars • stacked area
// company metric cards • donut rings row • YoY metric rows • rankings + indicator donut

import React, { useEffect, useState } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── Design tokens ─────────────────────────────────────────────── */
const BG     = "#16192a";
const CARD   = "#1c2035";
const BD     = "rgba(255,255,255,0.055)";
const TEXT   = "rgba(255,255,255,0.88)";
const MUTED  = "rgba(255,255,255,0.40)";
const DIM    = "rgba(255,255,255,0.20)";
const ORANGE = "#f5a31a";
const AMBER  = "#f0c040";
const BLUE   = "#5b8cff";
const TEAL   = "#3ecfb2";
const PURPLE = "#a68cff";
const GREEN  = "#3dd68c";
const RED    = "#f97272";

const tt = {
  contentStyle: { background:"#0e1120", border:`1px solid rgba(255,255,255,0.08)`, borderRadius:6, fontSize:11 },
  labelStyle:   { color: MUTED },
  itemStyle:    { color: TEXT  },
  cursor:       { stroke:"rgba(255,255,255,0.04)" },
};

/* ── SVG Arc Gauge (matches reference: orange arc, tick marks, needle dot) ── */
function ArcGauge({ value=42, max=200, size=122, strokeW=6.5, color=ORANGE }) {
  const r  = (size/2) - strokeW - 6;
  const cx = size/2, cy = size/2;
  // arc starts at -130° from top, sweeps 260°
  const a0 = -130 * Math.PI/180;
  const SWEEP = 260 * Math.PI/180;
  const pct = Math.min(Math.max(value/max, 0), 1);
  const pt  = (ang) => ({
    x: cx + r*Math.cos(ang - Math.PI/2),
    y: cy + r*Math.sin(ang - Math.PI/2),
  });
  const a1  = a0 + SWEEP;
  const aF  = a0 + SWEEP*pct;
  const ts  = pt(a0), te = pt(a1), fe = pt(aF);
  const trackD = `M${ts.x},${ts.y} A${r},${r} 0 1 1 ${te.x},${te.y}`;
  const fillD  = pct > 0.005
    ? `M${ts.x},${ts.y} A${r},${r} 0 ${pct>0.5?1:0} 1 ${fe.x},${fe.y}`
    : "";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* tick marks */}
      {Array.from({length:27},(_,i) => {
        const ang = a0 + (SWEEP/26)*i;
        const rOuter = r + 2;
        const rInner = r - (i%5===0 ? 9 : 5);
        const o = pt(ang);
        const inn = { x: cx + rInner*Math.cos(ang-Math.PI/2), y: cy + rInner*Math.sin(ang-Math.PI/2) };
        return (
          <line key={i} x1={o.x} y1={o.y} x2={inn.x} y2={inn.y}
            stroke={i%5===0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}
            strokeWidth={i%5===0 ? 1.5 : 0.8} strokeLinecap="round"/>
        );
      })}
      {/* track */}
      <path d={trackD} fill="none" stroke="rgba(255,255,255,0.07)"
        strokeWidth={strokeW} strokeLinecap="round"/>
      {/* fill arc */}
      {fillD && (
        <path d={fillD} fill="none" stroke={color}
          strokeWidth={strokeW} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 6px ${color}bb)` }}/>
      )}
      {/* needle dot */}
      {fillD && (
        <circle cx={fe.x} cy={fe.y} r={strokeW/2+1.5}
          fill={color} style={{ filter:`drop-shadow(0 0 5px ${color})` }}/>
      )}
      {/* value */}
      <text x={cx} y={cy-3} textAnchor="middle" fill={TEXT}
        fontSize={size*0.21} fontWeight="800"
        fontFamily="'DM Mono','Courier New',monospace">{value}</text>
      <text x={cx} y={cy+size*0.115} textAnchor="middle" fill={MUTED}
        fontSize={size*0.092} fontFamily="sans-serif" letterSpacing="0.5">AQI</text>
      <text x={cx} y={cy+size*0.215} textAnchor="middle" fill={DIM}
        fontSize={size*0.072} fontFamily="sans-serif">Air Quality Index</text>
    </svg>
  );
}

/* ── Hexagon Badge ───────────────────────────────────────────────── */
function HexBadge({ value=92, size=112, color=AMBER }) {
  const cx = size/2, cy = size/2;
  const hexPts = (ri) => Array.from({length:6},(_,i)=>{
    const a=(i*60-30)*Math.PI/180;
    return `${cx+ri*Math.cos(a)},${cy+ri*Math.sin(a)}`;
  }).join(" ");
  const r1 = size*0.40, r2 = size*0.33, r3 = size*0.26;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* outer hex outline */}
      <polygon points={hexPts(r1)} fill="rgba(255,255,255,0.02)"
        stroke="rgba(255,255,255,0.09)" strokeWidth="1.5"/>
      {/* mid hex - colored */}
      <polygon points={hexPts(r2)} fill="rgba(255,255,255,0.01)"
        stroke={color} strokeWidth="1.5" opacity="0.55"/>
      {/* inner hex */}
      <polygon points={hexPts(r3)} fill="none"
        stroke={color} strokeWidth="1" opacity="0.28"/>
      {/* corner dots */}
      {Array.from({length:6},(_,i) => {
        const a=(i*60-30)*Math.PI/180;
        return <circle key={i} cx={cx+r1*Math.cos(a)} cy={cy+r1*Math.sin(a)}
          r="2.2" fill={color} opacity="0.45"/>;
      })}
      {/* value */}
      <text x={cx} y={cy-5} textAnchor="middle" fill={TEXT}
        fontSize={size*0.22} fontWeight="800"
        fontFamily="'DM Mono','Courier New',monospace">{value}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill={MUTED}
        fontSize={size*0.088} fontFamily="sans-serif" letterSpacing="1.2">INTEGRATED</text>
      <text x={cx} y={cy+25} textAnchor="middle" fill={DIM}
        fontSize={size*0.088} fontFamily="sans-serif" letterSpacing="1.2">GRADE</text>
    </svg>
  );
}

/* ── Dual Horizontal Bar Row ─────────────────────────────────────── */
function DualBar({ label, v1, v2, max=300, c1=ORANGE, c2=BLUE }) {
  return (
    <div style={{ paddingBottom:11, borderBottom:`1px solid ${BD}` }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:5 }}>
        <span style={{ fontSize:11, color:MUTED }}>• {label}</span>
        <div style={{ display:"flex", gap:14 }}>
          <span style={{ fontSize:12, fontWeight:700, color:c1,
            fontFamily:"'DM Mono',monospace" }}>{v1}</span>
          <span style={{ fontSize:12, fontWeight:700, color:c2,
            fontFamily:"'DM Mono',monospace" }}>{v2}</span>
        </div>
      </div>
      {[[v1,c1],[v2,c2]].map(([v,c],i) => (
        <div key={i} style={{ height:4, background:"rgba(255,255,255,0.05)",
          borderRadius:2, marginBottom:3 }}>
          <div style={{ height:"100%", width:`${Math.min(v/max*100,100)}%`,
            background:c, borderRadius:2,
            boxShadow:`0 0 7px ${c}55`,
            transition:"width 1.3s cubic-bezier(.4,0,.2,1)" }}/>
        </div>
      ))}
    </div>
  );
}

/* ── Donut Ring ──────────────────────────────────────────────────── */
function DonutRing({ value=32, size=90, color=ORANGE, label="" }) {
  const cx=size/2, cy=size/2;
  const r1=size*0.375, r2=size*0.295;
  const c1=2*Math.PI*r1, c2=2*Math.PI*r2;
  const f1=(value/100)*c1, f2=(value/100)*c2*0.72;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform:"rotate(-90deg)" }}>
        {/* outer track + fill */}
        <circle cx={cx} cy={cy} r={r1} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${f1} ${c1-f1}`} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 5px ${color}88)`,
            transition:"stroke-dasharray 1.3s ease" }}/>
        {/* inner decorative ring */}
        <circle cx={cx} cy={cy} r={r2} fill="none"
          stroke={`${color}18`} strokeWidth="2"/>
        <circle cx={cx} cy={cy} r={r2} fill="none"
          stroke={`${color}55`} strokeWidth="1.5"
          strokeDasharray={`${f2} ${c2-f2}`} strokeLinecap="round"/>
        {/* value text */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fill={TEXT} fontSize={size*0.23} fontWeight="800"
          style={{ transform:`rotate(90deg)`, transformOrigin:`${cx}px ${cy}px` }}
          fontFamily="'DM Mono','Courier New',monospace">{value}</text>
      </svg>
      {label && (
        <div style={{ fontSize:10, color:MUTED, textAlign:"center",
          lineHeight:1.4, maxWidth:size+8 }}>{label}</div>
      )}
    </div>
  );
}

/* ── YoY Metric Row ──────────────────────────────────────────────── */
function YoYRow({ icon, mainLabel, value, unit, yoy, positive=true }) {
  const yc = positive ? GREEN : RED;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16,
      padding:"13px 0", borderBottom:`1px solid ${BD}` }}>
      {/* icon badge */}
      <div style={{ width:38, height:38, borderRadius:7,
        background:"rgba(255,255,255,0.035)", border:`1px solid ${BD}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:19, flexShrink:0 }}>{icon}</div>
      {/* main label + value */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:MUTED, marginBottom:4 }}>{mainLabel}</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
          <span style={{ fontSize:20, fontWeight:800, color:TEXT,
            fontFamily:"'DM Mono','Courier New',monospace" }}>
            {value.toLocaleString()}
          </span>
          <span style={{ fontSize:11, color:MUTED }}>{unit}</span>
        </div>
      </div>
      {/* right: repeated value + YoY */}
      <div style={{ flexShrink:0, minWidth:160, textAlign:"right" }}>
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"flex-end", gap:6, marginBottom:5 }}>
          <span style={{ fontSize:12, fontWeight:700, color:TEXT,
            fontFamily:"'DM Mono',monospace" }}>{value.toLocaleString()}</span>
          <span style={{ fontSize:10, color:MUTED }}>{unit}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"flex-end", gap:8 }}>
          <div style={{ height:2, width:56, background:"rgba(255,255,255,0.07)",
            borderRadius:1 }}>
            <div style={{ height:"100%",
              width:`${Math.min(Math.abs(yoy)*9,100)}%`,
              background:yc, borderRadius:1 }}/>
          </div>
          <span style={{ fontSize:10, color:MUTED }}>↕ YoY</span>
          <span style={{ fontSize:13, fontWeight:800, color:yc,
            fontFamily:"'DM Mono',monospace" }}>
            {positive ? "+" : ""}{yoy}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Card / Section helpers ───────────────────────────────────────── */
const Card = ({ children, style={}, pad=18 }) => (
  <div style={{ background:CARD, border:`1px solid ${BD}`,
    borderRadius:10, padding:pad, ...style }}>{children}</div>
);

const Mark = ({ children, color=ORANGE }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
    <div style={{ width:3, height:13, background:color, borderRadius:2,
      boxShadow:`0 0 6px ${color}99` }}/>
    <span style={{ fontSize:11, fontWeight:700, color:MUTED,
      textTransform:"uppercase", letterSpacing:"0.7px" }}>{children}</span>
  </div>
);

/* ── Static demo data ─────────────────────────────────────────────── */
const PM_DATA = [
  {t:"7.1",a:45,b:62},{t:"7.4",a:52,b:70},{t:"7.7",a:38,b:55},
  {t:"7.10",a:60,b:76},{t:"7.13",a:42,b:64},{t:"7.16",a:55,b:72},
  {t:"7.19",a:35,b:53},{t:"7.22",a:48,b:66},{t:"7.25",a:40,b:60},
  {t:"7.28",a:44,b:63},{t:"7.31",a:50,b:68},
];
const GOOD_DAYS = [
  {m:"Jan",v:20},{m:"Feb",v:18},{m:"Mar",v:22},{m:"Apr",v:15},
  {m:"May",v:14},{m:"Jun",v:12},{m:"Jul",v:10},{m:"Aug",v:13},
  {m:"Sep",v:17},{m:"Oct",v:21},{m:"Nov",v:24},{m:"Dec",v:19},
];
const INV_YEARS  = [
  {y:"2019",v:38,hi:false},{y:"2020",v:52,hi:false},
  {y:"2021",v:67,hi:false},{y:"2022",v:92,hi:true },
];
const IND_TREND  = [
  {y:"2016",p:10,s:16,t:6},{y:"2017",p:13,s:20,t:9},
  {y:"2018",p:11,s:24,t:12},{y:"2019",p:16,s:19,t:14},
  {y:"2020",p:19,s:18,t:11},{y:"2021",p:23,s:23,t:17},
  {y:"2022",p:21,s:27,t:21},
];
const RADAR_DATA = [
  {s:"96",v:96},{s:"98",v:98},{s:"94",v:94},
  {s:"91",v:91},{s:"87",v:87},{s:"88",v:88},
];
const RANKINGS = [
  {rank:1,name:"XXX City XXX Group Company",            val:826184},
  {rank:2,name:"XXX Fruit Production Co., LTD",          val:234251},
  {rank:3,name:"XXX Agricultural Tools Co., LTD",        val:110513},
  {rank:4,name:"XXX Agricultural Product Production Co.",val:88154 },
];
const INDICATORS = [
  {name:"Indicators 01",value:55,color:ORANGE},
  {name:"Indicators 02",value:30,color:BLUE  },
  {name:"Indicators 03",value:15,color:TEAL  },
];

/* ═════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                   */
/* ═════════════════════════════════════════════════════════════════ */
export default function DashboardCanvas({ dashboard }) {
  // Merge real dashboard data where available
  const kpis  = dashboard?.widgets?.filter(w=>w.type==="kpi")  || [];
  const lines = dashboard?.widgets?.filter(w=>w.type==="line") || [];
  const bars  = dashboard?.widgets?.filter(w=>w.type==="bar")  || [];
  const rKPI  = kpis[0];

  const pmData    = lines[0]?.data?.length   ? lines[0].data   : PM_DATA;
  const barsData  = bars[0]?.data?.length    ? bars[0].data    : GOOD_DAYS;

  return (
    <div style={{
      background: BG,
      minHeight: "100%",
      padding: "20px 24px",
      fontFamily: "'IBM Plex Sans','Segoe UI',sans-serif",
      color: TEXT,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 13,
    }}>

      {/* ═══ ROW 1 · AQI Gauge + PM line chart ══════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"192px 1fr", gap:13 }}>

        <Card style={{ display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center" }} pad={14}>
          <ArcGauge
            value={rKPI ? Math.round(Math.abs(rKPI.config?.value ?? 42) % 200) : 42}
            max={200} size={124} color={ORANGE}/>
        </Card>

        <Card pad={15}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:7 }}>
            <span style={{ fontSize:10, color:MUTED }}>Unit: μm</span>
            <span style={{ fontSize:10, color:ORANGE }}>── PM2.5</span>
            <span style={{ fontSize:10, color:RED    }}>── PM10</span>
          </div>
          <ResponsiveContainer width="100%" height={108}>
            <LineChart data={pmData} margin={{top:2,right:8,left:-24,bottom:0}}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3"/>
              <XAxis dataKey="t" tick={{fontSize:9,fill:DIM}}/>
              <YAxis tick={{fontSize:9,fill:DIM}} domain={[0,100]}/>
              <Tooltip {...tt}/>
              <Line dataKey="a" name="PM2.5" stroke={ORANGE} strokeWidth={1.7} dot={false}/>
              <Line dataKey="b" name="PM10"  stroke={RED}    strokeWidth={1.7} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ═══ ROW 2 · Hex badge + dual bars ══════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"192px 1fr", gap:13 }}>

        <Card style={{ display:"flex", alignItems:"center",
          justifyContent:"center" }} pad={14}>
          <HexBadge value={92} size={114} color={AMBER}/>
        </Card>

        <Card pad={15}>
          <div style={{ display:"flex", gap:14, marginBottom:12, fontSize:10 }}>
            <span style={{ color:ORANGE }}>■ Inlet water quality</span>
            <span style={{ color:BLUE   }}>■ Outlet water quality</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <DualBar label="Sewage plant in High-tech Zone" v1={261} v2={124}/>
            <DualBar label="XX District Sewage plant"       v1={275} v2={142}/>
            <DualBar label="XX2 District Sewage plant"      v1={216} v2={116}/>
          </div>
        </Card>
      </div>

      {/* ═══ ROW 3 · AQI table + Radar ══════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 215px", gap:13 }}>

        <Card pad={15}>
          <div style={{ display:"grid",
            gridTemplateColumns:"1fr 56px 82px",
            gap:"0 8px", fontSize:11 }}>
            {["County","AQI","AQI Level"].map(h=>(
              <div key={h} style={{ color:DIM, fontSize:10, fontWeight:600,
                paddingBottom:9, borderBottom:`1px solid ${BD}` }}>{h}</div>
            ))}
            {[
              {name:"County name 01",  aqi:82,  level:"B", lc:BLUE  },
              {name:"County name 02",  aqi:24,  level:"A", lc:GREEN },
              {name:"High-tech District",aqi:121,level:"C",lc:ORANGE},
            ].map((row,i)=>(
              <React.Fragment key={i}>
                <div style={{ display:"flex", alignItems:"center", gap:6,
                  padding:"8px 0", borderBottom:`1px solid ${BD}`,
                  color:MUTED, fontSize:10 }}>
                  • {row.name}
                  <span style={{ marginLeft:"auto", color:DIM }}>╱</span>
                </div>
                <div style={{ display:"flex", alignItems:"center",
                  borderBottom:`1px solid ${BD}`, color:TEXT,
                  fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700 }}>
                  {row.aqi}
                </div>
                <div style={{ display:"flex", alignItems:"center",
                  borderBottom:`1px solid ${BD}` }}>
                  <span style={{
                    background:`${row.lc}1a`, color:row.lc,
                    border:`1px solid ${row.lc}44`,
                    borderRadius:3, padding:"2px 10px",
                    fontSize:10, fontWeight:700 }}>{row.level}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <Card pad={12}>
          {/* index labels */}
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto",
            gap:"3px 0", fontSize:9, color:MUTED, marginBottom:4 }}>
            <span>Data index •96</span><span/><span style={{textAlign:"right"}}>98• Data index</span>
            <span>Data index •88</span><span/><span style={{textAlign:"right"}}>94• Data index</span>
            <span>Data index •87</span><span/><span style={{textAlign:"right"}}>91• Data index</span>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <RadarChart data={RADAR_DATA} margin={{top:0,right:16,bottom:0,left:16}}>
              <PolarGrid stroke="rgba(255,255,255,0.07)"/>
              <PolarAngleAxis dataKey="s" tick={{fontSize:8,fill:DIM}}/>
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="v" stroke={AMBER} fill={AMBER}
                fillOpacity={0.22} strokeWidth={1.5}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ═══ ROW 4 · Monthly bars + investment bars ══════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 205px", gap:13 }}>

        <Card pad={15}>
          <div style={{ display:"flex", gap:12, marginBottom:8 }}>
            <span style={{ fontSize:10, color:MUTED }}>Unit: day</span>
            <span style={{ fontSize:10, color:BLUE }}>■ Good days</span>
          </div>
          <ResponsiveContainer width="100%" height={116}>
            <BarChart data={barsData} margin={{top:0,right:8,left:-26,bottom:0}}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="m" tick={{fontSize:9,fill:DIM}}/>
              <YAxis tick={{fontSize:9,fill:DIM}} domain={[0,30]}/>
              <Tooltip {...tt}/>
              <Bar dataKey="v" fill={BLUE} fillOpacity={0.75}
                radius={[2,2,0,0]} maxBarSize={14}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card pad={15}>
          <Mark color={AMBER}>Investment (4 yrs)</Mark>
          <div style={{ display:"flex", flexDirection:"column", gap:9, marginTop:4 }}>
            {INV_YEARS.map((row,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
                <span style={{ fontSize:9, color:MUTED, width:34, flexShrink:0,
                  display:"flex", alignItems:"center", gap:4 }}>
                  {row.hi && <span style={{ color:ORANGE, fontSize:8 }}>●</span>}
                  {row.y}
                </span>
                <div style={{ flex:1, height:13, background:"rgba(255,255,255,0.05)",
                  borderRadius:2, overflow:"hidden" }}>
                  <div style={{
                    height:"100%", width:`${row.v}%`,
                    background: row.hi ? ORANGE : PURPLE,
                    borderRadius:2,
                    boxShadow: row.hi ? `0 0 9px ${ORANGE}66` : "none",
                    transition:"width 1.3s cubic-bezier(.4,0,.2,1)",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ═══ ROW 5 · KPI card + industry area ═══════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"205px 1fr", gap:13 }}>

        <Card pad={17}>
          <div style={{ fontSize:11, color:MUTED, marginBottom:7,
            display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:ORANGE, fontSize:15, lineHeight:1 }}>|</span>
            Total investment plan
          </div>
          <div style={{ fontSize:28, fontWeight:900,
            fontFamily:"'DM Mono','Courier New',monospace",
            color:TEXT, letterSpacing:"-0.5px" }}>
            {rKPI
              ? Number(rKPI.config?.value ?? 0).toLocaleString(undefined,{maximumFractionDigits:2})
              : "3,224.22"}
            {!rKPI && <span style={{ fontSize:11, color:MUTED, marginLeft:5,
              fontWeight:400 }}>Million</span>}
          </div>
          <div style={{ margin:"14px 0 6px", fontSize:11, color:MUTED,
            display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:ORANGE, fontSize:15, lineHeight:1 }}>|</span>
            On year-on-year basis
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:22, color:ORANGE }}>↑</span>
            <span style={{ fontSize:30, fontWeight:900, color:ORANGE,
              fontFamily:"'DM Mono','Courier New',monospace", letterSpacing:"-0.5px" }}>
              {rKPI?.config?.growth_rate_pct != null
                ? Math.abs(rKPI.config.growth_rate_pct).toFixed(1)
                : "12.6"}
            </span>
            <span style={{ fontSize:15, color:ORANGE, fontWeight:700 }}>%</span>
          </div>
        </Card>

        <Card pad={15}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8,
            alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:10, color:MUTED }}>Unit: %</span>
            <span style={{ background:ORANGE, color:"#000", borderRadius:3,
              padding:"2px 9px", fontSize:10, fontWeight:700 }}>Primary Sector</span>
            <span style={{ fontSize:10, color:MUTED }}>Secondary Industry</span>
            <span style={{ fontSize:10, color:MUTED }}>Tertiary Industry</span>
          </div>
          <ResponsiveContainer width="100%" height={128}>
            <AreaChart data={IND_TREND} margin={{top:0,right:8,left:-26,bottom:0}}>
              <defs>
                {[[ORANGE,"gP",0.3],[PURPLE,"gS",0.2],[TEAL,"gT",0.15]].map(([c,id,op])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={op}/>
                    <stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="y" tick={{fontSize:9,fill:DIM}}/>
              <YAxis tick={{fontSize:9,fill:DIM}}/>
              <Tooltip {...tt}/>
              <Area dataKey="p" name="Primary"   stroke={ORANGE} fill="url(#gP)" strokeWidth={1.8} dot={false}/>
              <Area dataKey="s" name="Secondary" stroke={PURPLE} fill="url(#gS)" strokeWidth={1.8} dot={false}/>
              <Area dataKey="t" name="Tertiary"  stroke={TEAL}   fill="url(#gT)" strokeWidth={1.8} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ═══ ROW 6 · 3 company metric cards ═════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:13 }}>
        {[
          {name:"XXX Agricultural Tools Co., LTD",         val:22323, up:true },
          {name:"XXX Agricultural Product Production Co.",  val:42423, up:true },
          {name:"XXX Agricultural Product Production Co.",  val:12142, up:false},
        ].map((co,i)=>(
          <Card key={i} pad={14}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
              <div style={{ width:32, height:32, borderRadius:6,
                background:"rgba(255,255,255,0.04)", border:`1px solid ${BD}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, flexShrink:0 }}>🏭</div>
              <div style={{ fontSize:11, color:MUTED, lineHeight:1.45 }}>{co.name}</div>
            </div>
            <div style={{ fontSize:10, color:DIM, marginBottom:5 }}>Gross annual value</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
              <span style={{ fontSize:21, fontWeight:800, color:ORANGE,
                fontFamily:"'DM Mono','Courier New',monospace" }}>
                {co.val.toLocaleString()}
              </span>
              <span style={{ fontSize:10, color:MUTED }}>Thousand</span>
              <span style={{ fontSize:15, color:co.up?GREEN:RED, marginLeft:3 }}>
                {co.up?"↑":"↓"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* ═══ ROW 7 · 4 donut rings ═══════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:13 }}>
        {[
          {val:32,label:"Proportion of Primary Industry %",   color:ORANGE},
          {val:23,label:"Proportion of Secondary Industry %", color:BLUE  },
          {val:24,label:"Proportion of Tertiary Industry %",  color:TEAL  },
          {val:21,label:"Proportion of Other Industries %",   color:PURPLE},
        ].map((d,i)=>(
          <Card key={i} style={{ display:"flex", flexDirection:"column",
            alignItems:"center" }} pad="18px 10px">
            <DonutRing value={d.val} size={92} color={d.color} label={d.label}/>
          </Card>
        ))}
      </div>

      {/* ═══ ROW 8 · YoY metric rows ═════════════════════════════ */}
      <Card pad={16}>
        <YoYRow icon="🌾" mainLabel="Total volume of Primary Sector"
          value={12231412} unit="Thousand" yoy={5.6}  positive={true}/>
        <YoYRow icon="🔧" mainLabel="Total volume of Secondary Industry"
          value={10023231} unit="Thousand" yoy={2.8}  positive={false}/>
        <YoYRow icon="🌿" mainLabel="Total volume of Tertiary Industry"
          value={9931241}  unit="Thousand" yoy={8.2}  positive={true}/>
      </Card>

      {/* ═══ ROW 9 · Rankings + indicator donut ══════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 200px", gap:13 }}>

        <Card pad={15}>
          <div style={{ display:"grid",
            gridTemplateColumns:"28px 1fr 150px 22px",
            gap:"0 10px", fontSize:11, alignItems:"center" }}>
            {["","Company name","Company production value [thousand]",""].map((h,i)=>(
              <div key={i} style={{ color:DIM, fontSize:10,
                paddingBottom:9, borderBottom:`1px solid ${BD}` }}>{h}</div>
            ))}
            {RANKINGS.map((row,i)=>(
              <React.Fragment key={i}>
                <div style={{
                  width:22, height:22, borderRadius:4,
                  background: i<3?`${ORANGE}1a`:"rgba(255,255,255,0.04)",
                  border: i<3?`1px solid ${ORANGE}44`:`1px solid ${BD}`,
                  color: i<3?ORANGE:DIM,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700,
                }}>{row.rank}</div>
                <div style={{ color:MUTED, fontSize:11,
                  padding:"8px 0", borderBottom:`1px solid ${BD}` }}>{row.name}</div>
                <div style={{ color:TEXT, fontWeight:700,
                  fontFamily:"'DM Mono','Courier New',monospace", fontSize:13,
                  padding:"8px 0", borderBottom:`1px solid ${BD}` }}>
                  {row.val.toLocaleString()}
                </div>
                <div style={{ color:DIM, fontSize:15,
                  padding:"8px 0", borderBottom:`1px solid ${BD}`,
                  textAlign:"center" }}>╱</div>
              </React.Fragment>
            ))}
          </div>
        </Card>

        <Card style={{ display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"space-between" }} pad={14}>
          <div style={{ width:"100%", fontSize:10, color:MUTED,
            display:"flex", flexDirection:"column", gap:4, marginBottom:6 }}>
            {INDICATORS.map((d,i)=>(
              <span key={i}>• {d.name}</span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={INDICATORS} dataKey="value" nameKey="name"
                innerRadius={28} outerRadius={50}
                startAngle={90} endAngle={-270}
                strokeWidth={0} paddingAngle={2}>
                {INDICATORS.map((d,i)=>(
                  <Cell key={i} fill={d.color}
                    style={{ filter:`drop-shadow(0 0 5px ${d.color}88)` }}/>
                ))}
              </Pie>
              {/* outer halo ring */}
              <Pie data={[{v:100}]} dataKey="v"
                outerRadius={55} innerRadius={53}
                fill="rgba(255,255,255,0.06)" strokeWidth={0}/>
              <Tooltip {...tt}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:6 }}>
            {INDICATORS.map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:8, height:8, borderRadius:2,
                  background:d.color, flexShrink:0,
                  boxShadow:`0 0 4px ${d.color}` }}/>
                <span style={{ fontSize:10, color:MUTED, flex:1 }}>{d.name}</span>
                <span style={{ fontSize:11, fontWeight:700, color:TEXT,
                  fontFamily:"'DM Mono',monospace" }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

export { DashboardCanvas };