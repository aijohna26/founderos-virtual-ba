import { NextRequest, NextResponse } from "next/server";
import { reconcileStaleLiveSessions } from "@/lib/billing/liveUsage";

export const dynamic = "force-dynamic";

// Scheduled via vercel.json's `crons` entry (Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when that env var is set).
// Public in proxy.ts like the Stripe/Clerk webhooks -- Vercel's cron invoker carries no Clerk
// session, so this authenticates itself instead.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await reconcileStaleLiveSessions();
  return NextResponse.json(result);
}
