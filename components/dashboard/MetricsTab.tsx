"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  DollarSign,
  Users,
  ChevronDown,
  CheckSquare
} from "lucide-react";
import { Venture, KanbanCard } from "@/lib/store/ventureStore";

export interface MetricsTabProps {
  venture: Venture;
}

export function MetricsTab({ venture }: MetricsTabProps) {
  const [expandedSprintNum, setExpandedSprintNum] = useState<number | null>(null);

  const getTagBadgeStyle = (category?: KanbanCard["category"]) => {
    switch (category) {
      case "Feature":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Growth":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Experiment":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Research":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Technical":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };
  // Aggregate real stats from venture
  const doneCount = venture.columns?.done?.items?.length || 0;
  const inProgressCount = venture.columns?.in_progress?.items?.length || 0;
  const todayCount = venture.columns?.today?.items?.length || 0;
  const backlogCount = venture.columns?.backlog?.items?.length || 0;
  const blockedCount = venture.columns?.blocked?.items?.length || 0;
  const totalCards = doneCount + inProgressCount + todayCount + backlogCount + blockedCount;

  const sprintProgress = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0;

  const totalAssumptions = venture.assumptions?.length || 0;
  const validatedAssumptions =
    venture.assumptions?.filter((a) => a.status === "Supported").length || 0;
  const untestedAssumptions =
    venture.assumptions?.filter((a) => a.status === "Untested").length || 0;
  const validationRate =
    totalAssumptions > 0 ? Math.round((validatedAssumptions / totalAssumptions) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Venture Analytics & KPI Metrics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery velocity, hypothesis validation rates, and unit health for {venture.name}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Health Score: 94/100 (Optimal)</span>
          </div>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sprint Completion */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Sprint Completion</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{sprintProgress}%</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center">
              <ArrowUpRight className="w-3 h-3" />
              {doneCount}/{totalCards} tasks
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${sprintProgress}%` }} />
          </div>
        </div>

        {/* Hypothesis Validation */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Hypothesis Validation</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{validationRate}%</span>
            <span className="text-xs text-slate-500 font-semibold">
              {validatedAssumptions} supported / {untestedAssumptions} untested
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${validationRate}%` }} />
          </div>
        </div>

        {/* Active Sprint Velocity */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>BA Velocity Index</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">14.2</span>
            <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              High Pace
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Points shipped per working sprint</p>
        </div>

        {/* Risk & Blocker Index */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Blockers</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{blockedCount}</span>
            <span className={`text-xs font-bold ${blockedCount === 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {blockedCount === 0 ? "Clean runway" : "Needs attention"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">{inProgressCount} tasks in active execution</p>
        </div>
      </div>

      {/* 3. Market TAM/SAM/SOM vs Validation Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Opportunity Funnel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Target Market Economics</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">Estimated Sizing</span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Total Addressable Market (TAM)</div>
                <div className="text-[11px] text-slate-500 font-medium">{venture.strategy?.tam || "$1.2B Global Market"}</div>
              </div>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                100%
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Serviceable Addressable Market (SAM)</div>
                <div className="text-[11px] text-slate-500 font-medium">{venture.strategy?.sam || "$250M Target Sector"}</div>
              </div>
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                21%
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Year 1 Obtainable (SOM)</div>
                <div className="text-[11px] text-slate-500 font-medium">{venture.strategy?.som || "$500K Early Adopters"}</div>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                Year 1 Target
              </span>
            </div>
          </div>
        </div>

        {/* Customer Discovery & Validation Health */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Customer Discovery Funnel</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-1 border-b border-slate-100">
              <span>Discovery Metric</span>
              <span>Status</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>ICP Prospect Interviews</span>
              <span className="font-bold text-slate-900">5 / 10 Completed</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Problem Severity Confirmation</span>
              <span className="font-bold text-emerald-600">80% Positive Pain Match</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Willingness-to-Pay Signal</span>
              <span className="font-bold text-amber-600">Under Review</span>
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>Prototype Demo Conversion Rate</span>
              <span className="font-bold text-blue-600">Scheduled for Sprint 2</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sprint Performance History & Retrospective Log */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sprint Performance & Retrospective Log</h3>
              <p className="text-xs text-slate-500">
                Historical track record of tickets taken, completed, outstanding, and blocked per sprint cycle.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Active: Sprint {venture.currentSprint || 1}
          </span>
        </div>

        {venture.sprintHistory && venture.sprintHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-2">
                  <th className="py-2.5 pr-4">Sprint</th>
                  <th className="py-2.5 pr-4">Completed Date</th>
                  <th className="py-2.5 pr-4">Total Taken</th>
                  <th className="py-2.5 pr-4">Completed (Done)</th>
                  <th className="py-2.5 pr-4">Outstanding (Carried Over)</th>
                  <th className="py-2.5 pr-4">Blocked</th>
                  <th className="py-2.5 pr-4">Completion Rate</th>
                  <th className="py-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {venture.sprintHistory.map((sprint) => {
                  const isExpanded = expandedSprintNum === sprint.sprintNumber;
                  return (
                    <React.Fragment key={sprint.sprintNumber}>
                      <tr
                        onClick={() =>
                          setExpandedSprintNum(isExpanded ? null : sprint.sprintNumber)
                        }
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3 pr-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isExpanded ? "rotate-180 text-blue-600" : ""
                            }`}
                          />
                          <span>Sprint {sprint.sprintNumber}</span>
                        </td>
                        <td className="py-3 pr-4 text-slate-500">{sprint.completedDate}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-700">{sprint.totalTaken} cards</td>
                        <td className="py-3 pr-4 font-bold text-emerald-600">✓ {sprint.completed}</td>
                        <td className="py-3 pr-4 font-semibold text-blue-600">→ {sprint.outstanding}</td>
                        <td className="py-3 pr-4 font-semibold text-rose-600">! {sprint.blocked}</td>
                        <td className="py-3 pr-4 font-black text-slate-900">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                            {sprint.completionRate}%
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-[11px] font-bold text-blue-600 hover:underline">
                            {isExpanded ? "Hide Tickets" : "View Tickets"}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Completed Tickets Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <div className="p-4 bg-slate-50/90 rounded-2xl m-2 border border-slate-200/80 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Tickets Completed in Sprint {sprint.sprintNumber} ({sprint.completed})
                                  </span>
                                </div>
                                <span className="text-[11px] font-medium text-slate-500">
                                  Finished on {sprint.completedDate}
                                </span>
                              </div>

                              {sprint.completedCards && sprint.completedCards.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {sprint.completedCards.map((card) => (
                                    <div
                                      key={card.id}
                                      className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${getTagBadgeStyle(
                                            card.category
                                          )}`}
                                        >
                                          {card.category}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                          {card.owner || "YOU"}
                                        </span>
                                      </div>

                                      <p className="text-xs font-bold text-slate-900 leading-snug">
                                        {card.title}
                                      </p>

                                      {card.description && (
                                        <p className="text-[11px] text-slate-500 line-clamp-2">
                                          {card.description}
                                        </p>
                                      )}

                                      {card.checklists && card.checklists.length > 0 && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-100">
                                          <CheckSquare className="w-3 h-3 text-emerald-600" />
                                          <span>
                                            {card.checklists.filter((c) => c.done).length} of{" "}
                                            {card.checklists.length} criteria met
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600 font-medium">
                                  {sprint.completed} ticket(s) completed and archived during Sprint {sprint.sprintNumber}.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-1 text-xs">
            <p className="font-bold text-slate-800">Sprint 1 is currently active!</p>
            <p className="text-slate-500">
              When you finish this cycle, click &quot;Complete Sprint&quot; on the Kanban board to log metrics and start Sprint 2.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
