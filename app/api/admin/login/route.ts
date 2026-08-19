import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  checkLoginRateLimit,
  clientIp,
  createAdminSessionToken,
  getAdminConfig,
  recordFailedLogin,
  recordSuccessfulLogin,
  verifyAdminCredentials,
} from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  if (!getAdminConfig()) {
    return NextResponse.json(
      { error: "Admin login is not configured (set ADMIN_USER/ADMIN_PASS)" },
      { status: 503 },
    );
  }

  const ip = clientIp(request.headers);
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    const retryAfterSec = Math.ceil((rateLimit.retryAfterMs ?? 0) / 1000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${Math.ceil(retryAfterSec / 60)} minute(s).` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password || !verifyAdminCredentials(username, password)) {
    recordFailedLogin(ip);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  recordSuccessfulLogin(ip);
  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Admin login is not configured" }, { status: 503 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
