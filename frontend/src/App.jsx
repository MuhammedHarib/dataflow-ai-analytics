// src/App.jsx — React Router v6 shell
// Routes:
//   /           → AI analyst workspace (ChatBox + VisualBox)
//   /projects   → Projects list
//   /projects/:projectId           → Project detail (dataset + dashboards)
//   /projects/:projectId/dashboards/:dashboardId  → Dashboard builder

import React, { lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppShell from './layouts/AppShell'
import ProjectsHome from './components/workspace/ProjectsHome'
import ProjectDetail from './components/workspace/ProjectDetail'
import DashboardBuilder from './components/dashboards/DashboardBuilder'
const ProjectChatView = lazy(() => import('./views/ProjectChatView'))

const ChatPage = lazy(() => import('./views/ChatView'))

const Spin = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
    height:'100%', color:'rgba(255,255,255,0.3)', fontSize:13 }}>Loading…</div>
)

// ── Derives an "activePage" object from the current URL for the Sidebar ──
function pageFromLocation(loc) {
  const parts = loc.pathname.split('/').filter(Boolean)
  if (!parts.length) return { view:'chat' }
  if (parts[0] === 'projects') {
    if (parts.length === 1) return { view:'home' }
    if (parts.length === 2) return { view:'project', projectId: Number(parts[1]) }
    if (parts.length >= 3 && parts[2] === 'chat')
      return { view:'project-chat', projectId: Number(parts[1]), chatId: parts[3] ? Number(parts[3]) : null }
    if (parts.length === 4 && parts[2] === 'dashboards')
      return { view:'dashboard', projectId: Number(parts[1]), dashboardId: parts[3] }
  }
  return { view: parts[0] }
}

// Forces full re-mount (clean state) whenever dashboardId changes
function DashboardBuilderKeyed(props) {
  const { dashboardId } = useParams()
  return <DashboardBuilder key={dashboardId} {...props} />
}

function AppInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePage = pageFromLocation(location)

  // onNavigate: called by Sidebar and page components
  const onNavigate = ({ view, projectId, dashboardId, newChat, chatId } = {}) => {
    if (view === 'home')       navigate('/projects')
    else if (view === 'project') navigate(`/projects/${projectId}`)
    else if (view === 'new-project') navigate('/projects')   // ProjectsHome handles the modal
    else if (view === 'dashboards')  navigate(`/projects/${projectId}`)
    else if (view === 'new-dashboard') navigate(`/projects/${projectId}/dashboards/new`)
    else if (view === 'dashboard')   navigate(`/projects/${projectId}/dashboards/${dashboardId}`)
    else if (view === 'chat')  navigate('/')
    else if (view === 'realtime') navigate('/realtime')
    else navigate('/')
  }

  return (
    <AppShell activePage={activePage}>
      <Routes>
        {/* Original AI workspace — completely untouched */}
        <Route path="/" element={
          <Suspense fallback={<Spin />}>
            <ChatPage />
          </Suspense>
        } />

        {/* Projects */}
        <Route path="/projects" element={<ProjectsHome onNavigate={onNavigate} />} />
        <Route path="/projects/:projectId" element={<ProjectDetail onNavigate={onNavigate} />} />

        {/* Project chat */}
        <Route path="/projects/:projectId/chat" element={
          <Suspense fallback={<Spin />}><ProjectChatView /></Suspense>
        } />
        <Route path="/projects/:projectId/chat/:chatId" element={
          <Suspense fallback={<Spin />}><ProjectChatView /></Suspense>
        } />

        {/* Dashboard builder */}
        <Route path="/projects/:projectId/dashboards/:dashboardId"
          element={<DashboardBuilderKeyed onNavigate={onNavigate} />} />

        {/* Catch-all */}
        <Route path="*" element={<ProjectsHome onNavigate={onNavigate} />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}