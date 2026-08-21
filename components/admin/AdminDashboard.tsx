"use client";

import React, { useState } from "react";
import { AdminShell, type AdminTab } from "@/components/admin/AdminShell";
import { AdminLtdDashboard } from "@/components/admin/AdminLtdDashboard";
import { AdminCostOpsDashboard } from "@/components/admin/AdminCostOpsDashboard";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("ltd");

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "ltd" ? <AdminLtdDashboard /> : <AdminCostOpsDashboard />}
    </AdminShell>
  );
}
