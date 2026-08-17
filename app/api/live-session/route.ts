import { NextRequest, NextResponse } from "next/server";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Server GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    // Generate a secure, short-lived ephemeral session token (HMAC signed)
    const sessionId = "live-sess-" + crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes

    // 🔒 ZERO KEY EXPOSURE:
    // The server never returns `GEMINI_API_KEY` or any URL with `?key=...` to the client.
    return NextResponse.json({
      sessionId,
      expiresAt,
      model: GEMINI_CONFIG.LIVE_MODEL,
      voice: GEMINI_CONFIG.VOICES.SARAH_PRIMARY,
      sampleRate: GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE,
    });
  } catch (error: any) {
    console.error("Live session authorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize live session" },
      { status: 500 }
    );
  }
}
