"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlignLeft,
  CheckSquare,
  Sparkles,
  Calendar,
  Tag,
  User,
  Trash2,
  ArrowRight,
  Plus,
  Lightbulb,
  Check,
  Mic,
  MicOff,
  Radio,
  Loader2
} from "lucide-react";
import { KanbanCard, CardChecklistItem, Venture, VentureStore } from "@/lib/store/ventureStore";
import { VoiceEngine } from "@/lib/voice/voiceEngine";

export interface CardDetailModalProps {
  card: KanbanCard | null;
  columnKey: keyof Venture["columns"] | null;
  venture: Venture;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCard: (updatedCard: KanbanCard, targetColumn?: keyof Venture["columns"]) => void;
  onDeleteCard: (cardId: string, colKey: keyof Venture["columns"]) => void;
}

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
    }
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 underline font-semibold hover:text-blue-800"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

function renderMarkdown(content: string) {
  if (!content) return null;
  const cleaned = content
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const lines = cleaned.split("\n");
  return (
    <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header
        if (trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#")) {
          const headerText = trimmed.replace(/^#+\s*/, "");
          return (
            <h4 key={idx} className="font-extrabold text-blue-900 text-xs mt-3 mb-1 flex items-center gap-1.5 border-b border-blue-100 pb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
              <span>{headerText}</span>
            </h4>
          );
        }

        // Bullet point
        if (trimmed.startsWith("•") || trimmed.startsWith("*") || trimmed.startsWith("-")) {
          const bulletText = trimmed.replace(/^[•*\-]\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span className="flex-1 font-medium text-slate-800 leading-snug">
                {parseInlineFormatting(bulletText)}
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-xs text-slate-700 font-medium leading-relaxed">
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function CardDetailModal({
  card,
  columnKey,
  venture,
  isOpen,
  onClose,
  onUpdateCard,
  onDeleteCard,
}: CardDetailModalProps) {
  if (!isOpen || !card || !columnKey) return null;

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [category, setCategory] = useState<KanbanCard["category"]>(card.category);
  const [priority, setPriority] = useState<KanbanCard["priority"]>(card.priority || "Medium");
  const [owner, setOwner] = useState<string>(card.owner || "YOU");
  const [dueDate, setDueDate] = useState<string>(card.dueDate || "");
  const [checklists, setChecklists] = useState<CardChecklistItem[]>(card.checklists || []);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [targetCol, setTargetCol] = useState<keyof Venture["columns"]>(columnKey);
  const [linkedAssumptionId, setLinkedAssumptionId] = useState<string>(card.linkedAssumptionId || "");

  // Voice Dictation & AI Structuring State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isStructuringVoice, setIsStructuringVoice] = useState(false);

  // Calculate checklist progress
  const totalItems = checklists.length;
  const completedItems = checklists.filter((i) => i.done).length;
  const checklistPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleSaveAll = (overrideCol?: keyof Venture["columns"]) => {
    const updated: KanbanCard = {
      ...card,
      title: title.trim() || card.title,
      description: description.trim(),
      category,
      priority,
      owner,
      dueDate,
      checklists,
      linkedAssumptionId: linkedAssumptionId || undefined,
      progress: totalItems > 0 ? checklistPercent : card.progress,
      completed: (overrideCol || targetCol) === "done",
    };

    onUpdateCard(updated, overrideCol || targetCol);
  };

  const handleToggleChecklist = (id: string) => {
    const updated = checklists.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklists(updated);

    const completed = updated.filter((i) => i.done).length;
    const pct = Math.round((completed / updated.length) * 100);

    const updatedCard: KanbanCard = {
      ...card,
      checklists: updated,
      progress: pct,
    };
    onUpdateCard(updatedCard, targetCol);
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;

    const newItem: CardChecklistItem = {
      id: "chk-" + Date.now(),
      text: newChecklistText.trim(),
      done: false,
    };
    const updated = [...checklists, newItem];
    setChecklists(updated);
    setNewChecklistText("");

    const completed = updated.filter((i) => i.done).length;
    const pct = Math.round((completed / updated.length) * 100);

    const updatedCard: KanbanCard = {
      ...card,
      checklists: updated,
      progress: pct,
    };
    onUpdateCard(updatedCard, targetCol);
  };

  // 🎙️ Voice Dictation Controls
  const startVoiceDictation = () => {
    setVoiceTranscript("");
    setIsRecordingVoice(true);

    VoiceEngine.initRecognition(
      (transcript, isFinal) => {
        setVoiceTranscript(transcript);
      },
      () => {},
      (err) => {
        console.warn("Voice error in modal:", err);
      }
    );

    VoiceEngine.startListening();
  };

  const stopAndStructureVoice = async () => {
    VoiceEngine.stopListening();
    setIsRecordingVoice(false);

    if (!voiceTranscript.trim()) return;

    setIsStructuringVoice(true);
    try {
      const res = await fetch("/api/ai-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `The founder spoke these instructions for the card "${title}": "${voiceTranscript}". Format a complete user story, extract 3-4 distinct testable acceptance criteria with bullet points starting with "•", and explain the context for ${venture.name}. Do not truncate or cut off.`,
          venture: {
            name: venture.name,
            problemStatement: venture.problemStatement,
            targetCustomer: venture.targetCustomer,
          },
        }),
      });

      const data = await res.json();
      const rawAiReply = data.reply || "";
      const cleanAiReply = rawAiReply.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "").trim();

      // Extract bullet points as checklist items
      const newItems = cleanAiReply
        .split("\n")
        .filter((l: string) => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().startsWith("1.") || l.trim().startsWith("2.") || l.trim().startsWith("3."))
        .map((l: string, idx: number) => ({
          id: `chk-voice-${Date.now()}-${idx}`,
          text: l.replace(/^[•\-\d.]\s*/, "").trim(),
          done: false,
        }));

      // Set description
      const formattedDesc = description
        ? `${description}\n\n### Spoken Voice Notes & PRD:\n${cleanAiReply}`
        : cleanAiReply;

      setDescription(formattedDesc);
      if (newItems.length > 0) {
        setChecklists((prev) => [...prev, ...newItems]);
      }

      setIsEditingDesc(false);
      setVoiceTranscript("");

      // Play voice confirmation
      VoiceEngine.speak("I've structured your description and added the acceptance criteria to this card.");

      handleSaveAll();
    } catch (e) {
      console.error(e);
    } finally {
      setIsStructuringVoice(false);
    }
  };

  const cancelVoiceDictation = () => {
    VoiceEngine.stopListening();
    setIsRecordingVoice(false);
    setVoiceTranscript("");
  };

  // AI Requirements & Acceptance Criteria Generator
  const handleAIGenerateCriteria = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/ai-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Generate a complete User Story and 3-4 specific, testable Acceptance Criteria for this task: "${title}" in the startup "${venture.name}".

Format as:
**User Story:**
As a [target user role], I want to [action] so that [benefit].

**Acceptance Criteria:**
• [Criterion 1: Specific functional testable requirement]
• [Criterion 2: Specific validation or edge condition]
• [Criterion 3: Measurable outcome or deliverable]

Please write out all criteria completely without truncation.`,
          venture: {
            name: venture.name,
            problemStatement: venture.problemStatement,
            targetCustomer: venture.targetCustomer,
          },
        }),
      });

      const data = await res.json();
      const rawAiReply = data.reply || "";
      const cleanAiReply = rawAiReply.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "").trim();

      // Add to description
      const newDesc = description
        ? `${description}\n\n### User Story & Acceptance Criteria:\n${cleanAiReply}`
        : `### User Story & Acceptance Criteria:\n${cleanAiReply}`;
      setDescription(newDesc);

      // Create checklist items from AI response
      const lines = cleanAiReply
        .split("\n")
        .filter((l: string) => l.trim().startsWith("•") || l.trim().startsWith("-") || l.trim().startsWith("1.") || l.trim().startsWith("2.") || l.trim().startsWith("3."))
        .map((l: string, idx: number) => ({
          id: `chk-ai-${Date.now()}-${idx}`,
          text: l.replace(/^[•\-\d.]\s*/, "").trim(),
          done: false,
        }));

      if (lines.length > 0) {
        const merged = [...checklists, ...lines];
        setChecklists(merged);
      }

      setIsEditingDesc(false);
      handleSaveAll();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 uppercase tracking-wider">
                {category}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                in list <strong className="text-slate-700 capitalize">{venture.columns[columnKey]?.name || columnKey}</strong>
              </span>
              {priority && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    priority === "High" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {priority} Priority
                </span>
              )}
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleSaveAll()}
              className="text-lg sm:text-xl font-black text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none py-0.5"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Talk to Fill Button in Header */}
            {!isRecordingVoice && (
              <button
                onClick={startVoiceDictation}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-blue-200/60 shadow-2xs"
                title="Speak to dictate description and acceptance criteria"
              >
                <Mic className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Talk to Fill Card</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Voice Recording Banner */}
        {isRecordingVoice && (
          <div className="bg-gradient-to-r from-rose-50 via-red-50 to-orange-50 p-4 border-b border-rose-200 flex flex-col gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-900">
                  Listening to your voice... Speak your task requirements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelVoiceDictation}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/80"
                >
                  Cancel
                </button>
                <button
                  onClick={stopAndStructureVoice}
                  disabled={isStructuringVoice}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5"
                >
                  {isStructuringVoice ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Structuring with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Finish & Fill with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-3 bg-white/90 rounded-2xl border border-rose-200 text-xs text-slate-800 font-medium min-h-[48px] italic leading-relaxed">
              {voiceTranscript || "Start speaking... (e.g. 'We need to build a texture layer selector with opacity slider and 3 presets')"}
            </div>
          </div>
        )}

        {/* Modal Body: Left Content + Right Actions */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <AlignLeft className="w-4 h-4 text-slate-500" />
                  <span>Description & Context</span>
                </div>
                {!isEditingDesc && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add detailed task scope, requirements, or links..."
                    className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 leading-relaxed font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditingDesc(false);
                        handleSaveAll();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDesc(false)}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors min-h-[72px]"
                >
                  {description ? (
                    renderMarkdown(description)
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Click to add a detailed description, user story, or technical notes...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklist Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <CheckSquare className="w-4 h-4 text-slate-500" />
                  <span>Acceptance Checklist ({completedItems}/{totalItems})</span>
                </div>
                <span className="text-xs font-bold text-slate-600">{checklistPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 pt-1">
                {checklists.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/60 hover:bg-slate-50 transition-colors group"
                  >
                    <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer select-none flex-1 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 rounded-md"
                      />
                      <span className={`truncate ${item.done ? "line-through text-slate-400 font-normal" : "font-semibold text-slate-800"}`}>
                        {item.text}
                      </span>
                    </label>
                    <button
                      onClick={() => {
                        const updated = checklists.filter((i) => i.id !== item.id);
                        setChecklists(updated);
                        onUpdateCard({ ...card, checklists: updated }, targetCol);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 text-xs p-1 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add Checklist Item input */}
                <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add an acceptance criterion or step..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* AI Generator Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-blue-900">Auto-Generate Acceptance Criteria</h5>
                  <p className="text-[11px] text-blue-700">Let AI BA draft testable criteria tailored to {venture.name}.</p>
                </div>
              </div>
              <button
                onClick={handleAIGenerateCriteria}
                disabled={isGeneratingAI}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isGeneratingAI ? "Drafting..." : "Generate Criteria"}
              </button>
            </div>
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80">
            {/* Category / Label */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as KanbanCard["category"];
                  setCategory(newCat);
                  onUpdateCard({ ...card, category: newCat }, targetCol);
                }}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const newPrio = e.target.value as KanbanCard["priority"];
                  setPriority(newPrio);
                  onUpdateCard({ ...card, priority: newPrio }, targetCol);
                }}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Move to List */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Move to List
              </label>
              <select
                value={targetCol}
                onChange={(e) => {
                  const newCol = e.target.value as keyof Venture["columns"];
                  setTargetCol(newCol);
                  handleSaveAll(newCol);
                }}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">Backlog</option>
                <option value="today">Today</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Link to Assumption */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Link Assumption
              </label>
              <select
                value={linkedAssumptionId}
                onChange={(e) => {
                  const val = e.target.value;
                  setLinkedAssumptionId(val);
                  onUpdateCard({ ...card, linkedAssumptionId: val }, targetCol);
                }}
                className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="">-- None --</option>
                {venture.assumptions?.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.category}] {a.statement.slice(0, 35)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Delete Card */}
            <div className="pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  onDeleteCard(card.id, columnKey);
                  onClose();
                }}
                className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={() => {
              handleSaveAll();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
