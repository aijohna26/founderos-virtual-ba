import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/dashboard(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/ai-analyst(.*)",
  "/api/generate-venture-analysis(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

    if (hasClerkKey && !isPublicRoute(req)) {
      await auth.protect();
    }
  } catch (err) {
    console.warn("Middleware invocation fallback:", err);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|webmanifest|ttf|woff2?|png|jpg|jpeg|gif|svg|ico|csv|docx?|xlsx?|zip)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
