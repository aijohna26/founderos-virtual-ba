import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Marketing/legal pages. /pricing in particular must stay public: <PricingTable />
  // needs signed-out visitors to reach it and pick a plan before Clerk's own
  // sign-up-then-checkout flow kicks in -- gating the page itself defeats that.
  "/pricing",
  "/privacy",
  "/terms",
  // Recipients must be able to inspect a signed invitation before signing in.
  // The PATCH handler still authenticates and verifies the invited Clerk email.
  "/invite(.*)",
  "/api/venture-invitations(.*)",
  "/api/ai-analyst(.*)",
  "/api/generate-venture-analysis(.*)",
  // This route performs its own Clerk auth so unsigned API callers receive JSON 401.
  "/api/persistence(.*)",
  // Clerk billing webhooks are signed with CLERK_WEBHOOK_SIGNING_SECRET, not a session,
  // so they must bypass auth.protect() here; the route itself calls verifyWebhook().
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (hasClerkKey && !isPublicRoute(req)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|webmanifest|ttf|woff2?|png|jpg|jpeg|gif|svg|ico|csv|docx?|xlsx?|zip)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
