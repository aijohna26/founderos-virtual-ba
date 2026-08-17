"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertOctagon,
  Rocket,
  Plus,
  ChevronRight,
  ShieldAlert,
  Check,
  AlertTriangle,
  Flag,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target
} from "lucide-react";
import { Venture, VentureStore, PriorityItem } from "@/lib/store/ventureStore";

export interface OverviewTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
  setActiveTab: (tab: string) => void;
}

export function OverviewTab({ venture, onUpdateVenture, setActiveTab }: OverviewTabProps) {
  const [newPriorityModal, setNewPriorityModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTag, setNewTag] = useState("Experiment");

  // Calculate real card metrics defensively
  const getColItems = (col: any) => {
    if (!col) return [];
    if (Array.isArray(col)) return col;
    if (Array.isArray(col.items)) return col.items;
    return [];
  };

  const doneItems = getColItems(venture?.columns?.done);
  const inProgressItems = getColItems(venture?.columns?.in_progress);
  const blockedItems = getColItems(venture?.columns?.blocked);
  const todayItems = getColItems(venture?.columns?.today);
  const backlogItems = getColItems(venture?.columns?.backlog);

  const doneCount = doneItems.length;
  const inProgressCount = inProgressItems.length;
  const blockedCount = blockedItems.length;
  const totalCards = doneCount + inProgressCount + blockedCount + todayItems.length + backlogItems.length;

  const progressPercent = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0;
  const velocityScore = Math.max(12, doneCount * 3 + inProgressCount);

  // Compute real top risks from assumptions safely
  const assumptions = Array.isArray(venture?.assumptions) ? venture.assumptions : [];
  const priorities = Array.isArray(venture?.priorities) ? venture.priorities : [];
  const milestones = Array.isArray(venture?.milestones) ? venture.milestones : [];

  const highRisks = assumptions.filter(
    (a) => a.importance === "High" && (a.status === "Untested" || a.status === "Testing")
  );
  const mediumRisks = assumptions.filter(
    (a) => a.importance === "Medium" && a.status === "Untested"
  );
  const supportedCount = assumptions.filter((a) => a.status === "Supported").length;

  // Determine health state
  const isAtRisk = highRisks.length >= 2 || blockedCount > 1;
  const healthStatus = isAtRisk ? "At Risk" : highRisks.length === 1 ? "Needs Validation" : "Healthy";

  const handleAddPriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: PriorityItem = {
      id: "pr-" + Date.now(),
      num: venture.priorities.length + 1,
      title: newTitle.trim(),
      tag: newTag,
      tagColor:
        newTag === "Experiment"
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : newTag === "Research"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : newTag === "Technical"
          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
          : "bg-blue-50 text-blue-700 border-blue-200",
      owner: "YOU",
      priority: "High",
      priorityColor: "text-rose-600 font-bold",
    };

    const updatedVenture = {
      ...venture,
      priorities: [...venture.priorities, newItem],
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setNewTitle("");
    setNewPriorityModal(false);
  };

  const [analyzing, setAnalyzing] = useState(false);

  const handleReAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/generate-venture-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: venture.name,
          tagline: venture.tagline,
          targetCustomer: venture.targetCustomer,
          problemStatement: venture.problemStatement,
          solutionSummary: venture.solutionSummary,
          stage: venture.stage,
        }),
      });

      const data = await res.json();
      const updated: Venture = {
        ...venture,
        columns: data.columns || venture.columns,
        assumptions: data.assumptions || venture.assumptions,
        priorities: data.priorities || venture.priorities,
        milestones: data.milestones || venture.milestones,
        strategy: data.strategy || venture.strategy,
      };

      VentureStore.updateVenture(updated);
      onUpdateVenture(updated);
    } catch (e) {
      console.error("Failed to re-analyze venture:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Sprint Progress Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Sprint summary & progress bar */}
          <div className="lg:w-1/3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-50 text-blue-600">
                  <Target className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Sprint 1</span>
                <span className="text-xs text-slate-400 font-medium">Active Sprint</span>
              </div>

              <button
                onClick={handleReAnalyze}
                disabled={analyzing}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1 transition-all disabled:opacity-50"
                title="Re-run deep AI Business Analyst domain analysis for this startup"
              >
                <Sparkles className={`w-3 h-3 ${analyzing ? "animate-spin" : "text-blue-600"}`} />
                <span>{analyzing ? "Analyzing..." : "AI Re-Sync"}</span>
              </button>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500">Overall progress</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1.5">
                {doneCount} / {totalCards} cards completed
              </p>
            </div>
          </div>

          {/* Right: 4 Stat Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 lg:w-2/3">
            {/* Done */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Done</span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{doneCount}</span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-0.5">
                  <span>Completed tasks</span>
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-blue-500 flex items-center justify-center" />
                <span>In Progress</span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{inProgressCount}</span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mt-0.5">
                  <span>Active work</span>
                </div>
              </div>
            </div>

            {/* Blocked */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Blocked</span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{blockedCount}</span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-0.5">
                  <span>{blockedCount > 0 ? "Requires review" : "No blockers"}</span>
                </div>
              </div>
            </div>

            {/* Velocity */}
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Rocket className="w-4 h-4 text-emerald-500" />
                <span>Velocity</span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900">{velocityScore}</span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-0.5">
                  <span>BA score index</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Today's Priorities & Top Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Priorities Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Today&apos;s Priorities</h3>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {priorities.length} items
              </span>
            </div>

            <div className="space-y-3">
              {priorities.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:shadow-xs transition-all bg-slate-50/30"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200/70 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.num || idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center justify-center">
                      {item.owner || "YOU"}
                    </span>
                    <span className={`text-xs ${item.priorityColor || "text-rose-600 font-bold"}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setNewPriorityModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add priority</span>
            </button>
          </div>
        </div>

        {/* Top Risks Card (From Real Assumptions) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Top Risks & Hypotheses</h3>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {highRisks.length + mediumRisks.length} unvalidated
              </span>
            </div>

            <div className="space-y-3">
              {highRisks.slice(0, 3).map((risk) => (
                <div
                  key={risk.id}
                  onClick={() => setActiveTab("Assumptions")}
                  className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60 transition-all cursor-pointer"
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {risk.statement}
                    </div>
                    <div className="text-xs text-slate-500 font-normal">
                      {risk.evidence || "No customer evidence recorded yet."}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-rose-600">High</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}

              {highRisks.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No high-risk untested assumptions. Click to log new hypotheses.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{assumptions.length} total assumptions recorded</span>
            <button
              onClick={() => setActiveTab("Assumptions")}
              className="font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View register</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Venture Health Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Venture Health Assessment</h3>
            <p className="text-xs text-slate-400">
              Evaluated across {assumptions.length} hypotheses and {totalCards} roadmap items
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-center">
          {/* Status Donut Gauge */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/70">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isAtRisk ? "text-orange-500" : "text-emerald-500"}
                  strokeDasharray={`${Math.max(25, 100 - highRisks.length * 20)}, 100`}
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-900">{healthStatus}</span>
                <span className="text-[9px] text-slate-400">Live Status</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{highRisks.length} high risks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{supportedCount} validated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{blockedCount} blockers</span>
              </div>
            </div>
          </div>

          {/* Key Strengths */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Core Strengths</span>
            </div>
            <ul className="space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Target ICP defined: {venture?.targetCustomer?.slice(0, 32)}...</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Sprint execution: {progressPercent}% of sprint completed</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>AI BA active analysis enabled</span>
              </li>
            </ul>
          </div>

          {/* Key Weaknesses */}
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
              <span>Priority Gaps</span>
            </div>
            <ul className="space-y-2 text-xs font-medium text-slate-700">
              {highRisks.slice(0, 3).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="truncate">{r.statement}</span>
                </li>
              ))}
              {highRisks.length === 0 && (
                <li className="text-xs text-slate-400 italic">No critical gaps recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Upcoming Milestones */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Flag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Upcoming Milestones</h3>
          </div>
          <button
            onClick={() => setActiveTab("Roadmap")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>View Roadmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-bold text-slate-900">{m.title}</div>
                <div className="text-xs text-slate-400 font-medium">{m.date}</div>
              </div>
              <div
                className={`p-2 rounded-xl ${
                  m.color === "purple"
                    ? "bg-purple-50 text-purple-600"
                    : m.color === "amber"
                    ? "bg-amber-50 text-amber-600"
                    : m.color === "emerald"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Flag className="w-4 h-4 fill-current" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Priority Modal */}
      {newPriorityModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddPriority}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Priority for Today</h3>
              <button
                type="button"
                onClick={() => setNewPriorityModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Task Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Run 5 pricing willingness tests"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Category Tag</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="Experiment">Experiment</option>
                  <option value="Research">Research</option>
                  <option value="Feature">Feature</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewPriorityModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                Add Priority
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
