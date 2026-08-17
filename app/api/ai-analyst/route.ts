import { NextRequest, NextResponse } from "next/server";

export interface AIAction {
  type: "create_card" | "move_card" | "add_priority" | "update_assumption";
  column?: "backlog" | "today" | "in_progress" | "done" | "blocked";
  title?: string;
  category?: "Feature" | "Growth" | "Experiment" | "Research" | "Technical" | "Design" | "Legal";
  priority?: "High" | "Medium" | "Low";
  cardTitle?: string;
  toColumn?: "backlog" | "today" | "in_progress" | "done" | "blocked";
  tag?: string;
  statement?: string;
  status?: "Testing" | "Supported" | "Rejected";
}

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
        : "None recorded yet.";

    const getColItems = (col: any) => {
      if (!col) return [];
      const items = Array.isArray(col) ? col : Array.isArray(col.items) ? col.items : [];
      return items;
    };

    const backlogCards = getColItems(venture?.columns?.backlog);
    const todayCards = getColItems(venture?.columns?.today);
    const inProgressCards = getColItems(venture?.columns?.in_progress);
    const doneCards = getColItems(venture?.columns?.done);
    const blockedCards = getColItems(venture?.columns?.blocked);

    const systemPrompt = `You are Sarah, an expert AI Business Analyst and autonomous startup co-pilot.
You are talking in real-time over a voice call with the founder of "${venture?.name || "the startup"}".

YOUR CONVERSATIONAL STYLE:
- Talk like a sharp, perceptive, warm human partner in a live standup.
- NEVER sound like you are reading a script, reciting generic disclaimers, or echoing robotic templates.
- Be concise (1 to 3 spoken sentences). Get straight to the point.
- Directly answer whatever the founder just said or asked. If they ask "what do you mean by that?" or "how should we price it?", explain directly with practical advice.
- If the founder sounds uncertain, challenge assumptions constructively and suggest quick tests.

VENTURE CONTEXT:
- Name: ${venture?.name || "FounderAlly"}
- Tagline: ${venture?.tagline || "Early Stage Startup"}
- Stage: ${venture?.stage || "Validation"}
- Target Customer: ${venture?.targetCustomer || "Early adopters"}
- Problem Statement: ${venture?.problemStatement || "Validating product-market fit"}
- Assumptions: ${
      venture?.assumptions
        ?.map((a: { statement: string; status: string }) => `• [${a.status}] ${a.statement}`)
        .join("; ") || "None logged"
    }

LIVE BOARD:
- TODAY: ${todayCards.map((c: any) => c.title).join(", ") || "None"}
- IN PROGRESS: ${inProgressCards.map((c: any) => c.title).join(", ") || "None"}
- BLOCKED: ${blockedCards.map((c: any) => c.title).join(", ") || "None"}
- DONE: ${doneCards.map((c: any) => c.title).join(", ") || "None"}

MEMORY:
${formattedMemories}

BOARD ACTIONS SUPERPOWER:
If the founder asks you to create a card, move a task, or prioritize something, include a JSON block at the very end of your response formatted like:
\`\`\`json
{
  "actions": [
    { "type": "create_card", "column": "today", "title": "5 customer pricing interviews", "category": "Experiment", "priority": "High" }
  ]
}
\`\`\`
Supported actions: "create_card", "move_card", "add_priority", "update_assumption".`;

    // 1. Call Gemini API (using Google's newest production model)
    if (apiKey && apiKey.trim().length > 0) {
      // Build conversational history
      const formattedHistory: any[] = [];

      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-8)) {
          if (msg.sender === "user" && msg.text) {
            formattedHistory.push({ role: "user", parts: [{ text: msg.text }] });
          } else if (msg.sender === "ai" && msg.text) {
            formattedHistory.push({ role: "model", parts: [{ text: msg.text }] });
          }
        }
      }

      // Add current user message
      formattedHistory.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Google Gemini Production Models (Primary: gemini-2.5-flash)
      const modelCandidates = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash-exp",
      ];

      for (const model of modelCandidates) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const res = await fetch(geminiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: formattedHistory,
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1024,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (rawReply) {
              let cleanReply = rawReply;
              let actions: AIAction[] = [];

              const jsonMatch = rawReply.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch && jsonMatch[1]) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  if (Array.isArray(parsed.actions)) {
                    actions = parsed.actions;
                  }
                } catch (e) {}
                cleanReply = rawReply.replace(/```json[\s\S]*?```/g, "").trim();
              }

              return NextResponse.json({
                reply: cleanReply,
                actions,
                modelUsed: model,
              });
            }
          }
        } catch (modelErr) {
          console.warn(`Model ${model} fetch notice:`, modelErr);
        }
      }
    }

    // Dynamic contextual fallback
    const lower = message.toLowerCase();
    let reply = "";
    const actions: AIAction[] = [];

    if (lower.includes("price") || lower.includes("cost") || lower.includes("package") || lower.includes("charge")) {
      reply = `When pricing for ${venture?.name || "your startup"}, the biggest mistake is guessing before testing. For ${venture?.targetCustomer || "your target users"}, I'd test a low-friction pilot package first, like an introductory trial, then validate if willingness to pay holds up.`;
    } else if (lower.includes("what you mean") || lower.includes("explain") || lower.includes("why")) {
      reply = `In early validation, we want to test the riskiest assumption first before writing code or spending money. If our core user won't buy or use the solution, nothing else matters yet.`;
    } else if (lower.includes("create") || lower.includes("add task") || lower.includes("ticket")) {
      const extractedTitle = message.replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(card|ticket|task)\s*(for|called|named)?/i, "").trim() || "Customer discovery test";
      actions.push({
        type: "create_card",
        column: "today",
        title: extractedTitle,
        category: "Experiment",
        priority: "High",
      });
      reply = `Got it, I've created the card "${extractedTitle}" on Today's board. Let's tackle that first!`;
    } else {
      reply = `I hear you. Let's look at ${venture?.name || "your sprint"}. What's the biggest blocker on your mind right now?`;
    }

    return NextResponse.json({ reply, actions, modelUsed: "contextual-engine" });
  } catch (error) {
    console.error("AI Analyst API Error:", error);
    return NextResponse.json(
      {
        reply: "I'm with you. What should we tackle next on the board?",
        actions: [],
      },
      { status: 500 }
    );
  }
}
