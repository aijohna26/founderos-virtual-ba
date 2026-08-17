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
  AlertCircle,
  GripVertical,
  Trash2,
  AlignLeft,
  CheckSquare,
  Lightbulb,
  X,
  History,
  Zap,
  CheckCircle2
} from "lucide-react";
import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";
import { CardDetailModal } from "@/components/dashboard/CardDetailModal";
import { CompleteSprintModal } from "@/components/dashboard/CompleteSprintModal";

export interface BoardTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function BoardTab({ venture, onUpdateVenture }: BoardTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<{ card: KanbanCard; colKey: keyof Venture["columns"] } | null>(null);
  const [quickAddCol, setQuickAddCol] = useState<keyof Venture["columns"] | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [draggedCard, setDraggedCard] = useState<{ id: string; fromCol: keyof Venture["columns"] } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<keyof Venture["columns"] | null>(null);
  const [completeSprintOpen, setCompleteSprintOpen] = useState(false);
  const [sprintHistoryOpen, setSprintHistoryOpen] = useState(true);
  const [expandedSprintNum, setExpandedSprintNum] = useState<number | null>(null);

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

  const handleQuickAdd = (colKey: keyof Venture["columns"]) => {
    if (!quickAddTitle.trim()) {
      setQuickAddCol(null);
      return;
    }

    const newCard: KanbanCard = {
      id: "c-" + Date.now(),
      title: quickAddTitle.trim(),
      category: "Feature",
      owner: "YOU",
      priority: "Medium",
    };

    const updatedVenture: Venture = {
      ...venture,
      columns: {
        ...venture.columns,
        [colKey]: {
          ...venture.columns[colKey],
          items: [...(venture.columns[colKey]?.items || []), newCard],
        },
      },
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setQuickAddTitle("");
    setQuickAddCol(colKey); // keep open for rapid entry like Trello
  };

  const handleMoveCard = (
    fromCol: keyof Venture["columns"],
    toCol: keyof Venture["columns"],
    cardId: string
  ) => {
    if (fromCol === toCol) return;
    const card = venture.columns[fromCol]?.items?.find((c) => c.id === cardId);
    if (!card) return;

    const updatedFrom = (venture.columns[fromCol]?.items || []).filter((c) => c.id !== cardId);
    const updatedTo = [...(venture.columns[toCol]?.items || []), { ...card, completed: toCol === "done" }];

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

  const handleDeleteCard = (cardId: string, colKey: keyof Venture["columns"]) => {
    const updatedCol = (venture.columns[colKey]?.items || []).filter((c) => c.id !== cardId);
    const updatedVenture: Venture = {
      ...venture,
      columns: {
        ...venture.columns,
        [colKey]: { ...venture.columns[colKey], items: updatedCol },
      },
    };
    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
  };

  const handleUpdateCard = (updatedCard: KanbanCard, targetCol?: keyof Venture["columns"]) => {
    if (!selectedCard) return;
    const fromCol = selectedCard.colKey;
    const toCol = targetCol || fromCol;

    if (fromCol === toCol) {
      const updatedList = (venture.columns[fromCol]?.items || []).map((c) =>
        c.id === updatedCard.id ? updatedCard : c
      );
      const updatedVenture: Venture = {
        ...venture,
        columns: {
          ...venture.columns,
          [fromCol]: { ...venture.columns[fromCol], items: updatedList },
        },
      };
      VentureStore.updateVenture(updatedVenture);
      onUpdateVenture(updatedVenture);
    } else {
      const updatedFrom = (venture.columns[fromCol]?.items || []).filter((c) => c.id !== updatedCard.id);
      const updatedTo = [...(venture.columns[toCol]?.items || []), updatedCard];
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
    }

    setSelectedCard({ card: updatedCard, colKey: toCol });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: string, fromCol: keyof Venture["columns"]) => {
    setDraggedCard({ id: cardId, fromCol });
    e.dataTransfer.setData("text/plain", JSON.stringify({ cardId, fromCol }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colKey: keyof Venture["columns"]) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colKey) {
      setDragOverCol(colKey);
    }
  };

  const handleDrop = (e: React.DragEvent, toCol: keyof Venture["columns"]) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedCard) return;

    if (draggedCard.fromCol !== toCol) {
      handleMoveCard(draggedCard.fromCol, toCol, draggedCard.id);
    }
    setDraggedCard(null);
  };

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10 select-none">
      {/* 1. Board Top Toolbar (Sprint Controls & Search) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sprint Active Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200/80">
              <Zap className="w-3.5 h-3.5 text-blue-600 fill-blue-600/30" />
              <span>Sprint {venture.currentSprint || 1} (Active)</span>
            </div>

            {/* Complete Sprint Action */}
            <button
              onClick={() => setCompleteSprintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Complete Sprint</span>
            </button>

            {/* Sprint History Button */}
            {venture.sprintHistory && venture.sprintHistory.length > 0 && (
              <button
                onClick={() => setSprintHistoryOpen(!sprintHistoryOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                  sprintHistoryOpen
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <History className="w-3.5 h-3.5 text-purple-600" />
                <span>Sprint History ({venture.sprintHistory.length})</span>
              </button>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or filter cards..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAddCol("today")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>
        </div>

        {/* Sprint History Expandable Log */}
        {sprintHistoryOpen && venture.sprintHistory && venture.sprintHistory.length > 0 && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Sprint Retrospective & Velocity Log
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {venture.sprintHistory.length} completed cycles
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1">
                    <th className="py-2 pr-4">Sprint</th>
                    <th className="py-2 pr-4">Completed Date</th>
                    <th className="py-2 pr-4">Taken</th>
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Outstanding</th>
                    <th className="py-2 pr-4">Blocked</th>
                    <th className="py-2 pr-4">Completion Rate</th>
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
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
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
          </div>
        )}
      </div>

      {/* 2. Kanban Columns Grid with Drag & Drop (Trello Style Horizontal Scroll) */}
      <div className="flex items-start gap-4 overflow-x-auto pb-6 pr-8 scrollbar-thin">
        {(
          Object.entries(columns) as [
            keyof Venture["columns"],
            { name: string; items: KanbanCard[] }
          ][]
        ).map(([colKey, col]) => {
          const colItems = getColItems(col);
          const filteredItems = colItems.filter((item: KanbanCard) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const isOver = dragOverCol === colKey;
          const colDisplayName = (col?.name || colKey).replace(/_/g, " ").toUpperCase();
          const isQuickAdding = quickAddCol === colKey;

          return (
            <div
              key={colKey}
              onDragOver={(e) => handleDragOver(e, colKey)}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, colKey)}
              className={`w-[275px] min-w-[275px] max-w-[275px] flex-none rounded-3xl p-3.5 border transition-all duration-200 flex flex-col min-h-[540px] ${
                isOver
                  ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 scale-[1.01]"
                  : "bg-slate-100/70 border-slate-200/80"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <span className="text-xs font-black tracking-wider text-slate-700 truncate">
                    {colDisplayName}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-200/90 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {colItems.length}
                  </span>
                </div>

                <button
                  onClick={() => setQuickAddCol(isQuickAdding ? null : colKey)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                  title="Add Card to this list"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1">
                {filteredItems.map((item: KanbanCard) => {
                  const checklistTotal = item.checklists?.length || 0;
                  const checklistDone = item.checklists?.filter((c) => c.done).length || 0;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id, colKey)}
                      onDragEnd={() => {
                        setDraggedCard(null);
                        setDragOverCol(null);
                      }}
                      onClick={() => setSelectedCard({ card: item, colKey })}
                      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between min-h-[124px] group relative cursor-pointer hover:-translate-y-0.5 min-w-0 w-full"
                    >
                      {/* Top Label & Priority */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border truncate max-w-[100px] ${getTagBadgeStyle(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {item.priority && (
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                item.priority === "High"
                                  ? "text-rose-600 bg-rose-50 border border-rose-100"
                                  : "text-amber-600 bg-amber-50 border border-amber-100"
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 opacity-60" />
                        </div>
                      </div>

                      {/* Card Title with clean vertical spacing */}
                      <div className="text-xs font-bold text-slate-900 leading-snug py-2 break-words line-clamp-3 min-w-0">
                        {item.title}
                      </div>

                      {/* Trello Badges Row (Description, Checklist, Assumption, Progress) */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/70 text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                          {item.description && (
                            <div className="flex items-center gap-0.5" title="Has description">
                              <AlignLeft className="w-3 h-3 text-slate-400" />
                            </div>
                          )}

                          {checklistTotal > 0 && (
                            <div
                              className={`flex items-center gap-1 px-1.5 py-0.2 rounded-md ${
                                checklistDone === checklistTotal
                                  ? "bg-emerald-50 text-emerald-700 font-bold"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                              title={`Checklist: ${checklistDone}/${checklistTotal}`}
                            >
                              <CheckSquare className="w-2.5 h-2.5" />
                              <span>
                                {checklistDone}/{checklistTotal}
                              </span>
                            </div>
                          )}

                          {item.linkedAssumptionId && (
                            <div
                              className="flex items-center gap-0.5 text-amber-600"
                              title="Linked to Venture Assumption"
                            >
                              <Lightbulb className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Assignee Avatar / Completed Badge */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {item.completed && (
                            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          {item.owner && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] border border-slate-200">
                              {item.owner}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Inline Quick Add Card Composer (Trello Style) */}
                {isQuickAdding && (
                  <div className="p-2.5 bg-white rounded-2xl border-2 border-blue-500 shadow-md space-y-2 animate-in fade-in zoom-in-95">
                    <textarea
                      autoFocus
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleQuickAdd(colKey);
                        }
                      }}
                      placeholder="Enter a title for this card..."
                      className="w-full text-xs font-semibold text-slate-900 border-none focus:outline-none resize-none h-16 p-1 placeholder:text-slate-400"
                    />
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleQuickAdd(colKey)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
                      >
                        Add card
                      </button>
                      <button
                        onClick={() => setQuickAddCol(null)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Card Button at Bottom of Column (Trello style) */}
              {!isQuickAdding && (
                <button
                  onClick={() => {
                    setQuickAddTitle("");
                    setQuickAddCol(colKey);
                  }}
                  className="w-full py-2 px-2 text-left text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-2xl transition-colors flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add a card</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Trello Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard.card}
          columnKey={selectedCard.colKey}
          venture={venture}
          isOpen={true}
          onClose={() => setSelectedCard(null)}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
        />
      )}

      {/* 4. Complete Sprint Modal */}
      <CompleteSprintModal
        isOpen={completeSprintOpen}
        onClose={() => setCompleteSprintOpen(false)}
        venture={venture}
        onUpdateVenture={onUpdateVenture}
      />
    </div>
  );
}
