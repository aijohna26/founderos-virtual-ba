import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, venture, history, memories } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    const formattedMemories =
      memories && memories.length > 0
        ? memories.map((m: { category: string; fact: string }) => `• [${m.category}] ${m.fact}`).join("\n")
        : "No prior memories recorded yet.";

    const systemPrompt = `You are FounderAlly, a world-class AI Business Analyst working alongside early-stage startup founders.
Your core promise: "Your AI Business Analyst for every founder decision."

Current Venture Context:
- Venture Name: ${venture?.name || "Founder Venture"}
- Tagline: ${venture?.tagline || "Early Stage Startup"}
- Stage: ${venture?.stage || "Discovery & Validation"}
- Target Customer (ICP): ${venture?.targetCustomer || "Not specified yet"}
- Problem Statement: ${venture?.problemStatement || "Not specified yet"}
- Known Assumptions (${venture?.assumptions?.length || 0}): ${
      venture?.assumptions
        ?.map((a: { statement: string; status: string }) => `• [${a.status}] ${a.statement}`)
        .join("\n") || "None logged yet"
    }

Long-Term Database Memory & Established Facts:
${formattedMemories}

Core Operating Principles:
1. Ask before assuming: If crucial details are missing, ask sharp clarifying questions instead of guessing.
2. Challenge the founder: Point out risky assumptions, lack of willingness-to-pay evidence, or scope creep.
3. Evidence over opinion: Suggest concrete validation experiments (e.g. 5 problem interviews, smoke test landing pages, pre-sales).
4. Convert conversation into work: Proactively suggest actionable tasks or risk items when applicable.
5. Voice Optimization: Keep responses clear, natural to speak aloud, and punchy (1-3 short paragraphs max, avoid excessive symbols).`;

    // If Gemini API Key is available, call Gemini
    if (apiKey && apiKey.trim().length > 0) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const contents = [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nUser Question/Speech: ${message}` }],
        },
      ];

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I've analyzed your input. Let's validate the primary hypothesis before proceeding.";
        return NextResponse.json({ reply });
      }
    }

    // High-intelligence contextual fallback engine
    const lower = message.toLowerCase();
    let reply = "";

    if (lower.includes("price") || lower.includes("cost") || lower.includes("charge") || lower.includes("monetiz") || lower.includes("dollar")) {
      reply = `Let's analyze the pricing model for ${venture?.name || "your venture"}.\n\n` +
        `Key Risk: Founders frequently undercharge or copy competitors without testing willingness to pay. For ${venture?.targetCustomer || "your target users"}, if the tool doesn't save at least 5 hours per month, a recurring subscription will face heavy churn.\n\n` +
        `I recommend running a 5-interview pricing test before finalizing your tiers.`;
    } else if (lower.includes("competitor") || lower.includes("alternative") || lower.includes("market")) {
      reply = `Looking at the competitive landscape for ${venture?.name || "your startup"}:\n\n` +
        `Your primary competitor isn't just other software — it is the manual workaround or spreadsheet your customer currently tolerates.\n\n` +
        `What is the specific bottleneck that makes your solution 10x faster or more reliable than their existing habit?`;
    } else if (lower.includes("mvp") || lower.includes("feature") || lower.includes("build") || lower.includes("code")) {
      reply = `Regarding the MVP for ${venture?.name}:\n\n` +
        `Let's focus strictly on solving "${venture?.problemStatement || "the core pain point"}".\n\n` +
        `I recommend cutting all secondary integrations from this sprint and prioritizing only the primary user journey.`;
    } else if (lower.includes("interview") || lower.includes("customer") || lower.includes("user")) {
      reply = `Great initiative on customer discovery. When interviewing ${venture?.targetCustomer || "prospects"}, avoid asking hypothetical questions like "Would you use this?".\n\n` +
        `Instead, ask: "When was the last time you experienced this problem, and what did it cost you to fix?" That reveals actual willingness to pay.`;
    } else {
      reply = `I've analyzed this in the context of ${venture?.name}.\n\n` +
        `Our immediate focus is de-risking: "${venture?.problemStatement || "validating the core opportunity"}".\n\n` +
        `What is the biggest roadblock or assumption you want to stress-test next?`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI Analyst API Error:", error);
    return NextResponse.json(
      { reply: "I encountered an error analyzing your request. Please check your connection or try again." },
      { status: 500 }
    );
  }
}
