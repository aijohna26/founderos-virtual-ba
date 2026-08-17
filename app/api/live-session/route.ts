import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import { buildGeminiLiveConfig, type GeminiLiveContext } from "@/lib/agent/geminiLiveConfig";
import { ADVISOR_PERSONAS } from "@/lib/config/advisorPersonas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (process.env.CLERK_SECRET_KEY) {
      const { isAuthenticated } = await auth();
      if (!isAuthenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Server GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Partial<GeminiLiveContext> & { advisorId?: string };
    const advisor = ADVISOR_PERSONAS.find((item) => item.id === body.advisorId);
    if (!body.venture || !advisor) {
      return NextResponse.json(
        { error: "Venture context and a supported advisor are required." },
        { status: 400 }
      );
    }

    const context: GeminiLiveContext = {
      venture: body.venture,
      commitments: Array.isArray(body.commitments) ? body.commitments : [],
      learnings: Array.isArray(body.learnings) ? body.learnings : [],
      memories: Array.isArray(body.memories) ? body.memories : [],
      voiceName: advisor.voiceName,
      advisor: {
        name: advisor.name,
        title: advisor.title,
        style: advisor.style,
        voiceDirection: advisor.voiceDirection,
      },
    };
    const liveConfig = buildGeminiLiveConfig(context);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const newSessionExpiresAt = new Date(Date.now() + 60 * 1000);
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: expiresAt.toISOString(),
        newSessionExpireTime: newSessionExpiresAt.toISOString(),
        liveConnectConstraints: {
          model: GEMINI_CONFIG.LIVE_MODEL,
          config: liveConfig,
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    if (!token.name) {
      throw new Error("Gemini did not return an ephemeral Live token.");
    }

    // The response contains a one-use, short-lived Gemini Live token. The
    // permanent GEMINI_API_KEY remains server-side and is never returned.
    return NextResponse.json({
      token: token.name,
      expiresAt: expiresAt.toISOString(),
      newSessionExpiresAt: newSessionExpiresAt.toISOString(),
      model: GEMINI_CONFIG.LIVE_MODEL,
      voice: context.voiceName,
      sampleRate: GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE,
    }, {
      headers: {
        "Cache-Control": "no-store, private",
        "Pragma": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("Live session authorization error:", error);
    return NextResponse.json(
      { error: "Failed to provision a Gemini Live session. The speech/text fallback remains available." },
      { status: 500 }
    );
  }
}
