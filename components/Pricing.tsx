"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plans = [
    {
      name: "Starter",
      description: "For early-stage builders exploring and validating raw startup concepts.",
      price: { monthly: 0, annual: 0 },
      badge: "Free Forever",
      popular: false,
      ctaText: "Get Started Free",
      features: [
        "1 Active Venture Workspace",
        "50 AI Analyst queries / mo",
        "Basic market & problem validation",
        "Pre-built assumption testing canvas",
        "Export simple markdown summaries",
        "Community forum access"
      ],
      highlight: false
    },
    {
      name: "Founder Pro",
      description: "Complete strategic intelligence for serious founders launching & raising.",
      price: { monthly: 29, annual: 24 },
      badge: "Most Popular",
      popular: true,
      ctaText: "Start 14-Day Free Trial",
      features: [
        "Unlimited AI Business Analyst queries",
        "Deep TAM / SAM / SOM market sizing",
        "Automated competitor teardown & moats",
        "Financial model & unit economics engine",
        "Investor-ready BA deck generator (PDF/DOCX)",
        "Priority AI model latency & faster responses",
        "Direct email & chat support"
      ],
      highlight: true
    },
    {
      name: "Scale & Studio",
      description: "For serial founders, accelerators, and startup studios managing multiple ventures.",
      price: { monthly: 89, annual: 74 },
      badge: "Full Power",
      popular: false,
      ctaText: "Upgrade to Scale",
      features: [
        "Unlimited venture workspaces",
        "Multi-member team collaboration",
        "Live hypothesis tracking & milestone tracker",
        "Custom pitch deck & business case exports",
        "Dedicated venture analyst prompt tailoring",
        "Priority 24/7 SLA & founder advisor onboarding"
      ],
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-slate-900 text-white relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
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
            Choose the plan that matches your venture stage. Simple dollar pricing with zero hidden fees. Cancel anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center bg-slate-800/90 p-1 rounded-full border border-slate-700">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
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
                className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const currentPrice = plan.price[billingCycle];

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-b from-slate-800 to-slate-850 border-2 border-blue-500 shadow-2xl shadow-blue-500/20 md:-translate-y-2"
                    : "bg-slate-800/60 border border-slate-700/70 hover:border-slate-600"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                    <Zap className="w-3 h-3 fill-white" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {!plan.popular && plan.badge && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-400 min-h-[40px] mb-6">
                    {plan.description}
                  </p>

                  {/* Price in Dollars */}
                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-white">
                      ${currentPrice}
                    </span>
                    <span className="text-sm text-slate-400 font-medium">
                      / {billingCycle === "annual" ? "mo (billed yearly)" : "month"}
                    </span>
                  </div>

                  {/* CTA Button */}
                  <div className="mb-8">
                    <Show when="signed-out">
                      <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                        <button
                          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
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
                        className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          plan.popular
                            ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                            : "bg-slate-700 hover:bg-slate-600 text-white"
                        }`}
                      >
                        <span>Go to Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Show>
                  </div>

                  {/* Feature List */}
                  <div className="border-t border-slate-700/80 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                      What&apos;s included
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                          <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-700/40 flex items-center gap-2 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
