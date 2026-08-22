"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Sparkles,
  Menu,
  X,
  PhoneCall,
  LayoutGrid,
  TrendingUp,
  ShieldCheck,
  Rocket,
  Users,
  FileSpreadsheet,
  Cpu,
  BookOpen
} from "lucide-react";
import { Show, UserButton, SignUpButton } from "@clerk/nextjs";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/founderally-logo.png"
            alt="FounderAlly Logo"
            className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
          />
        </Link>

        {/* Center Navigation Links with Dropdowns */}
        <nav ref={dropdownRef} className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-700">
          {/* 1. Product Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("product")}
              onMouseEnter={() => setActiveDropdown("product")}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span>Product</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === "product" ? "rotate-180 text-blue-600" : ""}`} />
            </button>

            {activeDropdown === "product" && (
              <div
                onMouseLeave={() => setActiveDropdown(null)}
                className="absolute top-full left-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 grid gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50"
              >
                <Link
                  href="/#voice-standup"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Daily Voice Standup</div>
                    <div className="text-[11px] text-slate-500 font-normal">2-way live voice calls with your AI advisor</div>
                  </div>
                </Link>

                <Link
                  href="/#kanban-board"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-purple-100/70 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-purple-600">Autonomous Kanban Board</div>
                    <div className="text-[11px] text-slate-500 font-normal">AI ticket creation & acceptance criteria</div>
                  </div>
                </Link>

                <Link
                  href="/#market-sizing"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">TAM / SAM / SOM Sizing</div>
                    <div className="text-[11px] text-slate-500 font-normal">Automated market & ICP strategy modeling</div>
                  </div>
                </Link>

                <Link
                  href="/#assumptions"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-rose-100/70 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600">Hypothesis Risk Register</div>
                    <div className="text-[11px] text-slate-500 font-normal">Stress-test & validate core assumptions</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 2. Use Cases Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("usecases")}
              onMouseEnter={() => setActiveDropdown("usecases")}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span>Use Cases</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === "usecases" ? "rotate-180 text-blue-600" : ""}`} />
            </button>

            {activeDropdown === "usecases" && (
              <div
                onMouseLeave={() => setActiveDropdown(null)}
                className="absolute top-full left-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 grid gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50"
              >
                <Link
                  href="/#use-cases"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-indigo-100/70 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Pre-Seed & Idea Validation</div>
                    <div className="text-[11px] text-slate-500 font-normal">Validate ideas before writing code</div>
                  </div>
                </Link>

                <Link
                  href="/#use-cases"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-amber-100/70 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-amber-600">Customer Discovery Calls</div>
                    <div className="text-[11px] text-slate-500 font-normal">Turn user interviews into concrete PRDs</div>
                  </div>
                </Link>

                <Link
                  href="/#use-cases"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Executive PRD & Investor Prep</div>
                    <div className="text-[11px] text-slate-500 font-normal">Export complete venture roadmaps & decks</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 3. Direct Pricing Link */}
          <Link
            href="/pricing"
            className="py-2 px-3 rounded-xl hover:text-blue-600 hover:bg-slate-50 transition-all"
          >
            Pricing
          </Link>

          {/* 4. Resources Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown("resources")}
              onMouseEnter={() => setActiveDropdown("resources")}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <span>Resources</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeDropdown === "resources" ? "rotate-180 text-blue-600" : ""}`} />
            </button>

            {activeDropdown === "resources" && (
              <div
                onMouseLeave={() => setActiveDropdown(null)}
                className="absolute top-full left-0 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 grid gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 z-50"
              >
                <Link
                  href="/#features"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Real-Time AI Architecture</div>
                    <div className="text-[11px] text-slate-500 font-normal">Real-time reasoning & voice engine</div>
                  </div>
                </Link>

                <Link
                  href="/pricing"
                  onClick={() => setActiveDropdown(null)}
                  className="p-3 rounded-xl hover:bg-blue-50/70 transition-colors flex items-start gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Pricing & 7-Day Trial</div>
                    <div className="text-[11px] text-slate-500 font-normal">Compare Solo vs Pro tiers & savings</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* 5. Direct About Link */}
          <Link
            href="/#about"
            className="py-2 px-3 rounded-xl hover:text-blue-600 hover:bg-slate-50 transition-all"
          >
            About
          </Link>
        </nav>

        {/* Right CTA / Auth Controls */}
        <div className="hidden sm:flex items-center space-x-4">
          {!mounted ? (
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20"
            >
              Sign Up
            </Link>
          ) : (
            <>
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3.5 py-2 transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer">
                    Start Free Trial
                  </button>
                </SignUpButton>
              </Show>

              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-sm hover:bg-blue-100 hover:shadow-sm transition-all"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Go to Workspace</span>
                </Link>
                <UserButton />
              </Show>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 animate-in fade-in duration-150">
          <Link
            href="/#voice-standup"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            Daily Voice Standups
          </Link>
          <Link
            href="/#kanban-board"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            Autonomous Kanban
          </Link>
          <Link
            href="/#use-cases"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            Use Cases
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            Pricing (Solo & Pro)
          </Link>
          <Link
            href="/#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2.5 px-3 rounded-xl text-slate-700 font-semibold hover:bg-slate-50"
          >
            About FounderAlly
          </Link>

          <div className="pt-4 flex flex-col gap-3 border-t border-slate-100">
            <Show when="signed-out">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-full border border-slate-300 text-slate-700 font-semibold text-center hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="w-full py-2.5 rounded-full bg-blue-600 text-white font-semibold text-center shadow-md hover:bg-blue-700 transition-colors">
                  Start 7-Day Free Trial
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-slate-600">Your Account</span>
                <UserButton />
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-full bg-blue-600 text-white font-semibold text-center shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Go to Workspace
              </Link>
            </Show>
          </div>
        </div>
      )}
    </header>
  );
}
