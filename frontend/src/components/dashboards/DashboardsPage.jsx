// src/components/dashboards/DashboardsPage.jsx
// Project dashboards — CSV upload + single AI dashboard builder, no two-step flow

import React, { useState, useEffect, useRef, useCallback } from "react";
import { dashboardsApi } from "../../api/client";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:"#0e1018", card:"#14161f",
  border:"rgba(255,255,255,0.07)",
  text:"rgba(255,255,255,0.88)",
  muted:"rgba(255,255,255,0.38)",
  dim:"rgba(255,255,255,0.16)",
  accent:"#e05c2d",
};

// ── Color schemes ─────────────────────────────────────────────────────────────
const SCHEMES = {
  "Metric Flow":{ bg:"#111318",card:"#1a1d28",border:"rgba(255,255,255,0.08)",text:"rgba(255,255,255,0.9)",muted:"rgba(255,255,255,0.4)",accent:"#e05c2d",accent2:"#6366f1",palette:["#e05c2d","#6366f1","#f59e0b","#10b981","#ec4899","#06b6d4","#84cc16","#f97316"],positive:"#10b981",negative:"#e05c2d" },
  "Neon Dark":  { bg:"#0d0f1a",card:"#131626",border:"rgba(255,255,255,0.07)",text:"rgba(255,255,255,0.9)",muted:"rgba(255,255,255,0.4)",accent:"#00ffb4",accent2:"#4f8cff",palette:["#00ffb4","#4f8cff","#ffd93d","#ff6b6b","#c77dff","#00d4ff","#43e97b","#fa8231"],positive:"#00ffb4",negative:"#ff6b6b" },
  "Ocean Blue": { bg:"#050d1a",card:"#091428",border:"rgba(99,179,237,0.12)",text:"rgba(255,255,255,0.92)",muted:"rgba(255,255,255,0.38)",accent:"#63b3ed",accent2:"#4fd1c5",palette:["#63b3ed","#4fd1c5","#f6ad55","#fc8181","#b794f4","#68d391","#fbd38d","#9ae6b4"],positive:"#68d391",negative:"#fc8181" },
  "Solar Gold": { bg:"#12100a",card:"#1c1810",border:"rgba(245,163,26,0.1)",text:"rgba(255,255,255,0.9)",muted:"rgba(255,255,255,0.38)",accent:"#f5a31a",accent2:"#f0c040",palette:["#f5a31a","#f0c040","#3ecfb2","#5b8cff","#a68cff","#3dd68c","#f97272","#e2e8f0"],positive:"#3dd68c",negative:"#f97272" },
  "Rose Quartz":{ bg:"#110d12",card:"#1a1220",border:"rgba(236,72,153,0.1)",text:"rgba(255,255,255,0.92)",muted:"rgba(255,255,255,0.38)",accent:"#ec4899",accent2:"#a78bfa",palette:["#ec4899","#a78bfa","#f59e0b","#10b981","#06b6d4","#f97316","#84cc16","#fb923c"],positive:"#10b981",negative:"#f97316" },
  "Cyberpunk":  { bg:"#08050f",card:"#100d1a",border:"rgba(255,255,0,0.08)",text:"#fff",muted:"rgba(255,255,255,0.4)",accent:"#ffff00",accent2:"#ff00ff",palette:["#ffff00","#ff00ff","#00ffff","#ff6600","#00ff88","#ff0066","#6600ff","#ffaa00"],positive:"#00ff88",negative:"#ff0066" },
};

const CHART_TYPES=[
  {id:"line",icon:"📈",label:"Line"},{id:"area",icon:"📊",label:"Area"},
  {id:"bar",icon:"▬",label:"Bar"},{id:"pie",icon:"◔",label:"Pie"},
  {id:"radar",icon:"◈",label:"Radar"},{id:"kpi",icon:"⚡",label:"KPI"},
  {id:"scatter",icon:"⠿",label:"Scatter"},{id:"ranking",icon:"≣",label:"Ranking"},
];

const PRESETS=[
  {label:"Sales",      prompt:"4 KPI cards for revenue, orders, customers, conversion rate. Monthly line chart for sales trend. Bar chart for top 5 products. Pie chart for region distribution."},
  {label:"Operations", prompt:"KPI cards for uptime, throughput, error rate. Time-series line chart. Ranking table of top issues."},
  {label:"Executive",  prompt:"4 KPI cards at top, large area trend chart, donut distribution, radar performance, ranking table."},
  {label:"Financial",  prompt:"Revenue, profit, expenses, margin KPI cards. Bar chart by category. Pie chart distribution. Ranking table."},
];

const SCHEME_COLORS={"Metric Flow":"#e05c2d","Neon Dark":"#00ffb4","Ocean Blue":"#63b3ed","Solar Gold":"#f5a31a","Rose Quartz":"#ec4899","Cyberpunk":"#ffff00"};

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));
  const rows = lines.slice(1).map(line => {
    const vals=line.split(",");
    const obj={};
    headers.forEach((h,i)=>{ const raw=(vals[i]||"").trim().replace(/^"|"$/g,""); const n=Number(raw); obj[h]=(!isNaN(n)&&raw!=="")?n:raw; });
    return obj;
  });
  return {headers,rows};
}

