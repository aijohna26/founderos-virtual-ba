import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { endLiveUsageSession } from "@/lib/billing/liveUsage";

// Finalizes a live_usage_sessions row's ended_at using the server's own clock -- called on
// normal disconnect and, via navigator.sendBeacon, on tab close/crash (see
// GeminiLiveService.endUsageSession). Uses the same Clerk session cookie as every other
// route here, which sendBeacon includes automatically for same-origin requests.
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  await endLiveUsageSession(sessionId, userId);
  return NextResponse.json({ success: true });
}
