import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { listLtdPurchases } from "@/lib/billing/ltd";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const offerId = request.nextUrl.searchParams.get("offerId") ?? undefined;
  const purchases = await listLtdPurchases(offerId);
  return NextResponse.json({ purchases });
}
