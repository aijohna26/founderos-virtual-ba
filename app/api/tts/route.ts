import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

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

    // Supported Google Gemini Prebuilt Neural Voices: Kore, Zephyr, Puck, Fenrir, Charon, Aoede
    const selectedVoice = voice || "Kore";

    // 1. Generate Voice using Google Gemini Speech Models via @google/genai SDK
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
          model: GEMINI_CONFIG.AUDIO_MODEL,
          contents: [{ role: "user", parts: [{ text: `Say in a natural, clear voice: "${cleanText}"` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: selectedVoice,
                },
              },
            },
          },
        });

        const candidates = response.candidates;
        if (candidates && candidates[0]?.content?.parts) {
          for (const part of candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || "audio/pcm;rate=24000";
              const rawAudioBuffer = Buffer.from(part.inlineData.data, "base64");

              const isRawPcm = /pcm|l16/i.test(mimeType);
              const returnBuffer = isRawPcm
                ? pcmToWav(rawAudioBuffer, GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE)
                : rawAudioBuffer;
              const returnMime = isRawPcm ? "audio/wav" : mimeType;

              return new NextResponse(returnBuffer as any, {
                headers: {
                  "Content-Type": returnMime,
                  "Content-Length": returnBuffer.length.toString(),
                  "Cache-Control": "no-store, private",
                },
              });
            }
          }
        }
      } catch (geminiAudioErr) {
        console.warn("GoogleGenAI speech synthesis notice:", geminiAudioErr);
      }
    }

    return NextResponse.json({ error: "Could not synthesize audio via Gemini" }, { status: 500 });
  } catch (err: any) {
    console.error("TTS Route Error:", err);
    return NextResponse.json({ error: err.message || "TTS Error" }, { status: 500 });
  }
}
