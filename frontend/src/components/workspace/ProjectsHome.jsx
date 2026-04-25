// src/components/workspace/ProjectsHome.jsx
// Route: /projects
// Grid of project cards. Uses react-router useNavigate directly.

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectsApi } from '../../api/client'
import NewProjectModal from './NewProjectModal'

const T = {
  bg:     '#111318',
  card:   '#16181f',
  border: 'rgba(255,255,255,0.07)',
  text:   'rgba(255,255,255,0.88)',
  muted:  'rgba(255,255,255,0.38)',
  dim:    'rgba(255,255,255,0.18)',
  accent: '#e05c2d',
}

function ProjectCard({ project, onOpen, onDelete }) {
  const [hov, setHov] = useState(false)
  const age = Math.floor((Date.now() - new Date(project.updated_at)) / 86400000)
  const ageStr = age === 0 ? 'Today' : age === 1 ? 'Yesterday' : `${age}d ago`

  return (
    <div
      onClick={() => onOpen(project.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.card,
        border: `1px solid ${hov ? project.color + '55' : T.border}`,
        borderRadius: 14, padding: 20, cursor: 'pointer',
        transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
        boxShadow: hov ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${project.color}22` : 'none',
        transform: hov ? 'translateY(-1px)' : 'none',
      }}>

      {/* Color accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
        background:`linear-gradient(90deg,${project.color},${project.color}44)`,
        borderRadius:'14px 14px 0 0' }}/>

      {/* Delete button */}
      {hov && (
        <button onClick={e => { e.stopPropagation(); onDelete(project.id) }}
          style={{ position:'absolute', top:12, right:12, width:24, height:24,
            borderRadius:6, background:'rgba(249,114,114,0.15)',
            border:'1px solid rgba(249,114,114,0.3)', color:'#f97272',
            cursor:'pointer', fontSize:12, display:'flex',
            alignItems:'center', justifyContent:'center' }}>×</button>
      )}

      {/* Icon */}
      <div style={{ width:44, height:44, borderRadius:12,
        background:`${project.color}18`, border:`1px solid ${project.color}33`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22, marginBottom:14 }}>{project.icon}</div>

      {/* Name */}
      <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:5, lineHeight:1.3 }}>
        {project.name}
      </div>

      {/* Description */}
      {project.description && (
        <div style={{ fontSize:11, color:T.muted, lineHeight:1.5, marginBottom:14,
          overflow:'hidden', display:'-webkit-box',
          WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {project.description}
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'flex', gap:14, marginTop: project.description ? 0 : 14 }}>
        {[
          { icon:'📊', val: project.dashboard_count, label:'dashboards' },
          { icon:'💬', val: project.chat_count,      label:'chats'      },
          { icon:'🗄', val: project.dataset_count,   label:'datasets'   },
        ].map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
            <span style={{ opacity:0.5 }}>{s.icon}</span>
            <span style={{ fontWeight:700, color:T.text }}>{s.val}</span>
            <span style={{ color:T.dim }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize:10, color:T.dim, marginTop:12,
        paddingTop:10, borderTop:`1px solid ${T.border}` }}>
        Updated {ageStr}
      </div>
    </div>
  )
}

export default function ProjectsHome() {
  const navigate = useNavigate()
  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    setLoading(true)
    projectsApi.list()
      .then(r => setProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (data) => {
    const r = await projectsApi.create(data)
    setShowModal(false)
    // Go directly to the new project's page
    navigate(`/projects/${r.data.id}`)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its data?')) return
    await projectsApi.delete(id)
    load()
  }

  return (
    <div style={{ padding:'32px 36px', minHeight:'100%', background:T.bg }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start',
        justifyContent:'space-between', marginBottom:32 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:900, color:T.text,
            letterSpacing:'-0.5px', marginBottom:6 }}>Projects</div>
          <div style={{ fontSize:13, color:T.muted }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} · Each project has its own dataset, dashboards and chat history
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'10px 18px', borderRadius:10,
          background:`linear-gradient(135deg,${T.accent}33,${T.accent}22)`,
          border:`1px solid ${T.accent}55`,
          color:T.accent, cursor:'pointer', fontSize:13, fontWeight:700,
        }}>
          <span>+</span> New Project
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width:280, height:180, background:T.card,
              borderRadius:14, border:`1px solid ${T.border}`,
              animation:'pulse 1.5s ease infinite' }}/>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.text, marginBottom:8 }}>
            No projects yet
          </div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:24 }}>
            Create your first project to start analyzing data
          </div>
          <button onClick={() => setShowModal(true)} style={{
            padding:'12px 28px', borderRadius:10,
            background:T.accent, border:'none',
            color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700,
          }}>Create First Project</button>
        </div>
      ) : (
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
          gap:16,
        }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p}
              onOpen={id => navigate(`/projects/${id}`)}
              onDelete={handleDelete}/>
          ))}
          {/* New project card */}
          <div onClick={() => setShowModal(true)}
            style={{ background:'transparent', border:`1px dashed rgba(224,92,45,0.3)`,
              borderRadius:14, padding:20, cursor:'pointer',
              display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center',
              gap:10, minHeight:160, transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(224,92,45,0.05)'; e.currentTarget.style.borderColor='rgba(224,92,45,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(224,92,45,0.3)' }}>
            <div style={{ fontSize:28, opacity:0.4 }}>+</div>
            <div style={{ fontSize:12, color:T.muted }}>New Project</div>
          </div>
        </div>
      )}

      {showModal && (
        <NewProjectModal onConfirm={handleCreate} onClose={() => setShowModal(false)}/>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}