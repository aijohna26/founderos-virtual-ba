import { NextRequest, NextResponse } from "next/server";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Server GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    // Return the authorized Live configuration and WebSocket endpoint
    // without exposing raw credentials to arbitrary client scripts
    const host = "generativelanguage.googleapis.com";
    const path = "ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
    const wsUrl = `wss://${host}/${path}?key=${encodeURIComponent(apiKey)}`;

    return NextResponse.json({
      wsUrl,
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
