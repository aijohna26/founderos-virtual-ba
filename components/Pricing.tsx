"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PricingTable } from "@clerk/nextjs";

// Renders Clerk's own <PricingTable /> (real checkout, trial, upgrade/downgrade) instead of
// a hand-maintained card grid, so plan names/prices/features here can never drift from what's
// actually configured in Clerk Dashboard -> Billing -> Plans. Restyled via `appearance` to
// roughly match the landing page's dark theme; Clerk owns the exact card layout.
export function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-slate-900 text-white relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Invest in clarity. <span className="text-blue-400">Build with conviction.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Start with a free trial on any plan. Cancel anytime with zero friction.
          </p>
        </div>

        {/* Clerk-managed pricing + checkout. Selecting a plan while signed out prompts sign
            up automatically; the resulting checkout always reflects the live plan config. */}
        <div className="max-w-4xl mx-auto">
          <PricingTable
            newSubscriptionRedirectUrl="/dashboard"
            appearance={{
              variables: {
                colorPrimary: "#2563eb",
                colorBackground: "#1e293b",
                colorForeground: "#f8fafc",
                colorMutedForeground: "#94a3b8",
                colorInput: "#0f172a",
                colorInputForeground: "#f8fafc",
                colorNeutral: "#94a3b8",
                colorBorder: "#334155",
                borderRadius: "1.5rem",
                fontFamily: "inherit",
              },
            }}
          />
        </div>

        {/* Fair Usage Footnote */}
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <p>
            All plans include a free trial. Unlimited features are subject to{" "}
            <Link href="/terms" className="text-blue-400 hover:underline">
              fair usage
            </Link>
            . Cancel anytime with zero commitment.
          </p>
        </div>
      </div>
    </section>
  );
}
