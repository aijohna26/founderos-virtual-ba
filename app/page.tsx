"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { HeroDashboardPreview } from "@/components/HeroDashboardPreview";
import { FeatureHighlights } from "@/components/FeatureHighlights";
import { Pricing } from "@/components/Pricing";
import {
  CheckCircle2,
  Play,
  Sparkles,
  PhoneCall,
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Rocket,
  Users,
  FileSpreadsheet,
  Cpu,
  ArrowRight
} from "lucide-react";
import { Show, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white scroll-smooth">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="pt-3 pb-12 lg:pt-6 lg:pb-16 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
              
              {/* Hero Left Column (Copy & CTAs) */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-5">
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-xs uppercase tracking-wider shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20" />
                  <span>AI Business Analyst & Venture Co-Pilot</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12]">
                  Your AI Business Analyst{" "}
                  <span className="text-blue-600">for every founder decision.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                  Stop building features in the dark. FounderAlly runs daily voice standups, manages your Kanban sprints, de-risks critical hypotheses, and drafts executive PRDs powered by advanced AI.
                </p>

                {/* Key Pillars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col gap-1">
                    <span className="text-sm font-bold text-blue-600">🎙️ Daily Voice</span>
                    <span className="text-[11px] text-slate-500 font-medium">Spoken 2-way standup debriefs</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col gap-1">
                    <span className="text-sm font-bold text-purple-600">📋 Kanban Sync</span>
                    <span className="text-[11px] text-slate-500 font-medium">Autonomous sprint & card updates</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col gap-1">
                    <span className="text-sm font-bold text-emerald-600">📄 PRD Specs</span>
                    <span className="text-[11px] text-slate-500 font-medium">1-Click strategy & assumption test</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  {!mounted ? (
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5"
                    >
                      <span>Start 7-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <>
                      <Show when="signed-out">
                        <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                          <button className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 cursor-pointer">
                            <span>Start 7-Day Free Trial</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </SignUpButton>
                      </Show>

                      <Show when="signed-in">
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5"
                        >
                          <span>Open Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Show>
                    </>
                  )}

                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-base transition-all shadow-2xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center pl-0.5">
                      <Play className="w-2.5 h-2.5 fill-blue-600" />
                    </div>
                    <span>How It Works</span>
                  </a>
                </div>

                {/* Trust Footer */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 7-Day Free Trial
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cancel Anytime
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% IP Ownership
                  </span>
                </div>
              </div>

              {/* Hero Right Column (Interactive Dashboard Preview) */}
              <div className="lg:col-span-7">
                <HeroDashboardPreview />
              </div>

            </div>
          </div>
        </section>

        {/* Feature Highlights Bar */}
        <div id="features">
          <FeatureHighlights />
        </div>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider border border-blue-200">
                <span>The 3-Step Execution Loop</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                From Spoken Idea to Shipped Sprint
              </h2>
              <p className="text-slate-600 text-base">
                How FounderAlly transforms messy founder thoughts into structured, testable venture execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900">Daily Voice Standup</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Start your morning talking to your AI Business Analyst. Review sprint velocity, talk through blockers, and brainstorm strategy out loud.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-purple-500/20">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900">Autonomous Board Sync</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your AI Analyst autonomously creates Kanban tickets, writes testable acceptance criteria checklists, and updates priorities in real-time.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900">Validated PRD & Export</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Export ready-to-use CSVs for Jira/Trello, download Executive PRD Markdown summaries, or backup complete venture database states.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Product Deep Dives */}
        <section id="product" className="py-20 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            
            {/* Feature 1: Voice Standup */}
            <div id="voice-standup" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>2-Way Natural Voice</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900">
                  Daily Voice Calls with Your Principal AI Analyst
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  No more typing into blank prompts. Have live, 2-way spoken conversations with your AI advisor about customer friction, market alternatives, and sprint priorities.
                </p>
                <ul className="space-y-2 text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Hands-free voice recognition with natural speech synthesis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Scheduled morning standups and alarm notifications</span>
                  </li>
                </ul>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">🎙️</div>
                    <div>
                      <div className="font-bold text-sm">Morning Founder Standup</div>
                      <div className="text-xs text-blue-200">Connected with your AI advisor</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">Live Audio</span>
                </div>
                <p className="text-sm text-blue-50 italic">
                  &quot;Good morning! You completed the ICP interview card yesterday. Today, let&apos;s tackle the Cloud GPU benchmark and validate our unit pricing.&quot;
                </p>
              </div>
            </div>

            {/* Feature 2: Kanban Board */}
            <div id="kanban-board" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Kanban Column: IN PROGRESS</span>
                  <span className="text-xs font-bold text-blue-600">2 Active Work</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Technical</span>
                    <span className="text-[10px] font-bold text-rose-600">High Priority</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">Benchmark Cloud GPU Rendering Latency</h4>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Autonomous Kanban</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900">
                  Kanban Boards That Manage Themselves
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Every spoken decision automatically converts into a structured Kanban card with testable acceptance criteria checklists, category tags, and priority labels.
                </p>
              </div>
            </div>

            {/* Feature 3: Market Sizing & Assumptions */}
            <div id="market-sizing" className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div id="assumptions" className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Strategy & Market Sizing</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900">
                  TAM / SAM / SOM & Hypothesis Testing
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Understand your real market economics and track untested vs validated hypotheses with a structured risk register.
                </p>
              </div>
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Total Addressable Market (TAM)</span>
                  <span className="font-black text-blue-600">$1.2B Global</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Serviceable Addressable Market (SAM)</span>
                  <span className="font-black text-indigo-600">$250M Target</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">Year 1 Obtainable (SOM)</span>
                  <span className="font-black text-emerald-600">$500K Early Adopters</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider border border-indigo-200">
                <Rocket className="w-3.5 h-3.5" />
                <span>Tailored for High-Velocity Founders</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Built for Every Stage of Your Venture
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-2.5 w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">💡</div>
                <h4 className="text-sm font-bold text-slate-900">Idea Validation</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Stress-test problem severity, defensibility moats, and willingness-to-pay before writing code.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-2.5 w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">🚀</div>
                <h4 className="text-sm font-bold text-slate-900">MVP Sprints</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Auto-generate complete user stories and testable acceptance criteria checklists for your dev team.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-2.5 w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">👥</div>
                <h4 className="text-sm font-bold text-slate-900">Customer Discovery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Turn raw user interview transcripts into validated hypotheses and prioritized feature requests.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="p-2.5 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">📑</div>
                <h4 className="text-sm font-bold text-slate-900">Investor Prep</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Export complete Executive PRDs, sprint velocity scores, and unit economics reports for pitches.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Pricing />

        {/* About Section */}
        <section id="about" className="py-20 bg-slate-900 text-white border-t border-slate-800">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-xs border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>About FounderAlly</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black">
              Democratizing Executive Business Analysis for Every Founder
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              FounderAlly was built to give early-stage founders the strategic power of a seasoned Principal Business Analyst and agile co-founder. Powered by advanced AI, FounderAlly bridges the gap between vision, customer validation, and sprint execution.
            </p>
            <div className="pt-4">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-0.5"
              >
                <span>Start Your 7-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-300">
            FounderAlly © 2026. Your AI Business Analyst for Every Founder Decision.
          </p>
          <div className="flex justify-center space-x-6 text-slate-500">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
