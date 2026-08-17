"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  UserPlus,
  Bell,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  Check,
  Plus
} from "lucide-react";
import { Venture } from "@/lib/store/ventureStore";

export interface TopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeVenture: Venture;
  ventures: Venture[];
  setActiveVentureId: (id: string) => void;
  onOpenCreateVenture: () => void;
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
}

export function TopHeader({
  activeTab,
  setActiveTab,
  activeVenture,
  ventures,
  setActiveVentureId,
  onOpenCreateVenture,
  isDailyCallActive,
  setIsDailyCallActive,
}: TopHeaderProps) {
  const [ventureMenuOpen, setVentureMenuOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [invited, setInvited] = useState(false);

  const tabs = [
    { id: "Overview", label: "Overview" },
    { id: "Board", label: "Board" },
    { id: "Strategy", label: "Strategy Map" },
    { id: "Assumptions", label: "Assumptions" },
    { id: "Requirements", label: "Requirements" },
    { id: "Experiments", label: "Experiments" },
    { id: "Roadmap", label: "Roadmap" },
    { id: "Metrics", label: "Metrics" },
    { id: "Documents", label: "Documents" },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-6 pt-5 pb-0 shadow-2xs">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        {/* Left: Venture Switcher & Title */}
        <div>
          <div className="relative inline-block">
            <button
              onClick={() => setVentureMenuOpen(!ventureMenuOpen)}
              className="flex items-center gap-2.5 text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors group"
            >
              <span>{activeVenture?.name || "FounderAlly"}</span>
              <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform" />
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeVenture?.status || "Live"}
              </span>
            </button>

            {/* Venture Dropdown Menu */}
            {ventureMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Venture
                  </span>
                  <button
                    onClick={() => {
                      setVentureMenuOpen(false);
                      onOpenCreateVenture();
                    }}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Startup</span>
                  </button>
                </div>

                {ventures.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveVentureId(v.id);
                      setVentureMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      activeVenture.id === v.id ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-sm font-semibold truncate">{v.name}</div>
                      <div className="text-xs text-slate-400 font-normal truncate">{v.tagline}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {v.status}
                    </span>
                  </button>
                ))}

                <div className="pt-2 mt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setVentureMenuOpen(false);
                      onOpenCreateVenture();
                    }}
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Another Venture</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {activeVenture?.tagline || "AI Business Analyst & Venture Co-Pilot"}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Daily Call Action */}
          <button
            onClick={() => setIsDailyCallActive(!isDailyCallActive)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs transition-all shadow-xs ${
              isDailyCallActive
                ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20"
                : "bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 shadow-blue-500/10"
            }`}
          >
            <PhoneCall className={`w-3.5 h-3.5 ${isDailyCallActive ? "animate-bounce" : "text-blue-600"}`} />
            <span>{isDailyCallActive ? "End Daily Call" : "Daily Call"}</span>
          </button>

          {/* Invite Collaborator */}
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Invite</span>
          </button>

          {/* Notification bell */}
          <button className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* More options */}
          <button className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto border-t border-slate-100 scrollbar-none pt-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Invite Co-Founder / Team</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Share this workspace with advisors, investors, or co-founders to review hypotheses & BA reports.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="co-founder@startup.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setInvited(true);
                  setTimeout(() => {
                    setInvited(false);
                    setInviteModalOpen(false);
                  }, 1200);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5"
              >
                {invited ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Invited!</span>
                  </>
                ) : (
                  <span>Send Invite</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
