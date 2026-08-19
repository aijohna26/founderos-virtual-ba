import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { activateLtdOffer, closeLtdOffer } from "@/lib/billing/ltd";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offerId } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  const action = body?.action;

  if (action !== "activate" && action !== "close") {
    return NextResponse.json({ error: "action must be 'activate' or 'close'" }, { status: 400 });
  }

  const result = action === "activate" ? await activateLtdOffer(offerId) : await closeLtdOffer(offerId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
