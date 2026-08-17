"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  X,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { Venture, VentureStore, SprintRecord, KanbanCard } from "@/lib/store/ventureStore";

export interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function CompleteSprintModal({
  isOpen,
  onClose,
  venture,
  onUpdateVenture,
}: CompleteSprintModalProps) {
  const currentSprintNum = venture.currentSprint || 1;
  const nextSprintNum = currentSprintNum + 1;

  const doneCards = venture.columns?.done?.items || [];
  const inProgressCards = venture.columns?.in_progress?.items || [];
  const todayCards = venture.columns?.today?.items || [];
  const backlogCards = venture.columns?.backlog?.items || [];
  const blockedCards = venture.columns?.blocked?.items || [];

  const completedCount = doneCards.length;
  const blockedCount = blockedCards.length;
  const outstandingCount = inProgressCards.length + todayCards.length + blockedCards.length;
  const totalTaken = completedCount + outstandingCount;
  const completionRate = totalTaken > 0 ? Math.round((completedCount / totalTaken) * 100) : 0;

  const [carryOverDestination, setCarryOverDestination] = useState<"next_sprint" | "backlog">("next_sprint");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCompleteSprint = () => {
    setIsSubmitting(true);

    const newRecord: SprintRecord = {
      sprintNumber: currentSprintNum,
      startDate: venture.sprintStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      totalTaken,
      completed: completedCount,
      outstanding: outstandingCount,
      blocked: blockedCount,
      completionRate,
      completedCards: [...doneCards],
    };

    const existingHistory = venture.sprintHistory || [];
    const updatedHistory = [newRecord, ...existingHistory];

    let updatedColumns = { ...venture.columns };

    if (carryOverDestination === "next_sprint") {
      // Keep today / in_progress in place for Sprint N+1, clear Done
      updatedColumns = {
        ...updatedColumns,
        done: { ...updatedColumns.done, items: [] },
      };
    } else {
      // Move in_progress & today back to backlog, clear Done
      const returnedToBacklog = [
        ...backlogCards,
        ...todayCards,
        ...inProgressCards,
        ...blockedCards,
      ];
      updatedColumns = {
        backlog: { ...updatedColumns.backlog, items: returnedToBacklog },
        today: { ...updatedColumns.today, items: [] },
        in_progress: { ...updatedColumns.in_progress, items: [] },
        blocked: { ...updatedColumns.blocked, items: [] },
        done: { ...updatedColumns.done, items: [] },
      };
    }

    const updatedVenture: Venture = {
      ...venture,
      currentSprint: nextSprintNum,
      sprintStartDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sprintHistory: updatedHistory,
      columns: updatedColumns,
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Complete & End Sprint {currentSprintNum}
              </h3>
              <p className="text-xs text-slate-500">
                Record sprint velocity, archive completed work, and roll over tickets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sprint Performance Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taken</div>
            <div className="text-xl font-black text-slate-900">{totalTaken}</div>
            <div className="text-[10px] text-slate-500 font-medium">Total tickets</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-0.5">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Completed</div>
            <div className="text-xl font-black text-emerald-700">{completedCount}</div>
            <div className="text-[10px] text-emerald-600 font-medium">Done column</div>
          </div>

          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/80 space-y-0.5">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Outstanding</div>
            <div className="text-xl font-black text-blue-700">{outstandingCount}</div>
            <div className="text-[10px] text-blue-600 font-medium">Incomplete</div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-0.5">
            <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Blocked</div>
            <div className="text-xl font-black text-rose-700">{blockedCount}</div>
            <div className="text-[10px] text-rose-600 font-medium">Blockers</div>
          </div>
        </div>

        {/* Completion Rate Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Sprint Delivery Velocity</span>
          </div>
          <span className="text-sm font-black text-emerald-400">{completionRate}% Completion Rate</span>
        </div>

        {/* Carry-Over Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            What to do with {outstandingCount} outstanding tickets?
          </label>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setCarryOverDestination("next_sprint")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                carryOverDestination === "next_sprint"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="p-1.5 rounded-xl bg-blue-100 text-blue-700 mt-0.5">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Carry over to Sprint {nextSprintNum} (Recommended)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Keep in-progress and priority tasks active for the next sprint cycle.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCarryOverDestination("backlog")}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                carryOverDestination === "backlog"
                  ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Move outstanding back to Backlog
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Clear the board and re-prioritize from the backlog.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteSprint}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Complete Sprint & Start Sprint {nextSprintNum}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
