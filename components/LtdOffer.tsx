"use client";

import React, { useEffect, useState } from "react";
import { Crown, Loader2, Sparkle } from "lucide-react";
import { Show, SignUpButton } from "@clerk/nextjs";

interface LtdOfferState {
  active: boolean;
  releaseNumber?: number;
  priceCents?: number;
  currency?: string;
  remaining?: number;
  quantityTotal?: number;
  soldOut?: boolean;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// Separate from <PricingTable /> (recurring Clerk Billing plans) because the Lifetime Deal
// is a capped, one-time Stripe payment Clerk Billing has no concept of. Reads live
// price/availability from the public /api/ltd-offer route rather than hardcoding it, so this
// never drifts from what's actually configured in ltd_offers. Deliberately styled to stand
// apart from the blue subscription cards below it -- gold, larger, a corner ribbon -- since
// it's a scarce, one-time offer rather than another plan tier in the same list.
export function LtdOffer() {
  const [offer, setOffer] = useState<LtdOfferState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ltd-offer")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOffer(data);
      })
      .catch(() => {
        if (!cancelled) setOffer({ active: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!offer || !offer.active) return null;

  const soldOut = Boolean(offer.soldOut);
  const total = offer.quantityTotal ?? 0;
  const remaining = offer.remaining ?? 0;
  const claimedPercent = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/ltd", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Couldn't start checkout. Try again in a moment.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout. Try again in a moment.");
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Soft gold glow behind the card -- the one visual cue on this whole page that isn't blue. */}
      <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 rounded-[2rem] blur-2xl pointer-events-none" />

      <div className="relative rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-8 sm:p-10 text-center overflow-hidden shadow-2xl shadow-amber-500/10">
        {/* Corner ribbon */}
        <div className="absolute top-5 -right-11 rotate-45 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-10 py-1 shadow-md">
          Limited
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-400 font-bold text-xs uppercase tracking-wider mb-5">
          <Crown className="w-3.5 h-3.5" />
          <span>Founding Lifetime Membership · Release {offer.releaseNumber}</span>
        </div>

        <p className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
            {offer.priceCents !== undefined && offer.currency
              ? formatPrice(offer.priceCents, offer.currency)
              : ""}
          </span>
          <span className="text-base font-bold text-slate-400">one-time</span>
        </p>
        <p className="text-sm text-slate-300 mb-6 flex items-center justify-center gap-1.5">
          <Sparkle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          Pay once. Lifetime access. No recurring billing, ever.
        </p>

        {/* Claimed-slots progress bar -- makes scarcity visible, not just stated. */}
        <div className="max-w-sm mx-auto mb-7">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
              style={{ width: `${soldOut ? 100 : claimedPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-amber-300/90">
            {soldOut
              ? `All ${total} founding memberships claimed.`
              : `${remaining} of ${total} founding memberships left`}
          </p>
        </div>

        <Show when="signed-in">
          <button
            onClick={handleBuy}
            disabled={soldOut || loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-base px-10 py-4 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : soldOut ? (
              "Sold Out"
            ) : (
              "Buy Lifetime Deal"
            )}
          </button>
        </Show>
        <Show when="signed-out">
          <SignUpButton mode="modal" fallbackRedirectUrl="/pricing">
            <button
              disabled={soldOut}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-base px-10 py-4 shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] transition-all"
            >
              {soldOut ? "Sold Out" : "Sign up to buy"}
            </button>
          </SignUpButton>
        </Show>

        {error && <p className="mt-3 text-xs font-semibold text-rose-400">{error}</p>}
      </div>
    </div>
  );
}
