"use client";

import React from "react";
import {
  Milestone,
  CheckCircle2,
  Clock,
  Calendar,
  Flag,
  Target,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Venture } from "@/lib/store/ventureStore";

export interface RoadmapTabProps {
  venture: Venture;
}

export function RoadmapTab({ venture }: RoadmapTabProps) {
  const milestones = venture.milestones || [
    { id: "m1", title: "Problem Validation with 10 Target Users", date: "Sprint 1", color: "purple", completed: true },
    { id: "m2", title: "Interactive MVP Demo Release", date: "Sprint 3", color: "amber", completed: false },
    { id: "m3", title: "First 5 Paid Pilot Commitments", date: "Sprint 6", color: "emerald", completed: false },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Milestone className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Sprint & Strategic Milestone Roadmap</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Timeline targets, sprint checkpoints, and pilot delivery goals for {venture.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
            Current: Sprint 1 (Validation)
          </span>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Flag className="w-4 h-4 text-purple-600" />
          <span>Venture Milestone Track</span>
        </h3>

        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-2">
          {milestones.map((m, i) => (
            <div key={m.id || i} className="relative pl-6 group">
              {/* Dot */}
              <div
                className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  m.completed ? "bg-emerald-500" : "bg-purple-600"
                }`}
              />

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 hover:bg-slate-100/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                      {m.date}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {m.completed
                      ? "Milestone completed and signed off by AI BA."
                      : "Target delivery milestone in active planning."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      m.completed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {m.completed ? "Completed" : "In Flight"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
