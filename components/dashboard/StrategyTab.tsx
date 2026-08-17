"use client";

import React from "react";
import { Compass, Target, Shield, DollarSign, TrendingUp, Sparkles, Layers } from "lucide-react";
import { Venture } from "@/lib/store/ventureStore";

export interface StrategyTabProps {
  venture: Venture;
}

export function StrategyTab({ venture }: StrategyTabProps) {
  const strategy = venture.strategy;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Strategy Summary Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Strategy & Market Architecture — {venture.name}
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Synthesized by your AI Business Analyst based on market intelligence, customer discovery interviews, and competitive defensibility.
        </p>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TAM / SAM / SOM */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Market Sizing (TAM/SAM/SOM)</h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="text-[11px] font-bold text-purple-700">TAM (Total Addressable)</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{strategy.tam}</div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <div className="text-[11px] font-bold text-blue-700">SAM (Serviceable Addressable)</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{strategy.sam}</div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <div className="text-[11px] font-bold text-emerald-700">SOM (Serviceable Obtainable)</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">{strategy.som}</div>
            </div>
          </div>
        </div>

        {/* Value Proposition & ICP */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Target ICP & Value Prop</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div>
              <span className="font-bold text-slate-900 block mb-1">Target Customer Profile:</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {venture.targetCustomer}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Core Problem Solved:</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {venture.problemStatement}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-900 block mb-1">Core Value Proposition:</span>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                {strategy.valueProp || venture.solutionSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Competitive Moat */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Competitive Defensibility</h3>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 block">Core Moat:</span>
              <p className="text-[11px] text-slate-500">{strategy.moat}</p>
            </li>

            <li className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="font-bold text-slate-900 block">Current Alternatives:</span>
              <p className="text-[11px] text-slate-500">{strategy.alternatives}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
