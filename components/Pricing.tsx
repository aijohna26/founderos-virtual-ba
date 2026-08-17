"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Zap, Shield, ArrowRight, Clock } from "lucide-react";
import { Show, SignUpButton } from "@clerk/nextjs";

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Solo Founder",
      description: "For individual builders and founders validating raw concepts and launching their first product.",
      price: { monthly: 29, annual: 23 },
      annualBilled: 276,
      badge: "7-Day Free Trial",
      popular: false,
      ctaText: "Start 7-Day Free Trial",
      features: [
        "1 Active Venture Workspace",
        "7-Day Capped Free Trial included",
        "Daily 2-Way Voice Standups with Gemini",
        "Kanban Board & Acceptance Criteria Generator",
        "Export Board to CSV & Executive Markdown PRD",
        "Hypothesis & Assumption Risk Register",
        "Standard Google Gemini execution speed",
        "Standard Email Support"
      ],
      highlight: false
    },
    {
      name: "Venture Pro",
      description: "Complete autonomous business analysis and strategic intelligence for growing ventures and multi-project founders.",
      price: { monthly: 79, annual: 63 },
      annualBilled: 756,
      badge: "Most Popular • 7-Day Trial",
      popular: true,
      ctaText: "Start 7-Day Free Trial",
      features: [
        "Unlimited Active Venture Workspaces",
        "7-Day Full Feature Free Trial included",
        "Unlimited 2-Way Voice Standups & Calls",
        "Kanban Board with Deep Ticket Structuring",
        "Automated TAM / SAM / SOM Market Sizing",
        "Full Venture JSON Backups & Jira/Trello Export",
        "Priority Ultra-Fast AI Response Latency",
        "Priority 1-on-1 Founder Strategy Support"
      ],
      highlight: true
    }
  ];

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
            <span>Transparent 2-Tier Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Invest in clarity. <span className="text-blue-400">Build with conviction.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300">
            Start with a <strong>7-Day Free Trial</strong> on any plan. Cancel anytime with zero friction.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center bg-slate-800/90 p-1.5 rounded-full border border-slate-700 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid (2 Columns, Balanced & Centered) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {plans.map((plan) => {
            const currentPrice = plan.price[billingCycle];

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-3xl p-8 sm:p-10 transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-b from-slate-800 to-slate-850 border-2 border-blue-500 shadow-2xl shadow-blue-500/25 md:-translate-y-2"
                    : "bg-slate-800/60 border border-slate-700/70 hover:border-slate-600"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                    {!plan.popular && plan.badge && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-700 text-blue-300 border border-slate-600">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-slate-400 min-h-[44px] mb-6 leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price in Dollars */}
                  <div className="mb-6 flex items-baseline gap-1.5">
                    <span className="text-5xl font-black text-white">
                      ${currentPrice}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        / month
                      </span>
                      {billingCycle === "annual" && (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          ${plan.annualBilled}/yr (Save 20%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mb-8">
                    <Show when="signed-out">
                      <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                        <button
                          className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            plan.popular
                              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                              : "bg-slate-700 hover:bg-slate-600 text-white"
                          }`}
                        >
                          <span>{plan.ctaText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </SignUpButton>
                    </Show>

                    <Show when="signed-in">
                      <Link
                        href="/dashboard"
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          plan.popular
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                            : "bg-slate-700 hover:bg-slate-600 text-white"
                        }`}
                      >
                        <span>Open Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Show>
                  </div>

                  {/* Feature List */}
                  <div className="border-t border-slate-700/80 pt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      What&apos;s included
                    </p>
                    <ul className="space-y-3.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                          <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>7-Day Free Trial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fair Usage Footnote */}
        <div className="mt-8 text-center text-xs text-slate-500 font-medium">
          <p>
            * All plans include a 7-day free trial. Unlimited features are subject to{" "}
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
