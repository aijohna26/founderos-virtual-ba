"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Shield, Lock, FileText, ArrowLeft, Mail } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <Shield className="w-3.5 h-3.5" />
              <span>GDPR & UK DPA Compliant</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-slate-500 mt-2">
              Last Updated: August 17, 2026 • Operated by Garmzy Events Limited (trading as FounderAlly)
            </p>
          </div>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">1. Overview & Commitment</h2>
            <p>
              At FounderAlly (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), protecting the confidentiality of your startup ideas, strategic documents, and proprietary business workflows is our top priority. We do not sell your personal data or your startup&apos;s proprietary business analysis to third parties.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account Information:</strong> Name, email address, and authentication credentials securely managed via Clerk.
              </li>
              <li>
                <strong>Venture & Strategy Data:</strong> Startup descriptions, target customer ICPs, problem statements, hypotheses, and Kanban tasks you create.
              </li>
              <li>
                <strong>Voice Audio & Speech Transcripts:</strong> Real-time voice audio processed locally in your browser and transcribed solely to generate board actions and user stories. We do not store raw audio recordings on permanent servers.
              </li>
              <li>
                <strong>Billing & Payment Information:</strong> Payment transactions are handled directly through Stripe. We do not store your credit card numbers on our servers.
              </li>
            </ul>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">3. How We Use Artificial Intelligence (Gemini AI)</h2>
            <p>
              FounderAlly utilizes the Google Gemini API to analyze business context and generate acceptance criteria, market sizing, and PRDs. Your business prompts are processed through enterprise API endpoints and are <strong>not used to train Google&apos;s public foundation models</strong>.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">4. Data Storage, Security & Retention</h2>
            <p>
              All customer data is encrypted in transit (TLS 1.3 / HTTPS) and at rest. Your venture workspaces are partitioned securely. You retain complete ownership and intellectual property of all generated PRDs, tickets, and strategy documents, and you may export or delete your venture data at any time.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">5. Your Rights (GDPR & International)</h2>
            <p>
              Under UK and European GDPR, you have the right to access, rectify, port, or request permanent erasure of your personal data. To exercise any of these rights, please contact our data protection team.
            </p>
          </section>

          <section className="space-y-4 text-sm text-slate-600 leading-relaxed pt-4 border-t border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">6. Contact & Data Inquiries</h2>
            <p>
              If you have any questions regarding this Privacy Policy or your data, please contact:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1 text-slate-700">
              <p><strong>Entity:</strong> Garmzy Events Limited (trading as FounderAlly)</p>
              <p><strong>Address:</strong> 85 Ferndale Road, Enfield, EN3 6DJ, United Kingdom</p>
              <p><strong>Email:</strong> <a href="mailto:support@getfounderally.com" className="text-blue-600 hover:underline">support@getfounderally.com</a></p>
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
