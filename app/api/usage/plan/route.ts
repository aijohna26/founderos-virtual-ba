import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserLtdPurchase } from "@/lib/billing/ltd";

// Client components (the Sidebar's plan badge, currently) can't call server-only lib
// functions directly, so this is the thin bridge: just enough to tell a Lifetime purchaser
// apart from everyone else, since ltd_purchases isn't something Clerk's own has() claims can
// ever reflect. Kept intentionally narrow -- Clerk plan claims (Free/Solo/Venture Pro) are
// already available client-side via useAuth()'s has(), so this only adds what's missing.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ltdPurchase = await getUserLtdPurchase(userId);
  return NextResponse.json({
    isLifetime: Boolean(ltdPurchase),
    foundingMemberNumber: ltdPurchase?.foundingMemberNumber ?? null,
  });
}
