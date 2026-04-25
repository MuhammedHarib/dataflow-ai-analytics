// src/views/DashboardView.jsx
import React from "react";
import DashboardGenerator from "../components/enterprise/DashboardGenerator";

export default function DashboardView({ sessionId, chartData }) {
  return (
    <DashboardGenerator
      sessionId={sessionId}
      chartData={chartData}
    />
  );
}