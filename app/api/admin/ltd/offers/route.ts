import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { createLtdOffer, listLtdOffers } from "@/lib/billing/ltd";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const offers = await listLtdOffers();
  return NextResponse.json({ offers });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    offerId?: unknown;
    releaseNumber?: unknown;
    priceCents?: unknown;
    quantityTotal?: unknown;
  } | null;

  const offerId = typeof body?.offerId === "string" ? body.offerId.trim() : "";
  const releaseNumber = Number(body?.releaseNumber);
  const priceCents = Number(body?.priceCents);
  const quantityTotal = Number(body?.quantityTotal);

  if (
    !offerId || offerId.length > 64 ||
    !Number.isInteger(releaseNumber) || releaseNumber <= 0 ||
    !Number.isInteger(priceCents) || priceCents <= 0 ||
    !Number.isInteger(quantityTotal) || quantityTotal <= 0
  ) {
    return NextResponse.json({ error: "Invalid offer" }, { status: 400 });
  }

  const result = await createLtdOffer({ offerId, releaseNumber, priceCents, quantityTotal });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
