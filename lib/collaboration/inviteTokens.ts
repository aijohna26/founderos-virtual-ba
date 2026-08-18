import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export interface VentureInviteTokenPayload {
  invitationId: string;
  ventureId: string;
  ownerUserId: string;
  email: string;
  expiresAt: string;
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createVentureInviteToken(payload: VentureInviteTokenPayload, secret: string): string {
  if (secret.length < 32) throw new Error("INVITE_TOKEN_SECRET must be at least 32 characters");
  const body = encode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyVentureInviteToken(token: string, secret: string): VentureInviteTokenPayload | null {
  if (secret.length < 32) return null;
  const [body, suppliedSignature, extra] = token.split(".");
  if (!body || !suppliedSignature || extra) return null;
  const expectedSignature = createHmac("sha256", secret).update(body).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (expectedSignature.length !== supplied.length || !timingSafeEqual(expectedSignature, supplied)) return null;
  try {
    const payload = JSON.parse(decode(body)) as VentureInviteTokenPayload;
    if (!payload.invitationId || !payload.ventureId || !payload.ownerUserId || !payload.email || !payload.expiresAt) return null;
    if (Date.parse(payload.expiresAt) <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

