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
  ChevronDown,
  Zap
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
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
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
  onOpenSettings,
  onOpenHelp,
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
    <aside className="w-48 bg-white border-r border-slate-200/90 flex flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0">
      {/* Top Brand & Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-none">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 px-1 group py-0.5">
          <img
            src="/founderally-logo.png"
            alt="FounderAlly"
            className="h-7 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Primary Views (Home & Daily Call) */}
        <div className="space-y-0.5">
          <button
            onClick={() => setActiveTab("Overview")}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
              activeTab === "Overview"
                ? "bg-blue-50/80 text-blue-700 shadow-2xs font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Home className={`w-3.5 h-3.5 ${activeTab === "Overview" ? "text-blue-600" : "text-slate-400"}`} />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              const nextState = !isDailyCallActive;
              setIsDailyCallActive(nextState);
              if (nextState) {
                setActiveTab("Board");
              }
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
              isDailyCallActive
                ? "bg-rose-50 text-rose-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PhoneCall className={`w-3.5 h-3.5 ${isDailyCallActive ? "text-rose-600 animate-pulse" : "text-slate-400"}`} />
              <span>Daily Call</span>
            </div>
            {isDailyCallActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>

        {/* WORKSPACE Menu */}
        <div>
          <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
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
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50/80 text-blue-700 font-bold shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
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

        {/* Sleek Minimal Plan Pill */}
        <Link
          href="/pricing"
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 transition-all group border border-slate-200/70"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20 shrink-0" />
            <span className="text-[11px] font-bold text-slate-800">7-Day Trial</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 group-hover:bg-blue-100/80 px-1.5 py-0.5 rounded-md border border-blue-200/80 transition-colors">
            Upgrade
          </span>
        </Link>
      </div>

      {/* Bottom Profile & Settings Area */}
      <div className="p-4 border-t border-slate-200/80 space-y-2 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-600">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
          <button
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
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
