"use client";

import React, { useState } from "react";
import {
  FileCode2,
  CheckCircle2,
  Plus,
  Sparkles,
  Layers,
  Shield,
  FileText,
  Copy,
  Check
} from "lucide-react";
import { Venture } from "@/lib/store/ventureStore";

export interface RequirementsTabProps {
  venture: Venture;
}

export function RequirementsTab({ venture }: RequirementsTabProps) {
  const [copied, setCopied] = useState(false);

  const epics = [
    {
      id: "epic-1",
      title: "Epic 1: Core Problem & Discovery Engine",
      description: `User discovery workflows, friction identification, and initial value proposition testing for ${venture.name}.`,
      requirements: [
        { id: "FR-1", text: "Interactive customer problem interview logging & pain scoring (1-5 scale).", status: "Done" },
        { id: "FR-2", text: "Automated ICP role, company size, and workflow friction breakdown.", status: "Done" },
        { id: "FR-3", text: "Willingness-to-pay signal capture with target pricing benchmarks.", status: "In Progress" },
      ]
    },
    {
      id: "epic-2",
      title: "Epic 2: Autonomous Kanban & Sprint Delivery",
      description: "Automated ticket structuring, acceptance criteria generation, and live sprint velocity tracking.",
      requirements: [
        { id: "FR-4", text: "5-column Kanban board with real-time drag-and-drop state sync.", status: "Done" },
        { id: "FR-5", text: "Gemini AI auto-generation of testable acceptance criteria with checklists.", status: "Done" },
        { id: "FR-6", text: "1-click export to CSV (Jira/Trello) and Executive PRD (Markdown).", status: "Done" },
      ]
    },
    {
      id: "epic-3",
      title: "Epic 3: 2-Way Voice Standup Engine",
      description: "Hands-free voice recognition, audio speech synthesis, and scheduled founder alarms.",
      requirements: [
        { id: "FR-7", text: "Web Speech API integration with robust browser garbage-collection protection.", status: "Done" },
        { id: "FR-8", text: "Autonomous board voice actions (create cards, move cards, update status via voice).", status: "Done" },
        { id: "FR-9", text: "Daily call countdown timer and morning standup voice briefing.", status: "Done" },
      ]
    }
  ];

  const handleCopyPRD = () => {
    const prdText = `# Product Requirements Document (PRD) — ${venture.name}
**Tagline:** ${venture.tagline}
**Target Customer:** ${venture.targetCustomer}
**Problem Statement:** ${venture.problemStatement}

## Functional Requirements (Epics)
${epics.map(e => `### ${e.title}\n${e.description}\n${e.requirements.map(r => `- [${r.status}] ${r.id}: ${r.text}`).join('\n')}`).join('\n\n')}

## Non-Functional Requirements
- **Latency:** AI voice response time < 1.5 seconds.
- **Reliability:** 99.9% uptime with offline state persistence.
- **Security:** CSRF protection with authorized origins.`;

    navigator.clipboard.writeText(prdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileCode2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Functional Requirements & PRD Specs</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Structured feature epics, functional requirements (FRs), and technical specifications for {venture.name}.
          </p>
        </div>

        <button
          onClick={handleCopyPRD}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied PRD to Clipboard!" : "Copy Full PRD"}</span>
        </button>
      </div>

      {/* Epics Breakdown */}
      <div className="space-y-5">
        {epics.map((epic) => (
          <div key={epic.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{epic.title}</h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{epic.requirements.length} Requirements</span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              {epic.description}
            </p>

            <div className="space-y-2 pt-1">
              {epic.requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-black text-[10px] shrink-0">
                      {req.id}
                    </span>
                    <span className="font-semibold text-slate-800">{req.text}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 border ${
                      req.status === "Done"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
