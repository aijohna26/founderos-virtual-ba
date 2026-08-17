"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ArrowRight,
  TrendingUp,
  History,
  Check,
  Plus,
  Flame,
  Calendar
} from "lucide-react";
import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";

export interface RetroTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
  setActiveTab: (tab: string) => void;
}

export function RetroTab({ venture, onUpdateVenture, setActiveTab }: RetroTabProps) {
  const [activeTabSub, setActiveTabSub] = useState<"current" | "history">("current");
  const [learningInput, setLearningInput] = useState("");
  const [addedSuccess, setAddedSuccess] = useState(false);

  const getColItems = (col: any): KanbanCard[] => {
    if (!col) return [];
    if (Array.isArray(col)) return col;
    if (Array.isArray(col.items)) return col.items;
    return [];
  };

  const doneCards = getColItems(venture?.columns?.done);
  const inProgressCards = getColItems(venture?.columns?.in_progress);
  const todayCards = getColItems(venture?.columns?.today);
  const blockedCards = getColItems(venture?.columns?.blocked);
  const backlogCards = getColItems(venture?.columns?.backlog);

  const totalTaken = doneCards.length + inProgressCards.length + todayCards.length + blockedCards.length;
  const completionRate = totalTaken > 0 ? Math.round((doneCards.length / totalTaken) * 100) : 0;
  const currentSprintNum = venture.currentSprint || 1;

  const handleAddLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!learningInput.trim()) return;

    // Save as structured memory
    const updatedHistory = venture.chatHistory || [];
    const newMsg = {
      id: "learning-" + Date.now(),
      sender: "ai" as const,
      text: `Sprint ${currentSprintNum} Learning Logged: "${learningInput.trim()}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = {
      ...venture,
      chatHistory: [...updatedHistory, newMsg],
    };

    VentureStore.updateVenture(updated);
    onUpdateVenture(updated);
    setLearningInput("");
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sprint {currentSprintNum} Retrospective</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sprint Retrospective & Learnings
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Analyze what your sprint accomplished, diagnose bottlenecks and carried-over tickets, and record compounding business learnings for your AI Business Analyst.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center min-w-[100px]">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">{completionRate}%</div>
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Completion</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 text-center min-w-[100px]">
              <div className="text-2xl sm:text-3xl font-black text-white">{doneCards.length}</div>
              <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Tickets Done</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sprint Outcome Breakdown (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Completed Work */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>What Went Well ({doneCards.length})</span>
            </div>
          </div>
          {doneCards.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No tickets finished in this sprint yet.</p>
          ) : (
            <div className="space-y-2">
              {doneCards.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs font-medium text-emerald-950 flex items-center justify-between">
                  <span className="truncate pr-2 font-semibold">{c.title}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 shrink-0">
                    Done
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Unfinished / Carried Over Work */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Carried Over ({inProgressCards.length + todayCards.length})</span>
            </div>
          </div>
          {[...todayCards, ...inProgressCards].length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">Zero carried-over work!</p>
          ) : (
            <div className="space-y-2">
              {[...todayCards, ...inProgressCards].map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs font-medium text-amber-950 flex items-center justify-between">
                  <span className="truncate pr-2 font-semibold">{c.title}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 shrink-0">
                    In Progress
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Blockers & Friction */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Friction & Blockers ({blockedCards.length})</span>
            </div>
          </div>
          {blockedCards.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No active blockers recorded.</p>
          ) : (
            <div className="space-y-2">
              {blockedCards.map((c) => (
                <div key={c.id} className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-950 flex items-center justify-between">
                  <span className="truncate pr-2 font-bold">{c.title}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 shrink-0">
                    Blocked
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Log a Sprint Learning for Sarah's Knowledge Base */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Record a Sprint Retrospective Learning
            </h3>
            <p className="text-xs text-slate-500">
              Teach Sarah key insights from this sprint (e.g. pricing feedback, development bottlenecks) so she factors them into future standups.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddLearning} className="flex gap-2">
          <input
            type="text"
            value={learningInput}
            onChange={(e) => setLearningInput(e.target.value)}
            placeholder="e.g. Solo founders prefer a 1-click standup rather than typing daily notes..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!learningInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Learning</span>
          </button>
        </form>

        {addedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Retrospective learning saved into Sarah&apos;s active memory!</span>
          </div>
        )}
      </div>
    </div>
  );
}
