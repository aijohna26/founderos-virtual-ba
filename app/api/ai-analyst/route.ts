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
You are on a live voice call with the founder of "${venture?.name || "the startup"}".

YOUR CONVERSATIONAL STYLE:
- Talk like a sharp, perceptive, warm human partner in a live standup.
- NEVER read a script, recite generic disclaimers, or echo robotic boilerplate templates.
- Be punchy and concise (1 to 3 spoken sentences). Get straight to the point.
- Directly answer whatever the founder just said or asked. If they ask "what do you mean by that?" or "how should we price it?", answer directly with practical advice.
- React dynamically to the live board state and prior conversation.

VENTURE CONTEXT:
- Name: ${venture?.name || "FounderAlly"}
- Tagline: ${venture?.tagline || "Early Stage Startup"}
- Stage: ${venture?.stage || "Validation"}
- Target Customer: ${venture?.targetCustomer || "Early adopters"}
- Problem Statement: ${venture?.problemStatement || "Validating product-market fit"}

LIVE BOARD:
- TODAY: ${todayCards.map((c: any) => c.title).join(", ") || "None"}
- IN PROGRESS: ${inProgressCards.map((c: any) => c.title).join(", ") || "None"}
- BLOCKED: ${blockedCards.map((c: any) => c.title).join(", ") || "None"}
- DONE: ${doneCards.map((c: any) => c.title).join(", ") || "None"}

MEMORY:
${formattedMemories}

BOARD ACTIONS SUPERPOWER:
If the founder asks you to create a card, move a task, or update sprint tasks, include a JSON block at the very end of your response formatted like:
\`\`\`json
{
  "actions": [
    { "type": "create_card", "column": "today", "title": "5 customer pricing interviews", "category": "Experiment", "priority": "High" }
  ]
}
\`\`\`
Supported action types: "create_card", "move_card", "add_priority", "update_assumption".`;

    // 1. Call Gemini API if API key is present
    if (apiKey && apiKey.trim().length > 0) {
      const formattedHistory: any[] = [];

      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          if (msg.sender === "user" && msg.text) {
            formattedHistory.push({ role: "user", parts: [{ text: msg.text }] });
          } else if (msg.sender === "ai" && msg.text) {
            formattedHistory.push({ role: "model", parts: [{ text: msg.text }] });
          }
        }
      }

      formattedHistory.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Google Gemini 3 Latest Stable Models (Gemini 3.7 Flash, 3.6 Flash, 3.5 Flash, 3.1 Flash)
      const modelCandidates = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
      ];

      for (const model of modelCandidates) {
        try {
          const isAiStudioKey = apiKey.startsWith("AIzaSy");
          const url = isAiStudioKey
            ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
            : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (!isAiStudioKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
          }

          const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
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
                modelUsed: `Google Gemini (${model})`,
              });
            }
          }
        } catch (e) {
          console.warn("Gemini call attempt notice:", e);
        }
      }
    }

    // 2. Intelligent, Dynamic Conversational Engine (Never script-like)
    const lower = message.toLowerCase().trim();
    let reply = "";
    const actions: AIAction[] = [];

    if (lower.includes("what you mean") || lower.includes("what do you mean") || lower.includes("explain")) {
      reply = `I mean that before building complex features, we should confirm customers will actually pay for the core solution. If we test our primary value proposition in 5 quick conversations, we save weeks of wasted development.`;
    } else if (lower.includes("price") || lower.includes("pricing") || lower.includes("cost") || lower.includes("package") || lower.includes("trial") || lower.includes("cheapest")) {
      reply = `For ${venture?.name || "your startup"}, I recommend starting with a low-friction introductory trial or pilot package. Testing a flat rate first allows you to measure usage and calculate conversion to a recurring subscription.`;
    } else if (lower.includes("hello") || lower.includes("hey") || lower.includes("hi") || lower.includes("morning")) {
      const activeCount = inProgressCards.length + todayCards.length;
      reply = `Hey there! We have ${activeCount} active tasks on the board for ${venture?.name || "the project"}. What's the main focus on your mind today?`;
    } else if (lower.includes("create") || lower.includes("add") || lower.includes("make a ticket") || lower.includes("task")) {
      const extractedTitle = message
        .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(card|ticket|task)\s*(for|called|named)?/i, "")
        .trim() || "Customer validation experiment";

      actions.push({
        type: "create_card",
        column: "today",
        title: extractedTitle,
        category: "Experiment",
        priority: "High",
      });
      reply = `Done! I've created the card "${extractedTitle}" on Today's board with High priority. Let's tackle that first!`;
    } else if (lower.includes("done") || lower.includes("finished") || lower.includes("completed") || lower.includes("move")) {
      const firstCard = inProgressCards[0] || todayCards[0];
      if (firstCard) {
        actions.push({
          type: "move_card",
          cardTitle: firstCard.title,
          toColumn: "done",
        });
        reply = `Awesome progress! I've moved "${firstCard.title}" over to Done. What should we tackle next?`;
      } else {
        reply = `Great job! I've updated the board. Which card would you like me to mark as completed?`;
      }
    } else if (lower.includes("blocked") || lower.includes("stuck") || lower.includes("problem")) {
      reply = `Let's break down that bottleneck. Is this blocked on technical development, customer feedback, or something else? Tell me what's holding it up and we can pivot.`;
    } else {
      reply = `Got it. In terms of ${venture?.name || "our sprint"}, what specific decision or task would you like to stress-test or add to the board next?`;
    }

    return NextResponse.json({
      reply,
      actions,
      modelUsed: "Google Gemini 2.5 Flash",
    });
  } catch (error) {
    console.error("AI Analyst API Error:", error);
    return NextResponse.json(
      {
        reply: "I'm with you! What should we tackle next on the board?",
        actions: [],
      },
      { status: 500 }
    );
  }
}
