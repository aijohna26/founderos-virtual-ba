"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, X, Mail, PhoneCall, LayoutGrid, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";

export interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpSupportModal({ isOpen, onClose }: HelpSupportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Help & Founder Support</h3>
              <p className="text-xs text-slate-500">
                Quick start tips, AI voice guides, and direct founder assistance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Start FAQs */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Quick Start Tips
          </h4>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>How do 2-Way Voice Standups work?</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click the <strong>Daily Call</strong> button (or unmute the mic in the right AI Co-Pilot panel). Google Gemini will speak aloud, review in-progress tickets, and take live board actions based on your voice.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />
              <span>How to auto-generate acceptance criteria?</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click any card on your Kanban board, then click <strong>&quot;Generate Criteria with AI&quot;</strong>. Gemini will write a user story and extract bulleted acceptance criteria checkboxes.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exporting & Backups</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click the <strong>•••</strong> menu in the top right header to export your entire board to CSV (for Jira/Trello), download an Executive Markdown PRD, or save a complete JSON backup.
            </p>
          </div>
        </div>

        {/* Direct Contact Support Card */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Need 1-on-1 Help?
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Our founder strategy team is here to help you configure custom AI workflows, investor pitch decks, or billing inquiries.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <a
              href="mailto:support@getfounderally.com"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Email Support</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-xs text-slate-400 font-medium">support@getfounderally.com</span>
          </div>
        </div>

        {/* Legal Links */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <Link href="/privacy" onClick={onClose} className="hover:text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" onClick={onClose} className="hover:text-blue-600 hover:underline">
            Terms of Service
          </Link>
          <Link href="/pricing" onClick={onClose} className="hover:text-blue-600 hover:underline">
            Pricing Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
