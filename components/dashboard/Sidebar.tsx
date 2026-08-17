"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  PhoneCall,
  LayoutGrid,
  Compass,
  Lightbulb,
  FileText,
  FlaskConical,
  Map,
  BarChart3,
  FolderClosed,
  Plus,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Venture } from "@/lib/store/ventureStore";

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeVentureId: string;
  setActiveVentureId: (id: string) => void;
  ventures: Venture[];
  onOpenCreateVenture: () => void;
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  activeVentureId,
  setActiveVentureId,
  ventures,
  onOpenCreateVenture,
  isDailyCallActive,
  setIsDailyCallActive,
}: SidebarProps) {
  const { user } = useUser();
  const currentVenture = ventures.find((v) => v.id === activeVentureId) || ventures[0];

  // Compute real sprint progress
  const doneCount = currentVenture?.columns?.done?.items?.length || 0;
  const inProgressCount = currentVenture?.columns?.in_progress?.items?.length || 0;
  const todayCount = currentVenture?.columns?.today?.items?.length || 0;
  const backlogCount = currentVenture?.columns?.backlog?.items?.length || 0;
  const blockedCount = currentVenture?.columns?.blocked?.items?.length || 0;
  const totalCards = doneCount + inProgressCount + todayCount + backlogCount + blockedCount;
  const progressPercent = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0;

  const workspaceNav = [
    { id: "Board", name: "Board", icon: LayoutGrid },
    { id: "Strategy", name: "Strategy", icon: Compass },
    { id: "Assumptions", name: "Assumptions", icon: Lightbulb },
    { id: "Requirements", name: "Requirements", icon: FileText },
    { id: "Experiments", name: "Experiments", icon: FlaskConical },
    { id: "Roadmap", name: "Roadmap", icon: Map },
    { id: "Metrics", name: "Metrics", icon: BarChart3 },
    { id: "Documents", name: "Documents", icon: FolderClosed },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0">
      {/* Top Brand & Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-none">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 px-2 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="currentColor" opacity="0.2" />
              <path d="M6 8L12 5L18 8V16L12 19L6 16V8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 12V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12 12L18 8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Founder<span className="text-blue-600">Ally</span>
          </span>
        </Link>

        {/* Primary Views (Home & Daily Call) */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("Overview")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              activeTab === "Overview"
                ? "bg-blue-50/80 text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Home className={`w-4 h-4 ${activeTab === "Overview" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Home</span>
          </button>

          <button
            onClick={() => setIsDailyCallActive(!isDailyCallActive)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              isDailyCallActive
                ? "bg-rose-50 text-rose-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <PhoneCall className={`w-4 h-4 ${isDailyCallActive ? "text-rose-600 animate-pulse" : "text-slate-400"}`} />
              <span>Daily Call</span>
            </div>
            {isDailyCallActive && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        {/* WORKSPACE Menu */}
        <div>
          <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            WORKSPACE
          </p>
          <nav className="space-y-0.5">
            {workspaceNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50/80 text-blue-700 font-bold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* VENTURES Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              VENTURES
            </span>
            <button
              onClick={onOpenCreateVenture}
              className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50 flex items-center gap-1 text-[11px] font-bold"
              title="Add New Startup"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {ventures.map((venture) => {
              const isSelected = activeVentureId === venture.id;
              return (
                <button
                  key={venture.id}
                  onClick={() => setActiveVentureId(venture.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${venture.dot || "bg-blue-600"}`} />
                    <span className="truncate">{venture.name}</span>
                  </div>
                  {isSelected && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </button>
              );
            })}

            <button
              onClick={onOpenCreateVenture}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50/70 border border-dashed border-blue-200 transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Real Venture</span>
            </button>
          </div>
        </div>

        {/* Real Sprint 2 Widget */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Sprint Progress</span>
            <span className="text-[11px] font-medium text-slate-500">{totalCards} cards</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
            <span>{doneCount} of {totalCards} completed</span>
            <span className="font-bold text-slate-800">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Settings Area */}
      <div className="p-4 border-t border-slate-200/80 space-y-2 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-600">
          <button className="flex items-center gap-2 hover:text-slate-900 transition-colors">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
          <button className="flex items-center gap-2 hover:text-slate-900 transition-colors">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Help & Support</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-2 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <UserButton />
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.fullName || user?.firstName || "Founder"}
              </p>
              <p className="text-[11px] text-slate-500 font-medium capitalize truncate">
                {currentVenture?.name || "Active Workspace"}
              </p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