function buildChartData(parsed) {
  if(!parsed) return null;
  const {headers,rows}=parsed;
  const numCols =headers.filter(h=>rows.slice(0,20).some(r=>typeof r[h]==="number"));
  const catCols =headers.filter(h=>!numCols.includes(h));
  const dateCols=catCols.filter(h=>rows.slice(0,5).some(r=>/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(String(r[h]))));
  const cd={bar:[],line:[],pie:[],scatter:[],area:[],__meta__:{numeric_cols:numCols,categorical_cols:catCols,date_cols:dateCols,has_date:dateCols.length>0}};
  catCols.slice(0,3).forEach(cat=>{
    numCols.slice(0,2).forEach(num=>{
      const counts={};
      rows.forEach(r=>{const k=String(r[cat]);counts[k]=(counts[k]||0)+(Number(r[num])||1);});
      const data=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,value])=>({name,value}));
      if(data.length) cd.bar.push({id:`bar_${cat}_${num}`,title:`${num} by ${cat}`,data,xKey:"name",yKey:"value",xLabel:cat,yLabel:num});
    });
  });
  const xCol=dateCols[0]||catCols[0];
  if(xCol) numCols.slice(0,3).forEach(num=>{
    const data=rows.slice(0,50).map(r=>({x:String(r[xCol]).slice(0,10),y:Number(r[num])||0}));
    cd.line.push({id:`line_${num}`,title:`${num} over ${xCol}`,data,xKey:"x",yKey:"y",xLabel:xCol,yLabel:num});
    cd.area.push({id:`area_${num}`,title:`${num} over ${xCol}`,data,xKey:"x",yKey:"y"});
  });
  catCols.slice(0,2).forEach(cat=>{
    const counts={};rows.forEach(r=>{const k=String(r[cat]);counts[k]=(counts[k]||0)+1;});
    const data=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value}));
    if(data.length) cd.pie.push({id:`pie_${cat}`,title:`${cat} distribution`,data});
  });
  if(numCols.length>=2){
    cd.scatter=[{id:"scatter_0",title:`${numCols[0]} vs ${numCols[1]}`,data:rows.slice(0,100).map(r=>({x:Number(r[numCols[0]])||0,y:Number(r[numCols[1]])||0})),xLabel:numCols[0],yLabel:numCols[1]}];
  }
  return cd;
}

// ── Number formatter ──────────────────────────────────────────────────────────
const fmtN=v=>{if(v==null)return"—";const n=Number(v);if(Math.abs(n)>=1e9)return(n/1e9).toFixed(1)+"B";if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1)+"M";if(Math.abs(n)>=1e3)return(n/1e3).toFixed(1)+"K";return n%1===0?String(n):n.toFixed(2);};

// ── Demo data ─────────────────────────────────────────────────────────────────
function demoData(type){
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if(type==="line"||type==="area")return M.map((m,i)=>({name:m,value:2500+Math.sin(i*0.5)*800+i*120}));
  if(type==="bar")return["Alpha","Beta","Gamma","Delta","Epsilon"].map((n,i)=>({name:n,value:3000-i*300+200}));
  if(type==="pie"||type==="donut")return[{name:"North",value:35},{name:"South",value:25},{name:"East",value:22},{name:"West",value:18}];
  if(type==="radar")return["Speed","Quality","Cost","Scale","Support"].map(m=>({metric:m,value:60+Math.floor(Math.random()*35)}));
  if(type==="scatter")return Array.from({length:40},(_,i)=>({x:Math.floor(Math.random()*100),y:Math.floor(Math.random()*100)}));
  return M.map(m=>({name:m,value:1000+Math.floor(Math.random()*2000)}));
}

