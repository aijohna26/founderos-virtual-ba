import { NextResponse } from "next/server";
import { getActiveLtdOffer } from "@/lib/billing/ltd";

// Public: price/availability for the current Lifetime Deal offer, so /pricing can render it
// (or "Sold Out") for signed-out visitors too. No purchase data here -- see ltd_purchases'
// RLS policy for that, which is user-scoped and never exposed through this route.
export async function GET() {
  const offer = await getActiveLtdOffer();
  if (!offer) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    releaseNumber: offer.releaseNumber,
    priceCents: offer.priceCents,
    currency: offer.currency,
    remaining: Math.max(0, offer.quantityTotal - offer.quantitySold),
    quantityTotal: offer.quantityTotal,
    soldOut: offer.status === "sold_out" || offer.quantitySold >= offer.quantityTotal,
  });
}
