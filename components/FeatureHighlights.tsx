"use client";

import React from "react";
import { Lightbulb, Target, FileSpreadsheet, RefreshCw } from "lucide-react";

export function FeatureHighlights() {
  return (
    <section className="py-12 bg-slate-50 border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Left Callout Card */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center font-bold text-xl text-blue-700 shadow-md">
                👨‍💻
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                ✦
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                More than just answers.
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                AI analysis you can act on.
              </p>
            </div>
          </div>

          {/* 4 Feature Columns */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Business Analysis</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Deep dives on markets, problems and solutions
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Strategic Guidance</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Actionable advice based on proven frameworks
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Document & Plan</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Auto-generate plans, briefs and investor docs
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Always Learning</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Learns your business and improves over time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
