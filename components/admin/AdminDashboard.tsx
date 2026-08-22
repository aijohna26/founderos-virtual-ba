"use client";

import React, { useState } from "react";
import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { AdminLtdDashboard } from "@/components/admin/AdminLtdDashboard";
import { AdminCostOpsDashboard } from "@/components/admin/AdminCostOpsDashboard";
import { AdminRagTelemetryDashboard } from "@/components/admin/AdminRagTelemetryDashboard";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("ltd");

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "ltd" ? <AdminLtdDashboard /> : activeTab === "cost-ops" ? <AdminCostOpsDashboard /> : <AdminRagTelemetryDashboard />}
    </AdminShell>
  );
}
