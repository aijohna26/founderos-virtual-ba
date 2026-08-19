"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  PhoneCall,
  LayoutGrid,
  RotateCcw,
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
  X,
  Sparkles,
  LogOut,
  CreditCard
} from "lucide-react";
import { SignOutButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { Venture } from "@/lib/store/ventureStore";
import { SHOW_ADVANCED_FEATURES } from "@/lib/config/featureFlags";

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
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
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
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const { user } = useUser();
  // `has` reflects the active session's real Clerk Billing plan claim -- it replaces a
  // previously hardcoded "Solo Tier Active" label that never actually reflected what the
  // signed-in user was subscribed to.
  const { has } = useAuth();
  const isVenturePro = has?.({ plan: "venture_pro" }) ?? false;
  const isSoloFounder = !isVenturePro && (has?.({ plan: "solo_founder" }) ?? false);
  const planLabel = isVenturePro ? "Venture Pro" : isSoloFounder ? "Solo Founder" : "Free plan";
  const currentVenture = ventures.find((v) => v.id === activeVentureId) || ventures[0];

  // Compute real sprint progress
  const doneCount = currentVenture?.columns?.done?.items?.length || 0;
  const inProgressCount = currentVenture?.columns?.in_progress?.items?.length || 0;
  const todayCount = currentVenture?.columns?.today?.items?.length || 0;
  const backlogCount = currentVenture?.columns?.backlog?.items?.length || 0;
  const blockedCount = currentVenture?.columns?.blocked?.items?.length || 0;
  const totalCards = doneCount + inProgressCount + todayCount + backlogCount + blockedCount;
  const progressPercent = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0;

  // Primary Features: Always visible
  const primaryNav = [
    { id: "Today", name: "Today", icon: Home },
    { id: "Board", name: "Board", icon: LayoutGrid },
    { id: "Standup", name: "Stand-up", icon: PhoneCall },
    { id: "Retrospective", name: "Retrospective", icon: RotateCcw },
    { id: "Documents", name: "Documents", icon: FolderClosed },
  ];

  // Advanced Features: Visible only when SHOW_ADVANCED_FEATURES=true
  const advancedNav = [
    { id: "Strategy", name: "Strategy", icon: Compass },
    { id: "Assumptions", name: "Assumptions", icon: Lightbulb },
    { id: "Requirements", name: "Requirements", icon: FileText },
    { id: "Experiments", name: "Experiments", icon: FlaskConical },
    { id: "Roadmap", name: "Roadmap", icon: Map },
    { id: "Metrics", name: "Metrics", icon: BarChart3 },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onMobileClose?.();
  };

  const handleVentureClick = (ventureId: string) => {
    setActiveVentureId(ventureId);
    onMobileClose?.();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full w-full bg-white select-none">
      {/* Top Brand & Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-none">
        {/* Brand Logo & Mobile Close */}
        <div className="flex items-center justify-between px-1 py-0.5">
          <Link href="/" onClick={() => onMobileClose?.()} className="flex items-center gap-2 group">
            <img
              src="/founderally-logo.png"
              alt="FounderAlly"
              className="h-7 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Primary Workspace Navigation */}
        <div className="space-y-0.5">
          <div className="px-2.5 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              AI Co-Pilot Workspace
            </span>
          </div>

          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === "Today" && activeTab === "Overview");

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-50/80 text-blue-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Advanced Features Navigation (Only if feature flag enabled) */}
        {SHOW_ADVANCED_FEATURES && (
          <div className="space-y-0.5 pt-2 border-t border-slate-100">
            <div className="px-2.5 pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                Advanced Modules
              </span>
            </div>

            {advancedNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/80 text-indigo-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Section 2: Ventures / Projects */}
        <div>
          <div className="flex items-center justify-between px-2.5 pb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Ventures
            </span>
            <button
              onClick={() => {
                onOpenCreateVenture();
                onMobileClose?.();
              }}
              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
              title="Add New Venture"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            {ventures.map((venture) => {
              const isSelected = venture.id === activeVentureId;
              return (
                <button
                  key={venture.id}
                  onClick={() => handleVentureClick(venture.id)}
                  title={`${venture.name} • Standup: ${venture.standupTime || "09:00 AM"}`}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
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
              onClick={() => {
                onOpenCreateVenture();
                onMobileClose?.();
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-blue-300 text-blue-600 bg-blue-50/50 hover:bg-blue-100/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Real Venture</span>
            </button>
          </div>
        </div>

        {/* Section 3: Sprint Progress Box */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Sprint Progress</span>
            <span className="text-[10px] text-slate-500 font-medium">{totalCards} cards</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>{doneCount} of {totalCards} completed</span>
            <span className="font-bold text-slate-700">{progressPercent}%</span>
          </div>
        </div>

        {/* Section 4: Plan status + upgrade CTA, reflecting the real Clerk Billing plan */}
        <Link
          href={isVenturePro ? "/account" : "/pricing"}
          onClick={() => onMobileClose?.()}
          className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 flex flex-col items-center gap-1.5 text-center group hover:border-blue-300 transition-all block"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
              {planLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-medium leading-snug">
              {isVenturePro ? "Manage billing" : "Current plan"}
            </div>
          </div>
          {!isVenturePro && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs uppercase">
              Upgrade
            </span>
          )}
        </Link>
      </div>

      {/* Bottom Profile & Settings Area */}
      <div className="p-4 border-t border-slate-200/80 space-y-2 bg-slate-50/50">
        <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-600">
          <button
            onClick={() => {
              onOpenSettings?.();
              onMobileClose?.();
            }}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
          <Link
            href="/account"
            onClick={() => onMobileClose?.()}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer"
            title="Manage your plan, payment method and invoices"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            <span>Billing</span>
          </Link>
          <button
            onClick={() => {
              onOpenHelp?.();
              onMobileClose?.();
            }}
            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors cursor-pointer"
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
          {user ? (
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                title="Sign out of FounderAlly"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </SignOutButton>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-48 bg-white border-r border-slate-200/90 flex-col justify-between h-screen sticky top-0 select-none z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={onMobileClose}
          />
          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
