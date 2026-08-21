import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge, Crown, Sparkles } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { resolveLiveAllowance, getUsedMinutesThisPeriod, getCurrentPeriodStart } from "@/lib/billing/liveUsage";
import { getUserLtdPurchase } from "@/lib/billing/ltd";
import { MAX_LIVE_SESSION_MINUTES } from "@/lib/config/liveUsageConfig";

// Already gated: proxy.ts protects every route except the ones it explicitly lists as
// public, and "/usage" isn't one of them, so signed-out visitors are redirected to sign-in
// before this ever renders. The redirect() below is just a defensive fallback, not the real
// gate, for the same reason app/account/page.tsx doesn't duplicate that check either.

const PLAN_LABELS: Record<string, string> = {
  free_user: "Free",
  solo_founder: "Solo Founder",
  venture_pro: "Venture Pro",
  lifetime: "Lifetime",
};

function nextPeriodStart(periodStartIso: string): Date {
  const start = new Date(periodStartIso);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

function formatResetDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function UsagePage() {
  const { userId, has } = await auth();
  if (!userId || !has) {
    redirect("/sign-in");
  }

  const [ltdPurchase, allowance] = await Promise.all([
    getUserLtdPurchase(userId),
    resolveLiveAllowance(userId, has),
  ]);
  const usedMinutes = await getUsedMinutesThisPeriod(userId);

  const { planSlug, allowanceMinutes } = allowance;
  const planLabel = PLAN_LABELS[planSlug] ?? planSlug;
  const isLifetime = planSlug === "lifetime";
  const isFree = planSlug === "free_user";

  const periodStart = getCurrentPeriodStart();
  const resetsOn = formatResetDate(nextPeriodStart(periodStart));

  const percentUsed = usedMinutes !== null && allowanceMinutes > 0
    ? Math.min(100, (usedMinutes / allowanceMinutes) * 100)
    : null;
  const isNearCap = percentUsed !== null && percentUsed >= 80;
  const isAtCap = percentUsed !== null && percentUsed >= 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">Usage &amp; Plan</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            What your plan includes, and how much of it you&apos;ve used this month.
          </p>
        </div>

        <div className="space-y-5">
          {/* Plan card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isLifetime ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                {isLifetime ? <Crown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-base font-black text-slate-900">
                  {planLabel}
                  {isLifetime && ltdPurchase && (
                    <span className="ml-2 text-xs font-bold text-amber-600 align-middle">
                      Founding member #{String(ltdPurchase.foundingMemberNumber).padStart(3, "0")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isLifetime ? "One-time purchase -- no recurring billing" : "Current plan"}
                </p>
              </div>
            </div>
            {!isLifetime && (
              <Link
                href={isFree ? "/pricing" : "/account"}
                className="shrink-0 text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                {isFree ? "Upgrade" : "Manage billing"}
              </Link>
            )}
          </div>

          {/* Live Voice usage card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Live Voice minutes</h2>
            </div>

            {percentUsed === null ? (
              <p className="text-sm text-slate-500 font-medium">
                Usage isn&apos;t available right now -- this doesn&apos;t affect your ability to use Live Voice,
                only this page&apos;s display.
              </p>
            ) : (
              <>
                <div className="flex items-end justify-between mb-1.5">
                  <p className="text-2xl font-black text-slate-900">
                    {usedMinutes!.toFixed(0)}
                    <span className="text-sm font-bold text-slate-400"> / {allowanceMinutes} min</span>
                  </p>
                  <p className={`text-xs font-bold ${isAtCap ? "text-rose-600" : isNearCap ? "text-amber-600" : "text-slate-400"}`}>
                    {percentUsed.toFixed(0)}%
                  </p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isAtCap ? "bg-rose-500" : isNearCap ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-2">
                  Resets {resetsOn}. Each call is capped at {MAX_LIVE_SESSION_MINUTES} minutes -- start a new one
                  to keep going.
                </p>
                {isAtCap && (
                  <p className="text-xs font-semibold text-rose-600 mt-3">
                    You&apos;ve used this month&apos;s Live Voice minutes.{" "}
                    {isFree ? (
                      <Link href="/pricing" className="underline">Upgrade for more</Link>
                    ) : (
                      "More becomes available when this resets."
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
