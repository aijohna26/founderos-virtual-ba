"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { HeroDashboardPreview } from "@/components/HeroDashboardPreview";
import { FeatureHighlights } from "@/components/FeatureHighlights";
import { Pricing } from "@/components/Pricing";
import { CheckCircle2, Play, Sparkles } from "lucide-react";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              
              {/* Hero Left Column (Copy & CTAs) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-700 font-bold text-xs uppercase tracking-wider shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>YOUR AI BUSINESS ANALYST & CO-FOUNDER</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                  Your AI Business Analyst{" "}
                  <span className="text-blue-600 block sm:inline">for every founder decision.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
                  FounderAlly is your AI Business Analyst and co-pilot. From idea to scale, get clarity on what to build, why it matters, and how to make it succeed.
                </p>

                {/* Bullet Points */}
                <ul className="space-y-3 pt-2 text-sm sm:text-base font-medium text-slate-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Ask anything about your idea, market or strategy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Get expert analysis, data-backed insights and <strong>reports</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Validate assumptions</strong> and <strong>reduce risk</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Build better plans, faster — with AI by your side</span>
                  </li>
                </ul>

                {/* Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {!mounted ? (
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5"
                    >
                      <span>Get Started with AI Analyst</span>
                      <Sparkles className="w-4 h-4 fill-white" />
                    </Link>
                  ) : (
                    <>
                      <Show when="signed-out">
                        <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                          <button className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 cursor-pointer">
                            <span>Get Started with AI Analyst</span>
                            <Sparkles className="w-4 h-4 fill-white" />
                          </button>
                        </SignUpButton>
                      </Show>

                      <Show when="signed-in">
                        <Link
                          href="/dashboard"
                          className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5"
                        >
                          <span>Open AI Analyst Workspace</span>
                          <Sparkles className="w-4 h-4 fill-white" />
                        </Link>
                      </Show>
                    </>
                  )}

                  <a
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-blue-300 hover:border-blue-400 bg-white hover:bg-blue-50/50 text-blue-600 font-bold text-base transition-all shadow-xs"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center pl-0.5">
                      <Play className="w-2.5 h-2.5 fill-blue-600 text-blue-600" />
                    </div>
                    <span>See How It Works</span>
                  </a>
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
        <FeatureHighlights />

        {/* Pricing Section (In Dollars) */}
        <Pricing />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-300">
            FounderAlly © 2026. Your AI Business Analyst for Every Founder Decision.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
