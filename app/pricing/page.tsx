"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Pricing } from "@/components/Pricing";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans text-white">
      <Navbar />
      <main className="flex-1">
        <Pricing />
      </main>
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-slate-300">
            FounderAlly © 2026. Your AI Business Analyst for Every Founder Decision.
          </p>
          <div className="flex justify-center space-x-6 text-slate-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
