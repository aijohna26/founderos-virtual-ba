"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface AccountRow {
  userId: string;
  email: string | null;
  costUsd: number;
  interactionCount: number;
}

interface LiveMinutesRow {
  userId: string;
  email: string | null;
  minutes: number;
}

interface CohortRow {
  releaseNumber: number;
  offerId: string;
  memberCount: number;
  revenueUsd: number;
  costUsd: number;
  marginUsd: number;
  marginPercent: number | null;
}

interface CapRow {
  userId: string;
  email: string | null;
  planSlug: string;
  usedMinutes: number;
  allowanceMinutes: number;
  percentUsed: number;
}

interface Summary {
  totalCostUsd: number;
  costByInteractionType: Record<string, number>;
  costByPlan: Record<string, number>;
  topAccounts: AccountRow[];
  liveMinutesByUser: LiveMinutesRow[];
  avgLiveSessionMinutes: number;
  ltdCohorts: CohortRow[];
  accountsApproachingCap: CapRow[];
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function accountLabel(row: { userId: string; email: string | null }): string {
  return row.email || row.userId;
}

export function AdminCostOpsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [plan, setPlan] = useState("");
  const [userId, setUserId] = useState("");

  const refresh = useCallback(async (filters: { from: string; to: string; plan: string; userId: string }) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", new Date(filters.from).toISOString());
    if (filters.to) params.set("to", new Date(filters.to).toISOString());
    if (filters.plan) params.set("plan", filters.plan);
    if (filters.userId) params.set("userId", filters.userId);

    const res = await fetch(`/api/admin/cost-ops?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to load cost data");
      return;
    }
    setSummary(data);
  }, []);

  useEffect(() => {
    // Data fetch on mount: setState here happens after the awaited fetch resolves, not
    // synchronously within this effect body -- same pattern already used elsewhere in this
    // app (e.g. AdminLtdDashboard's own load effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh({ from, to, plan, userId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const interactionTypeEntries = summary ? Object.entries(summary.costByInteractionType).sort((a, b) => b[1] - a[1]) : [];
  const planEntries = summary ? Object.entries(summary.costByPlan).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black">Cost Ops</h2>
        <p className="text-xs text-slate-400 font-medium">
          Estimated AI cost across text chat, Live Voice, and TTS -- see the pricing-verified
          flag in lib/config/aiPricingConfig.ts before trusting these for real margin calls.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          refresh({ from, to, plan, userId });
        }}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs"
          >
            <option value="">All plans</option>
            <option value="free_user">Free</option>
            <option value="solo_founder">Solo Founder</option>
            <option value="venture_pro">Venture Pro</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user_..."
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-mono"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 transition-colors"
        >
          Apply filters
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : summary ? (
        <>
          {/* Top-line stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total AI cost (filtered)</p>
              <p className="mt-1 text-2xl font-black">{formatUsd(summary.totalCostUsd)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Avg Live session length</p>
              <p className="mt-1 text-2xl font-black">{summary.avgLiveSessionMinutes.toFixed(1)} min</p>
              <p className="mt-1 text-[10px] text-slate-500">All Live sessions (Daily Call + Stand-up combined -- not stand-up-specific yet)</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Accounts near their cap</p>
              <p className="mt-1 text-2xl font-black">{summary.accountsApproachingCap.length}</p>
              <p className="mt-1 text-[10px] text-slate-500">80%+ of this period&apos;s Live allowance used</p>
            </div>
          </div>

          {/* Cost breakdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-bold mb-3">Cost by interaction type</h3>
              <div className="space-y-2">
                {interactionTypeEntries.length === 0 && <p className="text-xs text-slate-500">No data yet.</p>}
                {interactionTypeEntries.map(([type, cost]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 capitalize">{type.replace("_", " ")}</span>
                    <span className="font-bold">{formatUsd(cost)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-sm font-bold mb-3">Cost by plan</h3>
              <div className="space-y-2">
                {planEntries.length === 0 && <p className="text-xs text-slate-500">No data yet.</p>}
                {planEntries.map(([planSlug, cost]) => (
                  <div key={planSlug} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{planSlug}</span>
                    <span className="font-bold">{formatUsd(cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top accounts */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Top 10 most expensive accounts</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-5 py-2">Account</th>
                    <th className="px-5 py-2">Cost</th>
                    <th className="px-5 py-2">Interactions</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topAccounts.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-2.5 text-xs">{accountLabel(row)}</td>
                      <td className="px-5 py-2.5 text-xs font-bold">{formatUsd(row.costUsd)}</td>
                      <td className="px-5 py-2.5 text-xs text-slate-400">{row.interactionCount}</td>
                    </tr>
                  ))}
                  {summary.topAccounts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-sm text-slate-500">No data yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Live minutes by user */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">Live minutes by user</h3>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800 sticky top-0 bg-slate-900">
                    <th className="px-5 py-2">Account</th>
                    <th className="px-5 py-2">Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.liveMinutesByUser.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-2.5 text-xs">{accountLabel(row)}</td>
                      <td className="px-5 py-2.5 text-xs font-bold">{row.minutes.toFixed(1)}</td>
                    </tr>
                  ))}
                  {summary.liveMinutesByUser.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-5 py-6 text-center text-sm text-slate-500">No Live sessions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* LTD cohort economics */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold">LTD cohort economics</h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Revenue is real (Stripe payment amounts). Subscription revenue isn&apos;t available here --
                Clerk owns that -- so margin is only computable for Lifetime cohorts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-5 py-2">Release</th>
                    <th className="px-5 py-2">Members</th>
                    <th className="px-5 py-2">Revenue</th>
                    <th className="px-5 py-2">AI Cost</th>
                    <th className="px-5 py-2">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ltdCohorts.map((row) => (
                    <tr key={row.releaseNumber} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-2.5 font-bold">#{row.releaseNumber}</td>
                      <td className="px-5 py-2.5 text-xs">{row.memberCount}</td>
                      <td className="px-5 py-2.5 text-xs">{formatUsd(row.revenueUsd)}</td>
                      <td className="px-5 py-2.5 text-xs">{formatUsd(row.costUsd)}</td>
                      <td className="px-5 py-2.5 text-xs font-bold">
                        {formatUsd(row.marginUsd)}
                        {row.marginPercent !== null && (
                          <span className="ml-1.5 text-slate-400 font-normal">({row.marginPercent.toFixed(1)}%)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {summary.ltdCohorts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">No LTD cohorts yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Accounts approaching cap */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Accounts approaching their Live cap
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Always this period, regardless of the date filter above -- this reflects the same
                cap that&apos;s actually enforced right now. Plan is resolved from each account&apos;s
                real subscription state (Lifetime, then their active Clerk plan), falling back
                to Free only if no active subscription record exists locally yet.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-800">
                    <th className="px-5 py-2">Account</th>
                    <th className="px-5 py-2">Plan</th>
                    <th className="px-5 py-2">Used / Allowance</th>
                    <th className="px-5 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.accountsApproachingCap.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-5 py-2.5 text-xs">{accountLabel(row)}</td>
                      <td className="px-5 py-2.5 text-xs text-slate-400">{row.planSlug}</td>
                      <td className="px-5 py-2.5 text-xs">
                        {row.usedMinutes.toFixed(1)} / {row.allowanceMinutes} min
                      </td>
                      <td className="px-5 py-2.5 text-xs font-bold">
                        <span className={row.percentUsed >= 100 ? "text-rose-400" : "text-amber-400"}>
                          {row.percentUsed.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {summary.accountsApproachingCap.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-500">
                        No accounts near their cap right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
