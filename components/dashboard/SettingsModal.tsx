"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Settings, X, Save, Zap, Volume2, Shield, User, Globe } from "lucide-react";
import { Venture, VentureStore } from "@/lib/store/ventureStore";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  venture,
  onUpdateVenture,
}: SettingsModalProps) {
  const [name, setName] = useState(venture.name);
  const [tagline, setTagline] = useState(venture.tagline);
  const [targetCustomer, setTargetCustomer] = useState(venture.targetCustomer);
  const [problemStatement, setProblemStatement] = useState(venture.problemStatement);
  const [standupTime, setStandupTime] = useState(venture.standupTime || "09:00 AM");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Venture = {
      ...venture,
      name: name.trim() || venture.name,
      tagline: tagline.trim() || venture.tagline,
      targetCustomer: targetCustomer.trim() || venture.targetCustomer,
      problemStatement: problemStatement.trim() || venture.problemStatement,
      standupTime: standupTime.trim() || "09:00 AM",
    };
    VentureStore.updateVenture(updated);
    onUpdateVenture(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Workspace Settings</h3>
              <p className="text-xs text-slate-500">
                Configure {venture.name} parameters and AI voice preferences.
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

        {/* Subscription Plan Quick Action */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Active Plan: 7-Day Free Trial</div>
              <div className="text-[11px] text-slate-500">Solo ($29/mo) or Pro ($79/mo) with 20% annual discount.</div>
            </div>
          </div>
          <Link
            href="/pricing"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            Upgrade
          </Link>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Startup / Venture Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Value Proposition / Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Ideal Customer Profile (ICP)
            </label>
            <input
              type="text"
              value={targetCustomer}
              onChange={(e) => setTargetCustomer(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Daily Standup Call Schedule
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={standupTime}
                onChange={(e) => setStandupTime(e.target.value)}
                placeholder="e.g. 09:00 AM"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                onChange={(e) => setStandupTime(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 text-slate-700 cursor-pointer focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>Presets</option>
                <option value="08:00 AM">08:00 AM</option>
                <option value="08:30 AM">08:30 AM</option>
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="05:00 PM">05:00 PM</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Time when your AI Business Analyst conducts your daily morning standup check-in.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Core Problem Statement
            </label>
            <textarea
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saved ? "Saved Settings!" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
