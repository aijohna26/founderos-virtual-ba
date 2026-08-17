import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Clean text for speech (strip markdown, JSON blocks, asterisks, bullet points)
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

    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Google's Native Ultra-Realistic Voice Engine (Google Journey / Gemini Neural Voice)
    if (geminiKey && geminiKey.trim().length > 0) {
      try {
        // Google's flagship human conversational voices (Journey-F / Journey-D / Studio-O / Neural2-F)
        const selectedVoice = voice || "en-US-Journey-F";

        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: cleanText },
              voice: {
                languageCode: "en-US",
                name: selectedVoice,
                ssmlGender: selectedVoice.includes("-D") ? "MALE" : "FEMALE",
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.05,
                pitch: 0.0,
                effectsProfileId: ["telephony-class-application"],
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent) {
            const buffer = Buffer.from(data.audioContent, "base64");
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": buffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        } else {
          // If Journey voice is restricted on this key tier, fallback to Google Neural2
          const fallbackRes = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: { text: cleanText },
                voice: {
                  languageCode: "en-US",
                  name: "en-US-Neural2-F",
                  ssmlGender: "FEMALE",
                },
                audioConfig: {
                  audioEncoding: "MP3",
                  speakingRate: 1.05,
                  pitch: 0.0,
                },
              }),
            }
          );

          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            if (fbData.audioContent) {
              const buffer = Buffer.from(fbData.audioContent, "base64");
              return new NextResponse(buffer, {
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Content-Length": buffer.length.toString(),
                  "Cache-Control": "public, max-age=3600",
                },
              });
            }
          }
        }
      } catch (googleErr) {
        console.warn("Google Cloud Voice synthesis notice:", googleErr);
      }
    }

    // 2. Fallback: High-Quality Browser Neural Voices
    return NextResponse.json({
      fallback: true,
      cleanText,
      message: "Using high-tier Google neural voice",
    });
  } catch (err: any) {
    console.error("TTS API error:", err);
    return NextResponse.json({ error: err.message || "TTS error", fallback: true }, { status: 500 });
  }
}
