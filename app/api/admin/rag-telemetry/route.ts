import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { getRagTelemetrySummary } from "@/lib/rag/ragTelemetry";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ventureId = request.nextUrl.searchParams.get("ventureId") ?? undefined;
  const summary = await getRagTelemetrySummary({ ventureId });

  if (!summary) {
    return NextResponse.json({ error: "RAG telemetry is not configured" }, { status: 503 });
  }
  return NextResponse.json(summary);
}
