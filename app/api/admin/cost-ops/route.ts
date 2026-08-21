import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getCostOpsSummary } from "@/lib/billing/costOps";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const summary = await getCostOpsSummary({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    planSlug: params.get("plan") ?? undefined,
    userId: params.get("userId") ?? undefined,
  });

  if (!summary) {
    return NextResponse.json({ error: "Cost data is not configured" }, { status: 503 });
  }
  return NextResponse.json(summary);
}
