"use client";

import React, { useState } from "react";
import {
  Lightbulb,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Venture, VentureStore, Assumption } from "@/lib/store/ventureStore";

export interface AssumptionsTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function AssumptionsTab({ venture, onUpdateVenture }: AssumptionsTabProps) {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newStatement, setNewStatement] = useState("");
  const [newCategory, setNewCategory] = useState<Assumption["category"]>("Problem");
  const [newImportance, setNewImportance] = useState<Assumption["importance"]>("High");

  const assumptions = venture.assumptions;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatement.trim()) return;

    const newAssump: Assumption = {
      id: "a-" + Date.now(),
      statement: newStatement.trim(),
      category: newCategory,
      importance: newImportance,
      status: "Untested",
      evidence: "Recently logged hypothesis",
      dateAdded: new Date().toISOString().split("T")[0],
    };

    const updatedVenture = {
      ...venture,
      assumptions: [newAssump, ...venture.assumptions],
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setNewStatement("");
    setNewModalOpen(false);
  };

  const handleCycleStatus = (id: string, currentStatus: Assumption["status"]) => {
    const nextStatus: Assumption["status"] =
      currentStatus === "Untested"
        ? "Testing"
        : currentStatus === "Testing"
        ? "Supported"
        : currentStatus === "Supported"
        ? "Rejected"
        : "Untested";

    const updatedAssumptions = venture.assumptions.map((a) =>
      a.id === id ? { ...a, status: nextStatus } : a
    );

    const updatedVenture = {
      ...venture,
      assumptions: updatedAssumptions,
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
  };

  const getStatusBadge = (status: Assumption["status"]) => {
    switch (status) {
      case "Supported":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Testing":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Untested":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Assumptions Register — {venture.name}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track, prioritize, and stress-test risky beliefs before spending engineering bandwidth.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Assumption</span>
        </button>
      </div>

      {/* Assumptions List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            All Hypotheses ({assumptions.length})
          </span>
          <span className="text-xs text-slate-500 font-medium">
            AI BA auto-scores risks during discovery calls
          </span>
        </div>

        <div className="space-y-3">
          {assumptions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all space-y-3 bg-slate-50/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {item.category}
                  </span>
                  <span className="text-sm font-bold text-slate-900 leading-snug">
                    {item.statement}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      item.importance === "High"
                        ? "text-rose-600"
                        : item.importance === "Medium"
                        ? "text-amber-600"
                        : "text-slate-500"
                    }`}
                  >
                    {item.importance} Risk
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <span>
                  <strong>Evidence:</strong> {item.evidence || "No customer evidence recorded yet."}
                </span>
                <button
                  onClick={() => handleCycleStatus(item.id, item.status)}
                  className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Cycle Status ({item.status})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {assumptions.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No assumptions recorded yet for {venture.name}. Click &quot;Add Assumption&quot; to log your first hypothesis.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New Assumption for {venture.name}</h3>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Hypothesis Statement</label>
                <textarea
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  placeholder="e.g. Target users will pay $29/mo for automated invoice reminders"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1 h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Assumption["category"])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs mt-1"
                  >
                    <option value="Market">Market</option>
                    <option value="Problem">Problem</option>
                    <option value="Product">Product</option>
                    <option value="Financial">Financial</option>
                    <option value="Channel">Channel</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Importance</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value as Assumption["importance"])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs mt-1"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                Save Assumption
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
