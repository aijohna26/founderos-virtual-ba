"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Target,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { Venture } from "@/lib/store/ventureStore";

export interface ExperimentsTabProps {
  venture: Venture;
  onUpdateVenture?: (venture: Venture) => void;
}

export function ExperimentsTab({ venture, onUpdateVenture }: ExperimentsTabProps) {
  const [experiments, setExperiments] = useState([
    {
      id: "exp-1",
      title: "Landing Page Smoke Test & Value Prop Click-Through",
      type: "Smoke Test",
      hypothesis: `Target customers will convert on the value proposition: "${venture.tagline || venture.name}"`,
      metric: "Waitlist Conversion Rate",
      target: "> 12% conversion",
      current: "14.5% (Validated)",
      status: "Validated",
      sampleSize: "120 visitors",
    },
    {
      id: "exp-2",
      title: "5 ICP Discovery Interviews on Core Friction",
      type: "Customer Discovery",
      hypothesis: `Target customer (${venture.targetCustomer || "early adopters"}) experiences severe pain with current alternatives.`,
      metric: "Problem Severity Score (1-5)",
      target: "≥ 4.0 / 5.0 severity",
      current: "4.2 / 5.0 (4 of 5 interviewed)",
      status: "Running",
      sampleSize: "5 interviews",
    },
    {
      id: "exp-3",
      title: "Willingness-to-Pay & Paid Pilot Pre-Commitment",
      type: "Pricing Experiment",
      hypothesis: "Early adopters will commit to a paid pilot at $29/mo or $79/mo during discovery.",
      metric: "Pilot Letters of Intent (LOI)",
      target: "3 LOI commitments",
      current: "1 LOI secured",
      status: "Running",
      sampleSize: "10 prospects",
    },
  ]);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newHypothesis, setNewHypothesis] = useState("");
  const [newMetric, setNewMetric] = useState("");

  const handleAddExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newExp = {
      id: `exp-${Date.now()}`,
      title: newTitle.trim(),
      type: "Validation Test",
      hypothesis: newHypothesis.trim() || "Hypothesis awaiting test parameters.",
      metric: newMetric.trim() || "Conversion metric",
      target: "Statistically significant signal",
      current: "In progress",
      status: "Running",
      sampleSize: "Targeting 20 prospects",
    };

    setExperiments((prev) => [...prev, newExp]);
    setNewTitle("");
    setNewHypothesis("");
    setNewMetric("");
    setNewModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Validation Experiments & Smoke Tests</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Design, run, and score empirical tests for {venture.name} before writing production code.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Experiment</span>
        </button>
      </div>

      {/* Experiment Cards List */}
      <div className="space-y-4">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-purple-100 text-purple-700">
                  {exp.type}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{exp.title}</h3>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                  exp.status === "Validated"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {exp.status === "Validated" ? "✓ Validated" : "⚡ Running"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Hypothesis Tested</span>
                <p className="text-slate-800 font-medium leading-relaxed">{exp.hypothesis}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Metric Target</span>
                <div className="font-bold text-slate-900">{exp.metric}</div>
                <div className="text-purple-700 font-semibold">{exp.target}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Current Result</span>
                <div className="font-bold text-slate-900">{exp.current}</div>
                <div className="text-slate-500 font-medium">{exp.sampleSize}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Experiment Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Validation Experiment</h3>
            <form onSubmit={handleAddExperiment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Experiment Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Waitlist Sign-up Smoke Test"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Core Hypothesis *</label>
                <textarea
                  value={newHypothesis}
                  onChange={(e) => setNewHypothesis(e.target.value)}
                  placeholder="What belief are you testing?"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none h-20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Success Metric Target</label>
                <input
                  type="text"
                  value={newMetric}
                  onChange={(e) => setNewMetric(e.target.value)}
                  placeholder="e.g. > 15% conversion rate"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700"
                >
                  Save Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
