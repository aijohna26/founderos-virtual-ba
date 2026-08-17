"use client";

import React from "react";
import { Sparkles, Layers, ShieldCheck, Zap, PhoneCall, CheckCircle2 } from "lucide-react";

export function FeatureHighlights() {
  const highlights = [
    {
      icon: PhoneCall,
      title: "2-Way Voice Standup",
      desc: "Daily morning debriefs spoken aloud with Gemini AI",
      badge: "Hands-Free",
      color: "text-blue-600 bg-blue-50 border-blue-200/80"
    },
    {
      icon: Layers,
      title: "Autonomous Kanban",
      desc: "Instant ticket creation & acceptance criteria checklists",
      badge: "Sprint Ready",
      color: "text-purple-600 bg-purple-50 border-purple-200/80"
    },
    {
      icon: ShieldCheck,
      title: "Assumption Register",
      desc: "Continuous risk scoring and validation experiment tracking",
      badge: "De-Risking",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200/80"
    },
    {
      icon: Zap,
      title: "Google Gemini Engine",
      desc: "Sub-second analytical reasoning tailored to your market",
      badge: "State of the Art",
      color: "text-amber-600 bg-amber-50 border-amber-200/80"
    },
  ];

  return (
    <section className="py-12 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 uppercase tracking-wider">
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
