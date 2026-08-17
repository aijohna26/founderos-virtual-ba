"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { FileCheck, Shield, ArrowLeft, Scale } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to FounderAlly</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs mb-3 border border-blue-200">
              <Scale className="w-3.5 h-3.5" />
              <span>Standard SaaS Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Effective Date: August 17, 2026 • Operated by Garmzy Events Limited
            </p>
          </div>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the FounderAlly platform (&quot;Service&quot;) operated by Garmzy Events Limited (&quot;FounderAlly&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service. If you are entering into these terms on behalf of a company, you represent that you have the authority to bind such entity.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">2. Description of Service</h2>
            <p>
              FounderAlly is an AI-powered Business Analyst platform that assists founders in ideating, validating assumptions, running voice standups, managing Kanban boards, and generating strategic PRD documents via Google Gemini AI models.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">3. Subscriptions, 7-Day Free Trial & Billing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>7-Day Free Trial:</strong> All new plans (Solo Founder and Venture Pro) include an initial 7-day trial. You can cancel anytime during the trial period with zero charge.
              </li>
              <li>
                <strong>Recurring Billing:</strong> Subscriptions are billed in advance on a monthly or annual basis (with a 20% annual discount) through Stripe.
              </li>
              <li>
                <strong>Cancellation:</strong> You may cancel your subscription at any time via your account settings. Cancellation takes effect at the end of the current paid billing cycle.
              </li>
              <li>
                <strong>Fair Usage Policy:</strong> Unlimited features (including unlimited venture workspaces, 2-way AI voice standups, and Gemini analyses) are subject to fair usage. They are intended for genuine founder and startup team operations and may not be abused through automated script looping or bulk reselling.
              </li>
            </ul>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">4. Fair Usage Policy for Unlimited Features</h2>
            <p>
              Where a plan is designated as having &quot;unlimited&quot; capabilities (such as Venture Pro), <strong>unlimited features are subject to fair usage</strong>. FounderAlly reserves the right to throttle or restrict accounts exhibiting abusive, automated non-human request volumes that exceed reasonable founder operational practices.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">5. Intellectual Property & Your Content</h2>
            <p>
              <strong>You own 100% of your business data, ideas, and generated deliverables.</strong> Any venture analysis, user stories, acceptance criteria, strategic plans, and PRDs generated through FounderAlly remain your exclusive intellectual property.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">6. AI Outputs & Advisory Disclaimer</h2>
            <p>
              FounderAlly provides strategic analytical suggestions powered by AI models. While designed for high accuracy and grounded reasoning, AI outputs are provided for informational and planning purposes. You remain solely responsible for validating critical legal, financial, and product decisions.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">7. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of <strong>England and Wales</strong>, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">8. Contact Information</h2>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 text-slate-700">
              <p><strong>Company:</strong> Garmzy Events Limited (trading as FounderAlly)</p>
              <p><strong>Registered Address:</strong> 85 Ferndale Road, Enfield, EN3 6DJ, United Kingdom</p>
              <p><strong>Support Email:</strong> <a href="mailto:support@getfounderally.com" className="text-blue-600 hover:underline">support@getfounderally.com</a></p>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs text-center">
        <p className="font-medium text-slate-300">
          FounderAlly © 2026. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
