// src/components/dashboards/DashboardPage.jsx
// Renders a single dashboard — loads from DB, passes to DashboardGenerator,
// auto-saves layout back to DB on changes

import React, { useState, useEffect, useCallback, useRef } from "react";
import { dashboardsApi } from "../../api/client";
import DashboardGenerator from "../enterprise/DashboardGenerator";

const T = {
  bg: "#111318", card: "#16181f",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.88)", muted: "rgba(255,255,255,0.38)",
  accent: "#e05c2d",
};

export default function DashboardPage({ dashboardId, sessionId, chartData }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!dashboardId) return;
    setLoading(true);
    dashboardsApi.get(dashboardId)
      .then(r => setDashboard(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dashboardId]);

  // Auto-save layout to DB with 1s debounce
  const saveLayout = useCallback((layout, scheme) => {
    if (!dashboardId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await dashboardsApi.update(dashboardId, { layout, scheme });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {}
      setSaving(false);
    }, 1000);
  }, [dashboardId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", color: T.muted, fontSize: 13, background: T.bg }}>
      Loading dashboard…
    </div>
  );

  if (!dashboard) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", color: T.muted, fontSize: 13, background: T.bg }}>
      Dashboard not found.
    </div>
  );

  // Extract stored prompt from layout if present
  const storedPrompt = dashboard.layout?._prompt || "";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
      background: T.bg }}>

      {/* Save indicator */}
      {(saving || saved) && (
        <div style={{ position: "fixed", bottom: 16, right: 16, zIndex: 999,
          background: saved ? "rgba(61,214,140,0.15)" : "rgba(255,255,255,0.08)",
          border: `1px solid ${saved ? "#3dd68c55" : T.border}`,
          borderRadius: 8, padding: "8px 14px",
          fontSize: 12, color: saved ? "#3dd68c" : T.muted,
          display: "flex", alignItems: "center", gap: 6 }}>
          {saving ? "⏳ Saving…" : "✓ Saved"}
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden" }}>
        <DashboardGenerator
          dashboardId={dashboardId}
          dashboardName={dashboard.name}
          initialScheme={dashboard.scheme}
          initialPrompt={storedPrompt}
          initialLayout={storedPrompt ? null : dashboard.layout}
          sessionId={sessionId}
          chartData={chartData}
          onLayoutChange={saveLayout}
        />
      </div>
    </div>
  );
}