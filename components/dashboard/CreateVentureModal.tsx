"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Rocket, X } from "lucide-react";
import { VentureStore, Venture } from "@/lib/store/ventureStore";
import { useUser } from "@clerk/nextjs";

export interface CreateVentureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVentureCreated: (venture: Venture) => void;
}

export function CreateVentureModal({
  isOpen,
  onClose,
  onVentureCreated,
}: CreateVentureModalProps) {
  const { user } = useUser();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [solutionSummary, setSolutionSummary] = useState("");
  const [stage, setStage] = useState("Ideation & Problem Discovery");
  const [boardMode, setBoardMode] = useState<"clean" | "ai_starter">("clean");
  const [collaborationMode, setCollaborationMode] = useState<"solo" | "partner" | "team" | "external">("solo");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !problemStatement.trim()) return;

    setLoading(true);

    try {
      let analysis: any = {};
      if (boardMode === "ai_starter") {
        const res = await fetch("/api/generate-venture-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            tagline: tagline.trim() || `${name} — AI Driven Solution`,
            targetCustomer: targetCustomer.trim() || "Target early adopters",
            problemStatement: problemStatement.trim(),
            solutionSummary: solutionSummary.trim() || tagline.trim(),
            stage,
          }),
        });
        analysis = await res.json();
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + crypto.randomUUID();
      const ownerMemberId = `${id}:owner`;

      const newVenture: Venture = {
        id,
        name: name.trim(),
        tagline: tagline.trim() || `${name} — AI Driven Solution`,
        status: "Validation",
        color: "bg-indigo-600",
        dot: "bg-indigo-500",
        ownerUserId: user?.id,
        collaborationMode,
        members: [{
          id: ownerMemberId,
          ventureId: id,
          userId: user?.id,
          email: user?.primaryEmailAddress?.emailAddress || "",
          name: user?.fullName || user?.firstName || "You",
          role: "owner",
          status: "active",
          canJoinStandup: true,
          canEditBoard: true,
          canAssignCards: true,
          joinedAt: new Date().toISOString(),
        }],
        invitations: [],
        standupSessions: [],
        stage: stage || "Discovery & Validation",
        targetCustomer: targetCustomer.trim() || "Target early adopters",
        problemStatement: problemStatement.trim(),
        solutionSummary: solutionSummary.trim() || tagline.trim(),
        strategy: analysis.strategy || {
          tam: "Estimating market sizing...",
          sam: "Estimating addressable segment...",
          som: "Estimating obtainable customers...",
          icp: targetCustomer.trim(),
          valueProp: tagline.trim(),
          moat: "Proprietary domain workflows.",
          alternatives: "Manual spreadsheets & legacy tools."
        },
        columns: boardMode === "ai_starter" && analysis.columns ? analysis.columns : {
          backlog: { name: "BACKLOG", items: [] },
          today: { name: "TODAY", items: [] },
          in_progress: { name: "IN PROGRESS", items: [] },
          done: { name: "DONE", items: [] },
          blocked: { name: "BLOCKED", items: [] },
        },
        assumptions: boardMode === "ai_starter" && analysis.assumptions ? analysis.assumptions : [
          {
            id: "a-init-1",
            statement: `Customers will adopt ${name} to solve: ${problemStatement.slice(0, 120)}`,
            category: "Problem",
            importance: "High",
            status: "Untested",
            evidence: "Pending discovery interviews",
          }
        ],
        priorities: boardMode === "ai_starter" && analysis.priorities ? analysis.priorities : [],
        milestones: boardMode === "ai_starter" && analysis.milestones ? analysis.milestones : [],
        chatHistory: [
          {
            id: "ch-init",
            sender: "ai",
            text: `Welcome to ${name}! I'm your AI Business Analyst. We've started with a clean, focused board. What hypothesis or customer problem should we prioritize first?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ],
        createdAt: new Date().toISOString(),
      };

      const existing = VentureStore.getVentures();
      existing.push(newVenture);
      VentureStore.saveVentures(existing);
      VentureStore.updateVenture(newVenture);

      setLoading(false);
      onVentureCreated(newVenture);
      onClose();
    } catch (err) {
      console.error("Failed to generate venture analysis:", err);
      // Fallback
      const created = VentureStore.createVenture({
        name: name.trim(),
        tagline: tagline.trim() || `${name} — AI Driven Solution`,
        targetCustomer: targetCustomer.trim() || "Early stage founders & operators",
        problemStatement: problemStatement.trim(),
        solutionSummary: solutionSummary.trim() || tagline.trim(),
        stage,
      });
      const ownerMemberId = `${created.id}:owner`;
      const collaborativeCreated: Venture = {
        ...created,
        ownerUserId: user?.id,
        collaborationMode,
        members: [{
          id: ownerMemberId,
          ventureId: created.id,
          userId: user?.id,
          email: user?.primaryEmailAddress?.emailAddress || "",
          name: user?.fullName || user?.firstName || "You",
          role: "owner",
          status: "active",
          canJoinStandup: true,
          canEditBoard: true,
          canAssignCards: true,
          joinedAt: new Date().toISOString(),
        }],
        invitations: [],
        standupSessions: [],
      };
      VentureStore.updateVenture(collaborativeCreated);
      setLoading(false);
      onVentureCreated(collaborativeCreated);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Create New Venture</h2>
              <p className="text-xs text-slate-500">
                Initialize a dedicated AI Business Analyst workspace for your real startup.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Venture / Startup Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LeadPulse or FounderAlly"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Current Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Ideation & Problem Discovery">Ideation & Problem Discovery</option>
                <option value="Customer Discovery & Validation">Customer Discovery & Validation</option>
                <option value="MVP Build">MVP Build</option>
                <option value="Live & Generating Revenue">Live & Generating Revenue</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              One-Line Tagline / Value Proposition
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Automated cold email personalization for B2B sales teams"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Target Customer (Ideal Customer Profile)
            </label>
            <input
              type="text"
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              placeholder="e.g. Digital marketing agency owners with 5-20 clients"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Core Problem Being Solved *
            </label>
            <textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Describe the primary friction, pain, or inefficiency your customers face today..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              required
            />
          </div>

          {/* Initial Board Setup Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Who is working on this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["solo", "Just me", "One human + the AI BA"],
                ["partner", "Co-founder / partner", "A shared founding workspace"],
                ["team", "Small team", "Multiple people own delivery"],
                ["external", "External collaborator", "Advisors, clients or contractors"],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCollaborationMode(value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    collaborationMode === value
                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-xs font-black">{label}</span>
                  <span className={`mt-1 block text-[10px] leading-snug ${collaborationMode === value ? "text-slate-300" : "text-slate-500"}`}>{description}</span>
                </button>
              ))}
            </div>
            {collaborationMode !== "solo" && (
              <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-800">
                Create the venture first, then use Members in the header to send secure role-based invitations.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Board Starting State
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBoardMode("clean")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  boardMode === "clean"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                }`}
              >
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span>Clean Slate (Empty Board)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Start fresh with 0 cards. Build tickets with your AI advisor as you converse.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setBoardMode("ai_starter")}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  boardMode === "ai_starter"
                    ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/60"
                }`}
              >
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  <span>AI Starter Suggestions</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Auto-generate initial sprint hypotheses & cards.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !problemStatement.trim()}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Initializing Workspace..." : "Create Venture Workspace"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
