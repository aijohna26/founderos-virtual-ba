import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "founderally_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h -- an admin panel session, not a Clerk session.
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes once ADMIN_LOGIN_ATTEMPTS is exhausted.

interface AdminConfig {
  username: string;
  password: string;
  maxAttempts: number;
}

/** Returns null (feature disabled) if ADMIN_USER/ADMIN_PASS aren't set in .env.local. */
export function getAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;
  if (!username || !password) return null;

  const parsedAttempts = Number(process.env.ADMIN_LOGIN_ATTEMPTS);
  const maxAttempts = Number.isFinite(parsedAttempts) && parsedAttempts > 0 ? parsedAttempts : 3;

  return { username, password, maxAttempts };
}

function constantTimeEqual(a: string, b: string): boolean {
  // Hash both sides to a fixed length first so the comparison itself can't leak the real
  // length of ADMIN_USER/ADMIN_PASS via timing, then timingSafeEqual on the fixed-size digests.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const config = getAdminConfig();
  if (!config) return false;
  // Both sides always get compared (no short-circuit on the first mismatch) so a wrong
  // username can't be distinguished from a wrong password by response timing.
  const userOk = constantTimeEqual(username, config.username);
  const passOk = constantTimeEqual(password, config.password);
  return userOk && passOk;
}

// Session token key is derived from ADMIN_PASS rather than a separate secret, so no new env
// var is needed and rotating the admin password automatically invalidates every existing
// session. Domain-separated so this can never be confused with the venture-invite token HMAC.
function sessionSigningKey(config: AdminConfig): Buffer {
  return createHash("sha256").update(`${config.password}:admin-session-v1:${config.username}`).digest();
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createAdminSessionToken(): string | null {
  const config = getAdminConfig();
  if (!config) return null;
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const body = encode(payload);
  const signature = createHmac("sha256", sessionSigningKey(config)).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const config = getAdminConfig();
  if (!config) return false;

  const [body, suppliedSignature, extra] = token.split(".");
  if (!body || !suppliedSignature || extra) return false;

  const expectedSignature = createHmac("sha256", sessionSigningKey(config)).update(body).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return false;
  }
  if (expectedSignature.length !== supplied.length || !timingSafeEqual(expectedSignature, supplied)) {
    return false;
  }

  try {
    const payload = JSON.parse(decode(body)) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Process-local login rate limiting keyed by IP. This resets on server restart and isn't
// shared across serverless instances -- a reasonable bar for a single-admin internal panel
// gated by a password only you know, not a substitute for real distributed rate limiting.
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const config = getAdminConfig();
  const maxAttempts = config?.maxAttempts ?? 3;
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  if (entry.count >= maxAttempts && entry.lockedUntil <= Date.now()) {
    // Lockout window elapsed -- give them a fresh set of attempts.
    loginAttempts.delete(ip);
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const config = getAdminConfig();
  const maxAttempts = config?.maxAttempts ?? 3;
  const entry = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= maxAttempts) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(ip, entry);
}

export function recordSuccessfulLogin(ip: string): void {
  loginAttempts.delete(ip);
}

/** Shared guard for admin API routes: read the session cookie off a NextRequest-like object. */
export function isAdminRequest(request: { cookies: { get(name: string): { value: string } | undefined } }): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