// ── Generate dashboard layout ─────────────────────────────────────────────────
function generateDashboard(prompt,schemeName,forced,chartData,title){
  const cd=chartData;const p=prompt.toLowerCase();
  const get=type=>{const arr=cd?.[type];return arr?.length?arr[0].data:demoData(type);};
  const widgets=[];
  const wantKPI    =/kpi|card|metric|total|summary|revenue|order|customer|conversion/i.test(p);
  const wantLine   =/line|trend|time|monthly|weekly|daily|over/i.test(p);
  const wantArea   =/area|filled|shaded/i.test(p);
  const wantBar    =/bar|column|category|product|region|compar/i.test(p);
  const wantPie    =/pie|donut|ring|distribution|share/i.test(p);
  const wantRadar  =/radar|spider|performance/i.test(p);
  const wantScatter=/scatter|correlation|vs\b/i.test(p);
  const wantRank   =/rank|table|top|list/i.test(p);
  const numKPI=((()=>{const m=prompt.match(/(\d+)\s*(kpi|card)/i);return m?parseInt(m[1]):wantKPI?4:0;})());
  const kpiL=["Total Revenue","Orders","Customers","Conversion Rate","Avg Order Value","Profit Margin"];
  for(let i=0;i<numKPI&&i<6;i++) widgets.push({id:`kpi_${i}`,type:"kpi",title:kpiL[i],data:[],config:{value:Math.floor(Math.random()*50000+10000),change:(Math.random()*20-5).toFixed(1)}});
  if(wantLine||forced.includes("line"))    widgets.push({id:"line_1",type:"line",title:"Trend Over Time",data:get("line"),xKey:"x",yKeys:["y"]});
  if(wantArea||forced.includes("area"))    widgets.push({id:"area_1",type:"area",title:"Performance Over Time",data:get("area"),xKey:"x",yKeys:["y"]});
  if(wantBar||forced.includes("bar"))      widgets.push({id:"bar_1",type:"bar",title:"Category Comparison",data:get("bar"),xKey:"name",yKeys:["value"]});
  if(wantPie||forced.includes("pie"))      widgets.push({id:"pie_1",type:"pie",title:"Distribution",data:get("pie"),xKey:"name"});
  if(wantRadar||forced.includes("radar"))  widgets.push({id:"radar_1",type:"radar",title:"Performance Radar",data:demoData("radar"),xKey:"metric",yKeys:["value"]});
  if(wantScatter||forced.includes("scatter")) widgets.push({id:"scatter_1",type:"scatter",title:"Correlation",data:get("scatter"),xKey:"x",yKey:"y"});
  if(wantRank||forced.includes("ranking")){ const rd=[...get("bar")].sort((a,b)=>(b.value||0)-(a.value||0)).map((d,i)=>({...d,rank:i+1})); widgets.push({id:"rank_1",type:"ranking",title:"Top Rankings",data:rd,xKey:"name"}); }
  if(!widgets.length){ widgets.push({id:"kpi_0",type:"kpi",title:"Key Metric",data:[],config:{value:12450,change:8.2}}); widgets.push({id:"line_0",type:"line",title:"Overview",data:get("line"),xKey:"name",yKeys:["value"]}); widgets.push({id:"bar_0",type:"bar",title:"Top Categories",data:get("bar"),xKey:"name",yKeys:["value"]}); }
  return{id:`db_${Date.now()}`,title:title||"Dashboard",widgets,scheme:schemeName};
}

