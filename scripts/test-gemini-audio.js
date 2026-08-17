const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

function getApiKey() {
  try {
    const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
    for (const line of envContent.split("\n")) {
      if (line.startsWith("GEMINI_API_KEY=")) {
        return line.split("=")[1].trim();
      }
    }
  } catch (e) {}
  return process.env.GEMINI_API_KEY;
}

async function testGeminiAudio() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("No GEMINI_API_KEY found in .env.local");
    return;
  }

  console.log("Testing native Gemini Speech Generation with @google/genai SDK (Voice: Kore)...");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Say exactly: 'Good morning Founder! I am Sarah, your Lead AI Business Analyst with Google Gemini Kore voice.'",
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore",
            },
          },
        },
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) {
          console.log("✅ SUCCESS! Received native Gemini Audio part! MimeType:", part.inlineData.mimeType, "Data bytes length:", part.inlineData.data?.length);
          return;
        }
      }
    }
    console.log("No audio part returned in response:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("Error generating Gemini audio:", err);
  }
}

testGeminiAudio();
