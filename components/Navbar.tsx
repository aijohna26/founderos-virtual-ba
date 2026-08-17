"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles, Menu, X } from "lucide-react";
import { Show, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="currentColor" opacity="0.2"/>
              <path d="M6 8L12 5L18 8V16L12 19L6 16V8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M12 12L18 8.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Founder<span className="text-blue-600">Ally</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
          <div className="relative group flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors py-2">
            <span>Product</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:rotate-180" />
          </div>
          <div className="relative group flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors py-2">
            <span>Use Cases</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:rotate-180" />
          </div>
          <Link href="#pricing" className="hover:text-blue-600 transition-colors">
            Pricing
          </Link>
          <div className="relative group flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors py-2">
            <span>Resources</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:rotate-180" />
          </div>
          <Link href="#about" className="hover:text-blue-600 transition-colors">
            About
          </Link>
        </nav>

        {/* Right CTA / Auth Controls */}
        <div className="hidden sm:flex items-center space-x-4">
          {!mounted ? (
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20"
            >
              Sign Up
            </Link>
          ) : (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3.5 py-2 transition-colors cursor-pointer">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <button className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer">
                    Sign Up Free
                  </button>
                </SignUpButton>
              </Show>

              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Go to Workspace
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
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3">
          <Link href="#product" className="block py-2 text-slate-700 font-medium">Product</Link>
          <Link href="#use-cases" className="block py-2 text-slate-700 font-medium">Use Cases</Link>
          <Link href="#pricing" className="block py-2 text-slate-700 font-medium">Pricing</Link>
          <Link href="#about" className="block py-2 text-slate-700 font-medium">About</Link>
          <div className="pt-4 flex flex-col gap-3 border-t border-slate-100">
            <Show when="signed-out">
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="w-full py-2.5 rounded-full border border-slate-300 text-slate-700 font-semibold text-center hover:bg-slate-50 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="w-full py-2.5 rounded-full bg-blue-600 text-white font-semibold text-center shadow-md hover:bg-blue-700 transition-colors">
                  Sign Up Free
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
