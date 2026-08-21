"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export type AdminTab = "ltd" | "cost-ops";

export interface AdminShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
}

const TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "ltd", label: "LTD" },
  { id: "cost-ops", label: "Cost Ops" },
];

export function AdminShell({ activeTab, onTabChange, children }: AdminShellProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    // Re-run the server component so it re-reads the now-cleared cookie and renders the
    // login form instead of the dashboard.
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-black">Admin</h1>
            <nav className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
