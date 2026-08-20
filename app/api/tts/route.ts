import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import { findAdvisorByVoice } from "@/lib/config/advisorPersonas";
import { recordTtsCost } from "@/lib/billing/aiCostLedger";

// Convert 24kHz 1-channel 16-bit PCM buffer to standard WAV format
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  // RIFF identifier
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);

  // format chunk identifier
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // format chunk length
  header.writeUInt16LE(1, 20); // sample format: 1 (PCM)
  header.writeUInt16LE(numChannels, 22); // channel count
  header.writeUInt32LE(sampleRate, 24); // sample rate
  header.writeUInt32LE(byteRate, 28); // byte rate
  header.writeUInt16LE(blockAlign, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample

  // data chunk identifier
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // This route is gated by proxy.ts (a Clerk session is required to reach it at all), so
    // userId here should reliably resolve when Clerk is configured -- unlike /api/ai-analyst,
    // which is intentionally public and treats this the same lookup as best-effort.
    let userId: string | null = null;
    if (process.env.CLERK_SECRET_KEY) {
      try {
        const authResult = await auth();
        userId = authResult.userId ?? null;
      } catch {
        // Fall through -- cost just won't be attributed to a user for this call.
      }
    }

    // Clean markdown, JSON blocks, asterisks, bullet points from spoken text
    const cleanText = text
      .replace(/```json[\s\S]*?```/gi, "")
      .replace(/```[\s\S]*?```/gi, "")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(\*|_)(.*?)\1/g, "$2")
      .replace(/#+\s/g, "")
      .replace(/`{1,3}.*?`{1,3}/g, "")
      .replace(/[•●▪-]\s/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\{"actions":[\s\S]*?\}/gi, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "No speakable text" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const advisor = findAdvisorByVoice(typeof voice === "string" ? voice : undefined);
    const selectedVoice = advisor.voiceName;

    // 1. Generate Voice using Google Gemini Speech Models via @google/genai SDK
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.interactions.create({
          model: GEMINI_CONFIG.AUDIO_MODEL,
          input: `${advisor.voiceDirection}\nRead this naturally and exactly as written:\n${cleanText}`,
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice: selectedVoice }],
          },
        });

        const audio = response.output_audio;
        if (audio?.data) {
          const mimeType = audio.mime_type || "audio/l16";
          const sampleRate = audio.sample_rate || GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE;
          const rawAudioBuffer = Buffer.from(audio.data, "base64");
          const isRawPcm = /pcm|l16/i.test(mimeType);
          const returnBuffer = isRawPcm
            ? pcmToWav(rawAudioBuffer, sampleRate)
            : rawAudioBuffer;
          const returnMime = isRawPcm ? "audio/wav" : mimeType;

          // Measured from the actual PCM buffer (16-bit mono, 2 bytes/sample) rather than
          // estimated from token usage -- more accurate for audio, and what
          // estimateTtsCostUsd expects (Gemini audio pricing is quoted per minute, not per
          // token). Awaited, not fire-and-forget: this can run on a serverless function that
          // suspends the instant the response is sent.
          const durationMinutes = rawAudioBuffer.length / (sampleRate * 2) / 60;
          await recordTtsCost({
            userId,
            model: GEMINI_CONFIG.AUDIO_MODEL,
            outputMinutes: durationMinutes,
          });

          return new NextResponse(new Uint8Array(returnBuffer), {
            headers: {
              "Content-Type": returnMime,
              "Content-Length": returnBuffer.length.toString(),
              "Cache-Control": "no-store, private",
            },
          });
        }
      } catch (geminiAudioErr) {
        console.warn("GoogleGenAI speech synthesis notice:", geminiAudioErr);
      }
    }

    return NextResponse.json({ error: "Could not synthesize audio via Gemini" }, { status: 500 });
  } catch (err: unknown) {
    console.error("TTS Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TTS Error" },
      { status: 500 }
    );
  }
}
