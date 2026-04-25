// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Active identifiers
  const [activeProjectId,   setActiveProjectId]   = useState(null);
  const [activeDatasetId,   setActiveDatasetId]   = useState(null);
  const [activeDashboardId, setActiveDashboardId] = useState(null);
  const [activeChatSessionId, setActiveChatSessionId] = useState(null);

  // In-memory session key (from existing file upload system)
  const [sessionId, setSessionId] = useState(null);
  const [chartData, setChartData] = useState(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Projects cache (avoid re-fetching on every navigation)
  const [projectsCache, setProjectsCache] = useState({});

  const setProject = useCallback((projectId) => {
    setActiveProjectId(projectId);
    setActiveDatasetId(null);
    setActiveDashboardId(null);
    setActiveChatSessionId(null);
  }, []);

  return (
    <AppContext.Provider value={{
      activeProjectId,   setActiveProjectId,
      activeDatasetId,   setActiveDatasetId,
      activeDashboardId, setActiveDashboardId,
      activeChatSessionId, setActiveChatSessionId,
      sessionId, setSessionId,
      chartData, setChartData,
      sidebarCollapsed, setSidebarCollapsed,
      projectsCache, setProjectsCache,
      setProject,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};