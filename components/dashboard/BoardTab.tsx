"use client";

import React, { useState } from "react";
import {
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
  ChevronDown,
  MoreHorizontal,
  Check,
  Flag,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";

export interface BoardTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function BoardTab({ venture, onUpdateVenture }: BoardTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addCardColumn, setAddCardColumn] = useState<keyof Venture["columns"] | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardCategory, setNewCardCategory] = useState<KanbanCard["category"]>("Feature");

  const columns = venture.columns;

  const getTagBadgeStyle = (category: KanbanCard["category"]) => {
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
      case "Design":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Legal":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleAddCard = (colKey: keyof Venture["columns"]) => {
    if (!newCardTitle.trim()) return;

    const newCard: KanbanCard = {
      id: "c-" + Date.now(),
      title: newCardTitle.trim(),
      category: newCardCategory,
      owner: "YOU",
    };

    const updatedVenture: Venture = {
      ...venture,
      columns: {
        ...venture.columns,
        [colKey]: {
          ...venture.columns[colKey],
          items: [...venture.columns[colKey].items, newCard],
        },
      },
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setNewCardTitle("");
    setAddCardColumn(null);
  };

  // Move card to next column
  const handleMoveCard = (
    fromCol: keyof Venture["columns"],
    toCol: keyof Venture["columns"],
    cardId: string
  ) => {
    const card = venture.columns[fromCol].items.find((c) => c.id === cardId);
    if (!card) return;

    const updatedFrom = venture.columns[fromCol].items.filter((c) => c.id !== cardId);
    const updatedTo = [...venture.columns[toCol].items, { ...card, completed: toCol === "done" }];

    const updatedVenture: Venture = {
      ...venture,
      columns: {
        ...venture.columns,
        [fromCol]: { ...venture.columns[fromCol], items: updatedFrom },
        [toCol]: { ...venture.columns[toCol], items: updatedTo },
      },
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
  };

  // Top unvalidated assumption for AI insight
  const topRiskiestAssumption =
    venture.assumptions.find((a) => a.importance === "High" && a.status !== "Supported") ||
    venture.assumptions[0];

  // Calculate metrics defensively
  const getColItems = (col: any) => {
    if (!col) return [];
    if (Array.isArray(col)) return col;
    if (Array.isArray(col.items)) return col.items;
    return [];
  };

  const doneCount = getColItems(venture?.columns?.done).length;
  const inProgressCount = getColItems(venture?.columns?.in_progress).length;
  const blockedCount = getColItems(venture?.columns?.blocked).length;
  const todayCount = getColItems(venture?.columns?.today).length;
  const backlogCount = getColItems(venture?.columns?.backlog).length;
  const totalCards = doneCount + inProgressCount + blockedCount + todayCount + backlogCount;
  const progressPercent = totalCards > 0 ? Math.round((doneCount / totalCards) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Board Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Board View Switcher */}
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50">
            <span>Board View</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Grouping */}
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <span>Group: Sprint</span>
          </button>

          {/* Filter */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter</span>
          </button>

          {/* Sort */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Sort</span>
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddCardColumn("today")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>

          <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors">
            <Sparkles className="w-4 h-4" />
          </button>

          <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {(
          Object.entries(columns) as [
            keyof Venture["columns"],
            { name: string; items: KanbanCard[] }
          ][]
        ).map(([colKey, col]) => {
          const filteredItems = col.items.filter((item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
          );

          return (
            <div
              key={colKey}
              className="bg-slate-50/80 rounded-3xl p-3.5 border border-slate-200/80 flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold tracking-wider text-slate-700">
                    {col.name}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 font-bold text-[11px] flex items-center justify-center">
                    {col.items.length}
                  </span>
                </div>
                <button
                  onClick={() => setAddCardColumn(colKey)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded-sm hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all space-y-3 group relative"
                  >
                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {item.title}
                    </div>

                    {/* Progress bar if present */}
                    {item.progress !== undefined && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-blue-600">
                          <span>{item.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer tags and assignee */}
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getTagBadgeStyle(
                          item.category
                        )}`}
                      >
                        {item.category}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.completed && (
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                        {item.priority && (
                          <span
                            className={`text-[10px] font-bold ${
                              item.priority === "High" ? "text-rose-600" : "text-amber-600"
                            }`}
                          >
                            {item.priority}
                          </span>
                        )}
                        {item.owner && (
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center border border-slate-200">
                            {item.owner}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Move Action Quick Buttons on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      {colKey !== "backlog" && (
                        <button
                          onClick={() => handleMoveCard(colKey, "backlog", item.id)}
                          className="hover:text-blue-600 font-semibold"
                        >
                          ← Backlog
                        </button>
                      )}
                      {colKey !== "today" && (
                        <button
                          onClick={() => handleMoveCard(colKey, "today", item.id)}
                          className="hover:text-blue-600 font-semibold"
                        >
                          Today
                        </button>
                      )}
                      {colKey !== "in_progress" && (
                        <button
                          onClick={() => handleMoveCard(colKey, "in_progress", item.id)}
                          className="hover:text-blue-600 font-semibold"
                        >
                          In Progress
                        </button>
                      )}
                      {colKey !== "done" && (
                        <button
                          onClick={() => handleMoveCard(colKey, "done", item.id)}
                          className="hover:text-emerald-600 font-semibold"
                        >
                          Done ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add card quick button */}
              <div className="mt-3 pt-2">
                <button
                  onClick={() => setAddCardColumn(colKey)}
                  className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors border border-dashed border-slate-200 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add card</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. AI INSIGHT Banner from real venture assumptions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">
              AI INSIGHT FOR {venture.name.toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {topRiskiestAssumption?.statement
                ? `Key Risk: "${topRiskiestAssumption.statement}". De-risk this hypothesis before committing heavy engineering bandwidth.`
                : "Continuous analytical monitoring active. What assumption should we test next?"}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => handleAddCard("today")}
            className="px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all"
          >
            <span>Add Validation Test Card</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Bottom Metric Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sprint Health */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Sprint Health</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {venture.columns.blocked.items.length > 0 ? "Needs Attention" : "Optimal"}
            </div>
            <span className="text-xs text-slate-400">
              {venture.columns.blocked.items.length} blockers
            </span>
          </div>
          <div className="w-16 h-8 text-blue-500">
            <svg viewBox="0 0 50 20" className="w-full h-full stroke-current fill-none stroke-2">
              <path d="M0 10 Q12 18 20 12 T35 5 T50 15" />
            </svg>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Progress</span>
            <div className="text-xl font-black text-slate-900 mt-1">{progressPercent}%</div>
            <span className="text-xs text-slate-400">
              {doneCount} / {totalCards} cards done
            </span>
          </div>
          <div className="w-10 h-10 rounded-full border-4 border-blue-600 border-t-slate-200" />
        </div>

        {/* Top Risk */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Top Hypothesis</span>
            <div className="text-sm font-black text-rose-600 mt-1 truncate max-w-[140px]">
              {topRiskiestAssumption?.category || "Problem"} Risk
            </div>
            <span className="text-xs text-slate-400">{topRiskiestAssumption?.status || "Untested"}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* Next Milestone */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Target Goal</span>
            <div className="text-sm font-black text-slate-900 mt-1 truncate max-w-[140px]">
              {venture.milestones[0]?.title || "MVP Launch"}
            </div>
            <span className="text-xs text-slate-400">{venture.milestones[0]?.date || "Sprint 1"}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <Flag className="w-4 h-4 fill-purple-600" />
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {addCardColumn && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Add Card to {columns[addCardColumn]?.name}
              </h3>
              <button
                onClick={() => setAddCardColumn(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Card Title</label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="e.g., Run 5 pricing user tests"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Category Tag</label>
                <select
                  value={newCardCategory}
                  onChange={(e) => setNewCardCategory(e.target.value as KanbanCard["category"])}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                >
                  <option value="Feature">Feature</option>
                  <option value="Growth">Growth</option>
                  <option value="Experiment">Experiment</option>
                  <option value="Research">Research</option>
                  <option value="Technical">Technical</option>
                  <option value="Design">Design</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddCardColumn(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddCard(addCardColumn)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
