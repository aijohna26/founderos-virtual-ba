"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  LayoutGrid,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  PhoneCall,
  Mic,
  Volume2,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react";

export function HeroDashboardPreview() {
  const [activeTab, setActiveTab] = useState<"board" | "health" | "prd">("board");
  const [aiSpoken, setAiSpoken] = useState(false);

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-slate-900/5 p-1.5 sm:p-2.5 backdrop-blur-md border border-slate-200/90 shadow-2xl shadow-blue-900/15">
      {/* Browser Mockup Container */}
      <div className="rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-inner font-sans">
        
        {/* Top Browser Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-slate-500 ml-2 hidden sm:inline">
              app.getfounderally.com/dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Sprint 1 (Active)</span>
            </span>
            <span className="hidden md:inline text-[11px] text-slate-500 font-medium">
              Venture: <strong className="text-slate-800">FounderAlly</strong>
            </span>
          </div>
        </div>

        {/* Dashboard Workspace Layout */}
        <div className="grid grid-cols-12 min-h-[460px] bg-slate-50/50">
          
          {/* Left Mini Sidebar (hidden on extra small screens) */}
          <aside className="col-span-3 lg:col-span-3 bg-white border-r border-slate-200/80 p-3 hidden sm:flex flex-col justify-between">
            <div className="space-y-4">
              {/* Logo */}
              <div className="flex items-center px-1 mb-1">
                <img
                  src="/founderally-logo.png"
                  alt="FounderAlly"
                  className="h-6 w-auto object-contain"
                />
              </div>

              {/* Workspace Navigation */}
              <div className="space-y-1">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                  Workspace
                </p>
                <button
                  onClick={() => setActiveTab("board")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "board"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Kanban Board</span>
                </button>
                <button
                  onClick={() => setActiveTab("health")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "health"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Venture Health</span>
                </button>
                <button
                  onClick={() => setActiveTab("prd")}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === "prd"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Executive PRD</span>
                </button>
              </div>

              {/* Ventures List */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider px-2">
                  Active Ventures
                </p>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 text-slate-900 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="truncate">FounderAlly</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg text-slate-500 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="truncate">PropertyRender</span>
                </div>
              </div>
            </div>

            {/* Daily Call Badge */}
            <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-[10px] space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span>Standup: 09:00 AM</span>
              </div>
              <p className="text-slate-500 text-[9px] leading-tight">
                Daily AI voice debrief scheduled.
              </p>
            </div>
          </aside>

          {/* Center Main Canvas */}
          <main className="col-span-12 sm:col-span-5 lg:col-span-5.5 p-3 sm:p-4 space-y-3 overflow-hidden">
            {/* Canvas Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900">
                  {activeTab === "board" && "Sprint 1 Kanban Execution"}
                  {activeTab === "health" && "Venture Health & Validation Score"}
                  {activeTab === "prd" && "Executive PRD & Functional Specs"}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Autonomous sprint tracking • 12 active tasks
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                ● 87% Health
              </span>
            </div>

            {/* TAB 1: Real Sprint Kanban Board */}
            {activeTab === "board" && (
              <div className="grid grid-cols-2 gap-2.5">
                {/* Column: TODAY */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      TODAY (2)
                    </span>
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>

                  {/* Card 1 */}
                  <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/60 space-y-1.5 hover:shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                        EXPERIMENT
                      </span>
                      <span className="text-[8px] font-black text-rose-600">HIGH</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 leading-snug">
                      5 Customer Problem Interviews on Pricing Willingness
                    </p>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
                      <CheckSquare className="w-2.5 h-2.5 text-emerald-600" />
                      <span>3 of 3 criteria met</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        FEATURE
                      </span>
                      <span className="text-[8px] font-bold text-slate-600">AI ASSIGNED</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 leading-snug">
                      Autonomous Ticket Generation via Gemini
                    </p>
                  </div>
                </div>

                {/* Column: IN PROGRESS / DONE */}
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                      IN PROGRESS (1)
                    </span>
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  </div>

                  {/* In Progress Card */}
                  <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        TECHNICAL
                      </span>
                      <span className="text-[8px] font-black text-purple-700">85% DONE</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 leading-snug">
                      Live Voice Standup Recognition & Audio Synthesis
                    </p>
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full w-[85%]" />
                    </div>
                  </div>

                  {/* Done item preview */}
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-200/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Clerk Authentication & Stripe Billing</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Venture Health Scorecard */}
            {activeTab === "health" && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Health Index</span>
                  <span className="font-black text-emerald-600 text-sm">87 / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[87%]" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px]">
                  <div className="p-1.5 bg-slate-50 rounded-lg">
                    <div className="font-bold text-emerald-600">3 Validated</div>
                    <div className="text-slate-400">Assumptions</div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded-lg">
                    <div className="font-bold text-amber-600">1 Testing</div>
                    <div className="text-slate-400">Hypothesis</div>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded-lg">
                    <div className="font-bold text-blue-600">0 Blockers</div>
                    <div className="text-slate-400">Active Sprint</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRD Specs Preview */}
            {activeTab === "prd" && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                <div className="font-bold text-slate-900 text-[11px]"># EPIC-1: 2-Way Voice Standup</div>
                <p className="text-[10px] text-slate-600 leading-relaxed font-sans">
                  FR-1: System initiates daily standup call at configured venture time (09:00 AM).
                  FR-2: Gemini analyzes live board and speaks highest-risk priorities out loud.
                </p>
                <div className="text-[9px] text-blue-600 font-bold font-sans">✓ Exported to Jira / Markdown</div>
              </div>
            )}

            {/* Bottom Quick Metric Bar */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/60 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-slate-900">Sprint 1 Velocity:</span>
                <span className="text-slate-600">10 of 12 cards on track</span>
              </div>
              <span className="font-bold text-blue-600 hover:underline cursor-pointer">
                View Retrospective →
              </span>
            </div>
          </main>

          {/* Right AI Business Analyst Co-Pilot Panel */}
          <aside className="col-span-12 sm:col-span-4 lg:col-span-3.5 bg-white border-l border-slate-200/80 p-3 flex flex-col justify-between space-y-3">
            {/* Top AI Avatar & Voice Ring */}
            <div className="flex flex-col items-center text-center pt-1 space-y-1.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 shadow-md">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-slate-100">
                    <Image
                      src="/advisors/maya-chen-front.png"
                      alt="Maya Chen, AI business advisor"
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-900">AI Business Analyst</h4>
                <p className="text-[10px] text-slate-500 font-medium">Powered by Google Gemini</p>
              </div>

              {/* Audio Controls Mock */}
              <div className="flex items-center gap-2 pt-1">
                <span className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                  <Mic className="w-3 h-3" />
                </span>
                <button
                  onClick={() => setAiSpoken(!aiSpoken)}
                  className="p-2 rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
                  title="Daily Standup Call"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                </button>
                <span className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                  <Volume2 className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Spoken AI Message Bubble */}
            <div className="p-2.5 rounded-2xl bg-blue-50/90 border border-blue-200/70 text-[10px] text-slate-800 space-y-1 leading-relaxed">
              <div className="flex items-center justify-between text-[9px] font-bold text-blue-700 uppercase">
                <span>Maya (AI BA)</span>
                <span className="text-[8px] text-slate-400">09:00 AM</span>
              </div>
              <p className="font-medium">
                &quot;Good morning! I&apos;ve reviewed your active Kanban cards. Our #1 priority today is validating pricing with 5 design studios. I&apos;ve added the test card to Today&apos;s sprint.&quot;
              </p>
            </div>

            {/* Quick Action Button */}
            <button className="w-full py-1.5 px-2 rounded-xl bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 shadow-sm hover:bg-slate-800 transition-colors">
              <Sparkles className="w-3 h-3 text-blue-400" />
              <span>Walk Through Board Cards</span>
            </button>
          </aside>

        </div>
      </div>
    </div>
  );
}