// ── Widget renderers ──────────────────────────────────────────────────────────
function KPIWidget({widget,S}){
  const val=widget.config?.value??0,chg=Number(widget.config?.change??0),up=chg>=0;
  return(<div style={{height:"100%",padding:"16px 18px",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
    <span style={{fontSize:11,color:S.muted,fontWeight:600}}>{widget.title}</span>
    <div style={{fontSize:28,fontWeight:900,color:S.text,letterSpacing:"-0.5px"}}>{fmtN(val)}</div>
    <span style={{fontSize:10,fontWeight:700,color:up?S.positive:S.negative,background:`${up?S.positive:S.negative}15`,border:`1px solid ${up?S.positive:S.negative}30`,borderRadius:20,padding:"2px 8px",width:"fit-content"}}>
      {up?"↗":"↘"} {up?"+":""}{chg.toFixed(1)}%
    </span>
  </div>);
}

function ChartWidget({widget,S}){
  const data=(widget.data||[]).slice(0,60),xKey=widget.xKey||"name",yKeys=widget.yKeys||[widget.yKey||"value"],PAL=S.palette;
  const ap={tick:{fontSize:10,fill:S.muted},axisLine:false,tickLine:false};
  const gp={stroke:"rgba(255,255,255,0.04)",strokeDasharray:"3 3",vertical:false};
  const tt={contentStyle:{background:S.card,border:`1px solid ${S.border}`,borderRadius:8,fontSize:11},labelStyle:{color:S.muted},itemStyle:{color:S.text}};
  const mg={top:8,right:8,left:-16,bottom:6};
  if(!data.length)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:S.muted,fontSize:11}}>No data</div>;
  if(widget.type==="line")return(<ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={mg}><CartesianGrid {...gp}/><XAxis dataKey={xKey} {...ap} tickFormatter={v=>String(v).slice(0,8)}/><YAxis {...ap} tickFormatter={fmtN}/><Tooltip {...tt}/>{yKeys.map((k,i)=><Line key={k} dataKey={k} stroke={PAL[i%PAL.length]} strokeWidth={2} dot={false}/>)}</LineChart></ResponsiveContainer>);
  if(widget.type==="area")return(<ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={mg}><defs>{yKeys.map((k,i)=><linearGradient key={k} id={`ag_${widget.id}_${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PAL[i%PAL.length]} stopOpacity={0.3}/><stop offset="95%" stopColor={PAL[i%PAL.length]} stopOpacity={0}/></linearGradient>)}</defs><CartesianGrid {...gp}/><XAxis dataKey={xKey} {...ap} tickFormatter={v=>String(v).slice(0,8)}/><YAxis {...ap} tickFormatter={fmtN}/><Tooltip {...tt}/>{yKeys.map((k,i)=><Area key={k} dataKey={k} stroke={PAL[i%PAL.length]} fill={`url(#ag_${widget.id}_${i})`} strokeWidth={2} dot={false}/>)}</AreaChart></ResponsiveContainer>);
  if(widget.type==="bar")return(<ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={mg}><CartesianGrid {...gp}/><XAxis dataKey={xKey} {...ap} tickFormatter={v=>String(v).slice(0,8)}/><YAxis {...ap} tickFormatter={fmtN}/><Tooltip {...tt}/>{yKeys.map((k,i)=><Bar key={k} dataKey={k} fill={PAL[i%PAL.length]} radius={[3,3,0,0]}/>)}</BarChart></ResponsiveContainer>);
  if(widget.type==="pie"||widget.type==="donut"){const inner=widget.type==="donut"?55:0;return(<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" innerRadius={inner} paddingAngle={2}>{data.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}</Pie><Tooltip {...tt}/><Legend wrapperStyle={{fontSize:10,color:S.muted}}/></PieChart></ResponsiveContainer>);}
  if(widget.type==="radar")return(<ResponsiveContainer width="100%" height="100%"><RadarChart data={data}><PolarGrid stroke={gp.stroke}/><PolarAngleAxis dataKey={xKey} tick={{fontSize:9,fill:S.muted}}/><PolarRadiusAxis tick={false}/><Radar dataKey={yKeys[0]||"value"} stroke={PAL[0]} fill={PAL[0]} fillOpacity={0.25} strokeWidth={2}/><Tooltip {...tt}/></RadarChart></ResponsiveContainer>);
  if(widget.type==="scatter")return(<ResponsiveContainer width="100%" height="100%"><ScatterChart margin={mg}><CartesianGrid {...gp}/><XAxis dataKey="x" {...ap} tickFormatter={fmtN}/><YAxis dataKey="y" {...ap} tickFormatter={fmtN}/><Tooltip {...tt} formatter={(v,n)=>[fmtN(v),n]}/><Scatter data={data} fill={PAL[0]} opacity={0.7}/></ScatterChart></ResponsiveContainer>);
  if(widget.type==="ranking"){const sorted=[...data].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,8);const max=sorted[0]?.value||1;return(<div style={{height:"100%",overflowY:"auto",padding:"4px 0"}}>{sorted.map((row,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px"}}><span style={{width:16,fontSize:10,color:S.muted,flexShrink:0}}>{i+1}</span><div style={{flex:1}}><div style={{fontSize:11,color:S.text,marginBottom:2}}>{row.name||"—"}</div><div style={{height:3,background:S.border,borderRadius:2}}><div style={{height:"100%",width:`${(row.value/max)*100}%`,background:PAL[i%PAL.length],borderRadius:2}}/></div></div><span style={{fontSize:11,color:S.muted,flexShrink:0}}>{fmtN(row.value)}</span></div>))}</div>);}
  return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:S.muted,fontSize:11}}>Unsupported</div>;
}

// ── Dashboard grid renderer ───────────────────────────────────────────────────
function DashboardCanvas({layout,S,onRemove}){
  const kpis=layout.widgets.filter(w=>w.type==="kpi");
  const charts=layout.widgets.filter(w=>w.type!=="kpi");
  return(
    <div style={{padding:"16px 20px"}}>
      {kpis.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(kpis.length,4)},1fr)`,gap:12,marginBottom:12}}>
          {kpis.map(w=>(
            <div key={w.id} style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:12,overflow:"hidden",minHeight:120,position:"relative"}}>
              <button onClick={()=>onRemove(w.id)} style={{position:"absolute",top:6,right:6,width:18,height:18,borderRadius:4,background:"rgba(249,114,114,0.12)",border:"none",color:"#f97272",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>×</button>
              <KPIWidget widget={w} S={S}/>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
        {charts.map(w=>(
          <div key={w.id} style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column",height:280}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px 6px",flexShrink:0}}>
              <span style={{fontSize:11,fontWeight:700,color:S.muted}}>{w.title}</span>
              <button onClick={()=>onRemove(w.id)} style={{width:18,height:18,borderRadius:4,background:"rgba(249,114,114,0.12)",border:"none",color:"#f97272",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{flex:1,minHeight:0}}><ChartWidget widget={w} S={S}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard list card ───────────────────────────────────────────────────────
function DashboardCard({dashboard,onOpen,onDelete}){
  const [hov,setHov]=useState(false);
  const accent=SCHEME_COLORS[dashboard.scheme]||T.accent;
  const age=Math.floor((Date.now()-new Date(dashboard.updated_at))/86400000);
  const ageStr=age===0?"Today":age===1?"Yesterday":`${age}d ago`;
  return(
    <div onClick={()=>onOpen(dashboard.id)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:T.card,border:`1px solid ${hov?accent+"55":T.border}`,borderRadius:14,padding:20,cursor:"pointer",transition:"all 0.15s",boxShadow:hov?"0 8px 32px rgba(0,0,0,0.4)":"none",transform:hov?"translateY(-1px)":"none",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${accent},${accent}44)`}}/>
      {hov&&(<div style={{position:"absolute",top:10,right:10,zIndex:2}}><button onClick={e=>{e.stopPropagation();onDelete(dashboard.id);}} style={{width:26,height:26,borderRadius:6,background:"rgba(249,114,114,0.12)",border:"1px solid rgba(249,114,114,0.3)",color:"#f97272",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}
      <div style={{height:60,marginBottom:12,display:"flex",alignItems:"flex-end",gap:3,opacity:0.65}}>
        {[0.4,0.7,0.5,0.9,0.6,0.8,1.0,0.75].map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,background:`${accent}${Math.floor((0.3+h*0.5)*255).toString(16).padStart(2,"0")}`,borderRadius:2}}/>)}
      </div>
      <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dashboard.name}</div>
      {dashboard.description&&<div style={{fontSize:11,color:T.muted,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dashboard.description}</div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`}}>
        <span style={{fontSize:10,fontWeight:600,color:accent,background:`${accent}15`,border:`1px solid ${accent}33`,borderRadius:99,padding:"2px 8px"}}>{dashboard.scheme}</span>
        <span style={{fontSize:10,color:T.dim}}>{ageStr}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardsPage({projectId,onNavigate}){
  const [dashboards,setDashboards]=useState([]);
  const [loading,setLoading]      =useState(true);
  const [view,setView]            =useState("list"); // "list" | "builder"

  // Dataset
  const [csvName,setCsvName]      =useState("");
  const [chartData,setChartData]  =useState(null);

  // Builder
  const [schemeName,setSchemeName]=useState("Metric Flow");
  const [prompt,setPrompt]        =useState("");
  const [dbTitle,setDbTitle]      =useState("My Dashboard");
  const [forcedTypes,setForcedTypes]=useState([]);
  const [layout,setLayout]        =useState(null);
  const [building,setBuilding]    =useState(false);

  // LEFT PANEL — minimized by default
  const [leftOpen,setLeftOpen]    =useState(false);
  const [activeDashboardId,setActiveDashboardId]=useState(null);
  const [saveStatus,setSaveStatus]=useState("");
  const autoSaveTimer=useRef(null);

  const fileRef=useRef(null);
  const S=SCHEMES[schemeName];

  useEffect(()=>{
    if(!projectId)return;
    setLoading(true);
    dashboardsApi.list(projectId).then(r=>setDashboards(r.data)).catch(()=>{}).finally(()=>setLoading(false));
  },[projectId]);

  // ── CSV handlers ────────────────────────────────────────────────────────────
  const handleFileChange=useCallback(e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setCsvName(file.name);
    const reader=new FileReader();
    reader.onload=ev=>{
      const parsed=parseCSV(ev.target.result);
      if(parsed){setChartData(buildChartData(parsed));setDbTitle(file.name.replace(/\.csv$/i,"").replace(/[_-]/g," "));}
    };
    reader.readAsText(file);
    e.target.value="";
  },[]);

  const handleDrop=useCallback(e=>{
    e.preventDefault();
    const file=Array.from(e.dataTransfer.files).find(f=>/\.csv$/i.test(f.name));
    if(file) handleFileChange({target:{files:[file]}});
  },[handleFileChange]);

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate=useCallback(()=>{
    if(!prompt.trim())return;
    setBuilding(true);
    setActiveDashboardId(null); // treat as new until saved
    setSaveStatus("");
    setTimeout(()=>{
      const gen=generateDashboard(prompt,schemeName,forcedTypes,chartData,dbTitle);
      setLayout(gen);setBuilding(false);setLeftOpen(false);
    },600);
  },[prompt,schemeName,forcedTypes,chartData,dbTitle]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const persistLayout=useCallback(async(layoutToSave,dbId)=>{
    if(!layoutToSave)return;
    setSaveStatus("saving");
    try{
      const payload={name:layoutToSave.title,scheme:layoutToSave.scheme,layout_json:layoutToSave};
      if(dbId){
        await dashboardsApi.update(dbId,payload);
        setDashboards(prev=>prev.map(d=>d.id===dbId?{...d,...payload,updated_at:new Date().toISOString()}:d));
      }else{
        const res=await dashboardsApi.create({...payload,project_id:projectId});
        setActiveDashboardId(res.data.id);
        setDashboards(prev=>[res.data,...prev]);
      }
      setSaveStatus("saved");
      setTimeout(()=>setSaveStatus(""),2500);
    }catch{
      setSaveStatus("error");
      setTimeout(()=>setSaveStatus(""),3000);
    }
  },[projectId]);

  const handleSave=()=>persistLayout(layout,activeDashboardId);

  // Auto-save 1.5 s after any widget change once a dashboard has been persisted
  useEffect(()=>{
    if(!layout||!activeDashboardId)return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current=setTimeout(()=>persistLayout(layout,activeDashboardId),1500);
    return()=>clearTimeout(autoSaveTimer.current);
  },[layout,activeDashboardId,persistLayout]);

  const handleDeleteDb=async id=>{
    if(!confirm("Delete this dashboard?"))return;
    await dashboardsApi.delete(id).catch(()=>{});
    setDashboards(prev=>prev.filter(d=>d.id!==id));
  };

  // Open saved dashboard — restore full layout without re-asking for anything
  const handleOpenDb=useCallback(async(id)=>{
    try{
      const res=await dashboardsApi.get(id);
      const db=res.data;
      const saved=db.layout_json;
      setActiveDashboardId(id);
      setDbTitle(db.name||(saved&&saved.title)||"Dashboard");
      setSchemeName(db.scheme||(saved&&saved.scheme)||"Metric Flow");
      if(saved&&saved.widgets&&saved.widgets.length>0){
        setLayout(saved);   // fully restore — no CSV / no prompt needed
        setPrompt("");
        setCsvName(db.dataset_name||"");
        setLeftOpen(false);  // show canvas immediately
      }else{
        setLayout(null);     // blank builder for old cards with no layout
        setLeftOpen(true);   // open controls so user can generate
      }
      setView("builder");
    }catch{
      setActiveDashboardId(null);
      setView("builder");
    }
  },[]);

  // ════════════════════════════════════════════════════════════════════════════
  // BUILDER VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if(view==="builder"){return(
    <div style={{display:"flex",height:"100%",background:S.bg,overflow:"hidden"}}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div style={{
        width:leftOpen?300:44,flexShrink:0,
        borderRight:`1px solid ${S.border}`,background:S.card,
        display:"flex",flexDirection:"column",overflow:"hidden",
        transition:"width 0.25s ease",position:"relative",
      }}>
        {/* Toggle */}
        <button onClick={()=>setLeftOpen(o=>!o)} style={{
          position:"absolute",top:12,right:leftOpen?10:7,zIndex:10,
          width:28,height:28,borderRadius:7,
          background:"rgba(255,255,255,0.06)",border:`1px solid ${S.border}`,
          color:S.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
        }}>{leftOpen?"◀":"▶"}</button>

        {/* Collapsed icons */}
        {!leftOpen&&(
          <div style={{paddingTop:52,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            {chartData&&<span title={csvName} style={{fontSize:14}}>📄</span>}
            <span title="Open controls" style={{fontSize:12,color:S.muted,cursor:"pointer"}} onClick={()=>setLeftOpen(true)}>⚙</span>
          </div>
        )}

        {/* Expanded panel */}
        {leftOpen&&(
          <div style={{flex:1,overflowY:"auto",padding:"52px 14px 14px",display:"flex",flexDirection:"column",gap:15}}>

            {/* Dashboard title */}
            <div>
              <label style={{fontSize:10,color:S.muted,display:"block",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Dashboard Title</label>
              <input value={dbTitle} onChange={e=>setDbTitle(e.target.value)}
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:8,color:S.text,fontSize:12,padding:"8px 10px",outline:"none",boxSizing:"border-box"}}/>
            </div>

            {/* Dataset upload */}
            <div>
              <label style={{fontSize:10,color:S.muted,display:"block",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Dataset (CSV)</label>
              {chartData?(
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:`${S.accent}12`,border:`1px solid ${S.accent}44`,borderRadius:8}}>
                  <span style={{fontSize:14}}>📄</span>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{fontSize:11,fontWeight:700,color:S.accent,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{csvName}</div>
                    <div style={{fontSize:10,color:S.muted}}>{chartData.__meta__?.numeric_cols?.length||0} numeric · {chartData.__meta__?.categorical_cols?.length||0} text cols</div>
                  </div>
                  <button onClick={()=>{setCsvName("");setChartData(null);}} style={{background:"none",border:"none",color:S.muted,cursor:"pointer",fontSize:14}}>×</button>
                </div>
              ):(
                <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()} style={{
                  padding:"16px 10px",borderRadius:8,cursor:"pointer",textAlign:"center",
                  background:"rgba(255,255,255,0.02)",border:`1px dashed ${S.border}`,
                  color:S.muted,fontSize:11,transition:"all 0.15s",
                }}>
                  <div style={{fontSize:22,marginBottom:6}}>📁</div>
                  <div>Drop CSV or click to upload</div>
                  <div style={{fontSize:10,marginTop:3,opacity:0.6}}>Dataset powers chart data</div>
                </div>
              )}
            </div>

            {/* Color scheme */}
            <div>
              <label style={{fontSize:10,color:S.muted,display:"block",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Color Scheme</label>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {Object.entries(SCHEMES).map(([name,sch])=>(
                  <div key={name} onClick={()=>setSchemeName(name)} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:7,cursor:"pointer",
                    background:schemeName===name?`${sch.accent}15`:"rgba(255,255,255,0.03)",
                    border:`1px solid ${schemeName===name?sch.accent+"44":S.border}`,transition:"all 0.1s",
                  }}>
                    <div style={{display:"flex",gap:2,flexShrink:0}}>
                      {sch.palette.slice(0,4).map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:2,background:c}}/>)}
                    </div>
                    <span style={{fontSize:11,color:schemeName===name?S.text:S.muted,fontWeight:schemeName===name?700:400}}>{name}</span>
                    {schemeName===name&&<span style={{marginLeft:"auto",fontSize:10,color:sch.accent}}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Force chart types */}
            <div>
              <label style={{fontSize:10,color:S.muted,display:"block",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Force Chart Types</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                {CHART_TYPES.map(ct=>{const sel=forcedTypes.includes(ct.id);return(
                  <div key={ct.id} onClick={()=>setForcedTypes(p=>sel?p.filter(x=>x!==ct.id):[...p,ct.id])} style={{
                    padding:"6px 2px",textAlign:"center",borderRadius:6,cursor:"pointer",
                    background:sel?`${S.accent}20`:"rgba(255,255,255,0.04)",
                    border:`1px solid ${sel?S.accent+"55":S.border}`,color:sel?S.accent:S.muted,transition:"all 0.1s",
                  }}>
                    <div style={{fontSize:12}}>{ct.icon}</div>
                    <div style={{fontSize:8,marginTop:1}}>{ct.label}</div>
                  </div>
                );})}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label style={{fontSize:10,color:S.muted,display:"block",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>Describe Dashboard</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                {PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>setPrompt(p.prompt)} style={{fontSize:9,padding:"3px 8px",background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:99,color:S.muted,cursor:"pointer"}}>{p.label}</button>
                ))}
              </div>
              <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))handleGenerate();}}
                placeholder="e.g. 4 KPI cards for revenue, orders, customers. Monthly line chart. Bar chart for top 5 products. (Ctrl+Enter)"
                rows={4}
                style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${S.border}`,borderRadius:8,color:S.text,fontSize:11,padding:"9px 10px",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box",lineHeight:1.5}}/>
            </div>

            <button onClick={handleGenerate} disabled={building||!prompt.trim()} style={{
              padding:"10px",borderRadius:8,fontWeight:800,fontSize:12,
              cursor:building||!prompt.trim()?"not-allowed":"pointer",
              background:building||!prompt.trim()?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${S.accent}33,${S.accent2}33)`,
              border:`1px solid ${building||!prompt.trim()?S.border:S.accent+"55"}`,
              color:building||!prompt.trim()?S.muted:S.accent,
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
            }}>
              {building?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⚙</span>Building…</>:<><span>⚡</span>Generate Dashboard</>}
            </button>

          </div>
        )}
      </div>

      {/* ── Right canvas ──────────────────────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:S.bg}}>
        {/* Topbar */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 20px",borderBottom:`1px solid ${S.border}`,flexShrink:0,gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>{setView("list");setLayout(null);setActiveDashboardId(null);setSaveStatus("");}} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${S.border}`,borderRadius:7,color:S.muted,cursor:"pointer",padding:"5px 12px",fontSize:11}}>← Back</button>
            <input value={dbTitle} onChange={e=>setDbTitle(e.target.value)} style={{background:"transparent",border:"none",color:S.text,fontSize:15,fontWeight:800,outline:"none",letterSpacing:"-0.3px",minWidth:180}}/>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {Object.entries(SCHEMES).map(([name,sch])=>(
              <button key={name} title={name} onClick={()=>setSchemeName(name)} style={{width:18,height:18,borderRadius:4,cursor:"pointer",background:sch.accent,border:`2px solid ${schemeName===name?"#fff":"transparent"}`,boxShadow:`0 0 5px ${sch.accent}66`,transition:"all 0.1s"}}/>
            ))}
            {layout&&(
              <button onClick={handleSave} disabled={saveStatus==="saving"} style={{marginLeft:8,padding:"6px 16px",borderRadius:8,fontWeight:700,fontSize:12,cursor:saveStatus==="saving"?"wait":"pointer",background:saveStatus==="saved"?"rgba(16,185,129,0.18)":saveStatus==="error"?"rgba(249,114,114,0.18)":`${S.accent}22`,border:`1px solid ${saveStatus==="saved"?"#10b981":saveStatus==="error"?"#f97272":S.accent+"55"}`,color:saveStatus==="saved"?"#10b981":saveStatus==="error"?"#f97272":S.accent,transition:"all 0.2s"}}>
                {saveStatus==="saving"?"Saving…":saveStatus==="saved"?"✓ Saved":saveStatus==="error"?"✗ Error":"Save"}
              </button>
            )}
            {activeDashboardId&&!layout&&null}
          </div>
        </div>

        {/* Canvas body */}
        <div style={{flex:1,overflowY:"auto"}}>
          {building&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12}}>
              <div style={{fontSize:36,animation:"spin 1.5s linear infinite"}}>⚙️</div>
              <div style={{fontSize:14,fontWeight:700,color:S.text}}>Building your dashboard…</div>
              <div style={{fontSize:11,color:S.muted}}>Analyzing dataset, placing widgets</div>
            </div>
          )}
          {!building&&!layout&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:14}}>
              <div style={{fontSize:48,opacity:0.25}}>📊</div>
              {!chartData?(
                <>
                  <div style={{fontSize:14,fontWeight:600,color:S.muted}}>Upload a CSV dataset to get started</div>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:"10px 24px",borderRadius:10,background:`${S.accent}22`,border:`1px solid ${S.accent}55`,color:S.accent,cursor:"pointer",fontSize:13,fontWeight:700}}>Upload CSV Dataset</button>
                  <div style={{fontSize:11,color:S.muted,opacity:0.6}}>or open controls ▶ to describe your dashboard</div>
                </>
              ):(
                <>
                  <div style={{fontSize:14,fontWeight:600,color:S.muted}}>Dataset ready — describe your dashboard</div>
                  <button onClick={()=>setLeftOpen(true)} style={{padding:"10px 24px",borderRadius:10,background:`${S.accent}22`,border:`1px solid ${S.accent}55`,color:S.accent,cursor:"pointer",fontSize:13,fontWeight:700}}>Open Controls ▶</button>
                </>
              )}
            </div>
          )}
          {!building&&layout&&(
            <DashboardCanvas layout={layout} S={S}
              onRemove={id=>setLayout(prev=>prev?{...prev,widgets:prev.widgets.filter(w=>w.id!==id)}:prev)}/>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleFileChange}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );}

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return(
    <div style={{padding:"32px 36px",minHeight:"100%",background:T.bg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.5px",marginBottom:5}}>Dashboards</div>
          <div style={{fontSize:12,color:T.muted}}>{dashboards.length} dashboard{dashboards.length!==1?"s":""}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* CSV upload zone */}
          <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()} style={{
            padding:"8px 14px",borderRadius:10,cursor:"pointer",
            background:chartData?"rgba(224,92,45,0.1)":"rgba(255,255,255,0.04)",
            border:`1px dashed ${chartData?T.accent+"66":"rgba(255,255,255,0.12)"}`,
            color:chartData?T.accent:T.muted,fontSize:12,
            display:"flex",alignItems:"center",gap:7,transition:"all 0.15s",
          }}>
            <span>{chartData?"📄":"📁"}</span>
            <span style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chartData?csvName:"Drop CSV or click"}</span>
            {chartData&&<button onClick={e=>{e.stopPropagation();setCsvName("");setChartData(null);}} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:14}}>×</button>}
          </div>
          <button onClick={()=>setView("builder")} style={{
            display:"flex",alignItems:"center",gap:7,padding:"10px 18px",borderRadius:10,
            background:`linear-gradient(135deg,${T.accent}33,${T.accent}22)`,
            border:`1px solid ${T.accent}55`,color:T.accent,cursor:"pointer",fontSize:13,fontWeight:700,
          }}><span>+</span>New Dashboard</button>
        </div>
      </div>

      {loading?(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {[1,2,3].map(i=><div key={i} style={{height:200,background:T.card,borderRadius:14,border:`1px solid ${T.border}`,animation:"pulse 1.5s infinite"}}/>)}
        </div>
      ):dashboards.length===0?(
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{fontSize:48,marginBottom:16}}>📊</div>
          <div style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:8}}>No dashboards yet</div>
          <div style={{fontSize:13,color:T.muted,marginBottom:6}}>Upload a CSV dataset above, then describe your dashboard — AI builds it instantly</div>
          {!chartData&&<div style={{fontSize:11,color:T.muted,marginBottom:20,opacity:0.6}}>↑ Upload a .csv file first to power real charts</div>}
          <button onClick={()=>setView("builder")} style={{padding:"12px 28px",borderRadius:10,background:T.accent,border:"none",color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700}}>Create First Dashboard</button>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {dashboards.map(d=><DashboardCard key={d.id} dashboard={d} onOpen={handleOpenDb} onDelete={handleDeleteDb}/>)}
          <div onClick={()=>setView("builder")} style={{background:"transparent",border:`1px dashed rgba(224,92,45,0.3)`,borderRadius:14,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,minHeight:200,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(224,92,45,0.05)";e.currentTarget.style.borderColor="rgba(224,92,45,0.5)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="rgba(224,92,45,0.3)";}}>
            <div style={{fontSize:28,opacity:0.4}}>+</div>
            <div style={{fontSize:12,color:T.muted}}>New Dashboard</div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleFileChange}/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}