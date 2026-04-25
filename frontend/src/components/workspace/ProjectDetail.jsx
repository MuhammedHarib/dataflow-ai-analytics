// src/components/workspace/ProjectDetail.jsx
// Route: /projects/:projectId
// Shows: dataset upload zone + dashboard grid
// Each project is linked to exactly ONE dataset.

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectsApi, datasetsApi, dashboardsApi } from '../../api/client'

const T = {
  bg:'#111318', card:'#16181f', cardHov:'#1c2030',
  border:'rgba(255,255,255,0.07)', borderHov:'rgba(255,255,255,0.15)',
  text:'rgba(255,255,255,0.88)', muted:'rgba(255,255,255,0.38)',
  dim:'rgba(255,255,255,0.16)', accent:'#e05c2d',
}

const ACCEPT = '.csv,.tsv,.xlsx,.xls,.json,.parquet'

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`
  return `${(b/1048576).toFixed(1)} MB`
}

function SchemaModal({ dataset, onClose }) {
  const schema = (() => { try { return JSON.parse(dataset.schema_json || '{}') } catch { return {} } })()
  const cols = Object.entries(schema)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.72)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onClick={onClose}>
      <div style={{ background:'#1a1d28', border:`1px solid ${T.border}`, borderRadius:16,
        padding:28, width:580, maxHeight:'80vh', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.text }}>Schema — {dataset.file_name}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {['Column','Type'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'6px 8px', color:T.muted, fontWeight:700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cols.map(([col, dtype]) => (
                <tr key={col} style={{ borderBottom:`1px solid rgba(255,255,255,0.04)` }}>
                  <td style={{ padding:'7px 8px', color:T.text, fontFamily:'monospace' }}>{col}</td>
                  <td style={{ padding:'7px 8px', color:T.accent, fontFamily:'monospace', fontSize:11 }}>{dtype}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:14, fontSize:11, color:T.muted }}>
          {dataset.row_count?.toLocaleString()} rows · {dataset.col_count} columns · {fmtBytes(dataset.size_bytes)}
        </div>
      </div>
    </div>
  )
}

function DashboardCard({ dashboard, onOpen, onDelete }) {
  const [hov, setHov] = useState(false)
  const SCHEME_COLORS = {
    'Metric Flow':'#e05c2d','Neon Dark':'#00ffb4','Ocean Blue':'#63b3ed',
    'Solar Gold':'#f5a31a','Rose Quartz':'#ec4899','Cyberpunk':'#ffff00',
  }
  const accent = SCHEME_COLORS[dashboard.scheme] || T.accent
  const age = Math.floor((Date.now() - new Date(dashboard.updated_at)) / 86400000)
  const ageStr = age === 0 ? 'Today' : age === 1 ? 'Yesterday' : `${age}d ago`
  const widgetCount = dashboard.layout?.widgets?.length || 0

  return (
    <div onClick={() => onOpen(dashboard.id)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:T.card, border:`1px solid ${hov ? accent+'55' : T.border}`,
        borderRadius:14, padding:20, cursor:'pointer',
        transition:'all 0.15s', position:'relative', overflow:'hidden',
        boxShadow: hov ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22` : 'none',
        transform: hov ? 'translateY(-2px)' : 'none' }}>

      <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${accent},${accent}44)`, borderRadius:'14px 14px 0 0' }}/>

      {hov && (
        <button onClick={e => { e.stopPropagation(); onDelete(dashboard.id) }}
          style={{ position:'absolute', top:12, right:12, width:26, height:26,
            borderRadius:6, background:'rgba(249,114,114,0.15)',
            border:'1px solid rgba(249,114,114,0.3)', color:'#f97272',
            cursor:'pointer', fontSize:14, display:'flex',
            alignItems:'center', justifyContent:'center', zIndex:2 }}>×</button>
      )}

      {/* Mini bar chart preview */}
      <div style={{ height:48, marginBottom:12, display:'flex', alignItems:'flex-end', gap:3, opacity:0.6 }}>
        {[0.4,0.7,0.5,0.9,0.6,0.8,1.0,0.75].map((h,i) => (
          <div key={i} style={{ flex:1, height:`${h*100}%`,
            background:`${accent}${Math.floor((0.3+h*0.5)*255).toString(16).padStart(2,'0')}`,
            borderRadius:2 }}/>
        ))}
      </div>

      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dashboard.name}</div>
      {dashboard.description && (
        <div style={{ fontSize:11, color:T.muted, marginBottom:8,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dashboard.description}</div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
        marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        <span style={{ fontSize:10, fontWeight:600, color:accent,
          background:`${accent}15`, border:`1px solid ${accent}33`,
          borderRadius:99, padding:'2px 8px' }}>
          {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize:10, color:T.dim }}>{ageStr}</span>
      </div>
    </div>
  )
}

export default function ProjectDetail({ onNavigate }) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [project,    setProject]    = useState(null)
  const [dataset,    setDataset]    = useState(null)
  const [dashboards, setDashboards] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [uploading,  setUploading]  = useState(false)
  const [uploadPct,  setUploadPct]  = useState(0)
  const [uploadErr,  setUploadErr]  = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [newDashModal, setNewDashModal] = useState(false)
  const [newDashName,  setNewDashName]  = useState('')

  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, dsr, dbr] = await Promise.all([
        projectsApi.get(projectId),
        datasetsApi.list(projectId),
        dashboardsApi.list(projectId),
      ])
      setProject(pr.data)
      setDataset(dsr.data?.[0] || null)
      setDashboards(dbr.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  // ── File parsing (client-side for CSV/TSV/JSON; XLSX via xlsx lib) ──
  const handleFile = useCallback(async (file) => {
    if (!file) return
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    const allowed = ['.csv','.tsv','.xlsx','.xls','.json','.parquet']
    if (!allowed.includes(ext)) {
      setUploadErr(`Unsupported file type: ${ext}. Use CSV, Excel, JSON, TSV, or Parquet.`)
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadErr('File too large (max 100 MB).')
      return
    }
    setUploadErr('')
    setUploading(true)
    setUploadPct(0)
    try {
      const r = await datasetsApi.upload(
        projectId, file,
        e => setUploadPct(Math.round((e.loaded / e.total) * 100))
      )
      setDataset(r.data)
      setUploadPct(100)
    } catch (e) {
      setUploadErr(e?.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }, [projectId])

  const handleFileChange = e => { handleFile(e.target.files?.[0]); e.target.value = '' }
  const handleDrop = e => {
    e.preventDefault(); setDragOver(false)
    handleFile(Array.from(e.dataTransfer.files)?.[0])
  }

  const handleDeleteDataset = async () => {
    if (!dataset) return
    if (!confirm('Delete this dataset? All dashboard data will be lost.')) return
    await datasetsApi.delete(dataset.id).catch(() => {})
    setDataset(null)
    setDashboards([])
  }

  const handleCreateDashboard = async () => {
    if (!newDashName.trim() || !dataset) return
    const r = await dashboardsApi.create({
      project_id: Number(projectId),
      dataset_id: dataset.id,
      name: newDashName.trim(),
    })
    setNewDashModal(false)
    setNewDashName('')
    navigate(`/projects/${projectId}/dashboards/${r.data.id}`)
  }

  const handleDeleteDashboard = async (id) => {
    if (!confirm('Delete this dashboard?')) return
    await dashboardsApi.delete(id).catch(() => {})
    setDashboards(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100%', color:T.muted, fontSize:13 }}>Loading project…</div>
  )
  if (!project) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100%', color:T.muted, fontSize:13 }}>Project not found.</div>
  )

  return (
    <div style={{ padding:'32px 36px', minHeight:'100%', background:T.bg, overflowY:'auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
        <button onClick={() => navigate('/projects')}
          style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${T.border}`,
            borderRadius:8, color:T.muted, cursor:'pointer', padding:'6px 12px', fontSize:12 }}>
          ← Projects
        </button>
        <span style={{ color:T.dim, fontSize:14 }}>/</span>
        <div style={{ width:36, height:36, borderRadius:10,
          background:`${project.color}18`, border:`1px solid ${project.color}33`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          {project.icon}
        </div>
        <div>
          <div style={{ fontSize:20, fontWeight:900, color:T.text, letterSpacing:'-0.3px' }}>
            {project.name}
          </div>
          {project.description && (
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{project.description}</div>
          )}
        </div>
      </div>

      {/* ── Dataset Section ───────────────────────────────── */}
      <section style={{ marginBottom:40 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.muted,
          textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:14 }}>
          DATASET {dataset ? '· 1 file' : '· no file uploaded'}
        </div>

        {!dataset ? (
          /* Upload zone */
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{ border:`2px dashed ${dragOver ? T.accent : 'rgba(255,255,255,0.15)'}`,
              borderRadius:14, padding:'36px 24px',
              display:'flex', flexDirection:'column', alignItems:'center', gap:10,
              cursor:'pointer', transition:'all 0.15s',
              background: dragOver ? `${T.accent}08` : 'transparent',
              maxWidth:600 }}>
            <div style={{ fontSize:36, opacity:0.4 }}>📁</div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text }}>
              {uploading ? `Uploading… ${uploadPct}%` : 'Drop file here or click to upload'}
            </div>
            <div style={{ fontSize:11, color:T.muted }}>
              CSV · Excel (.xlsx/.xls) · JSON · TSV · Parquet · Max 100 MB
            </div>
            {uploading && (
              <div style={{ width:'100%', maxWidth:300, height:4, background:'rgba(255,255,255,0.1)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${uploadPct}%`, background:T.accent, borderRadius:4, transition:'width 0.3s' }}/>
              </div>
            )}
            {uploadErr && <div style={{ fontSize:11, color:'#f97272' }}>{uploadErr}</div>}
          </div>
        ) : (
          /* Dataset info card */
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14,
            padding:'18px 20px', maxWidth:600, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📊</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{dataset.file_name}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>
                {dataset.row_count?.toLocaleString()} rows · {dataset.col_count} columns · {fmtBytes(dataset.size_bytes)}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button onClick={() => setShowSchema(true)}
                style={{ padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)',
                  border:`1px solid ${T.border}`, color:T.text, cursor:'pointer', fontSize:11 }}>
                View Schema
              </button>
              <button onClick={() => fileRef.current?.click()}
                style={{ padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,0.06)',
                  border:`1px solid ${T.border}`, color:T.muted, cursor:'pointer', fontSize:11 }}>
                Replace
              </button>
              <button onClick={handleDeleteDataset}
                style={{ padding:'6px 12px', borderRadius:8, background:'rgba(249,114,114,0.08)',
                  border:'1px solid rgba(249,114,114,0.25)', color:'#f97272', cursor:'pointer', fontSize:11 }}>
                Delete
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Dashboards Section ──────────────────────────────── */}
      <section>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:T.muted,
              textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:2 }}>
              DASHBOARDS · {dashboards.length}
            </div>
            {!dataset && (
              <div style={{ fontSize:11, color:'rgba(249,163,26,0.8)' }}>
                ⚠ Upload a dataset to create dashboards
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              disabled={!dataset}
              onClick={() => navigate(`/projects/${projectId}/dashboards/new`)}
              style={{ padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:700,
                cursor: dataset ? 'pointer' : 'not-allowed',
                background: dataset ? `${T.accent}22` : 'rgba(255,255,255,0.04)',
                border:`1px solid ${dataset ? T.accent+'55' : 'rgba(255,255,255,0.08)'}`,
                color: dataset ? T.accent : T.dim,
                transition:'all 0.15s' }}>
              + New Dashboard
            </button>
          </div>
        </div>

        {dashboards.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:T.muted }}>
            <div style={{ fontSize:36, marginBottom:12, opacity:0.3 }}>📊</div>
            <div style={{ fontSize:13 }}>No dashboards yet</div>
            {dataset && (
              <button onClick={() => navigate(`/projects/${projectId}/dashboards/new`)}
                style={{ marginTop:16, padding:'10px 24px', borderRadius:10,
                  background:T.accent, border:'none', color:'#fff',
                  cursor:'pointer', fontSize:13, fontWeight:700 }}>
                Create First Dashboard
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
            {dashboards.map(d => (
              <DashboardCard key={d.id} dashboard={d}
                onOpen={id => navigate(`/projects/${projectId}/dashboards/${id}`)}
                onDelete={handleDeleteDashboard}/>
            ))}
            {dataset && (
              <div onClick={() => navigate(`/projects/${projectId}/dashboards/new`)}
                style={{ background:'transparent', border:`1px dashed rgba(224,92,45,0.3)`,
                  borderRadius:14, minHeight:160, cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', gap:8, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(224,92,45,0.05)'; e.currentTarget.style.borderColor='rgba(224,92,45,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(224,92,45,0.3)' }}>
                <div style={{ fontSize:28, opacity:0.4 }}>+</div>
                <div style={{ fontSize:12, color:T.muted }}>New Dashboard</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept={ACCEPT} style={{ display:'none' }} onChange={handleFileChange}/>

      {/* Schema modal */}
      {showSchema && dataset && <SchemaModal dataset={dataset} onClose={() => setShowSchema(false)}/>}
    </div>
  )
}