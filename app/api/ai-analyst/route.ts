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
        : "No prior memories recorded yet.";

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

    const systemPrompt = `You are FounderAlly, a world-class AI Business Analyst and autonomous co-pilot for early-stage startup founders.
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

Live Kanban Board State (You have full visibility and control):
- BACKLOG (${backlogCards.length}): ${backlogCards.map((c: any) => c.title).join("; ") || "Empty"}
- TODAY (${todayCards.length}): ${todayCards.map((c: any) => c.title).join("; ") || "Empty"}
- IN PROGRESS (${inProgressCards.length}): ${inProgressCards.map((c: any) => c.title).join("; ") || "Empty"}
- DONE (${doneCards.length}): ${doneCards.map((c: any) => c.title).join("; ") || "Empty"}
- BLOCKED (${blockedCards.length}): ${blockedCards.map((c: any) => c.title).join("; ") || "Empty"}

Long-Term Database Memory:
${formattedMemories}

Autonomous Board Actions & Ticket Creation Superpower:
You have the power to create and update tickets on the live board! When the founder asks you to create a ticket, add a card, move a card, or update tasks, you MUST include a JSON action block at the very end of your response formatted exactly like this:
\`\`\`json
{
  "actions": [
    { "type": "create_card", "column": "today", "title": "5 competitor pricing teardowns", "category": "Experiment", "priority": "High" },
    { "type": "move_card", "cardTitle": "Interactive 2D-to-3D Floorplan", "toColumn": "done" },
    { "type": "add_priority", "title": "Run 3 Studio Interviews", "tag": "Experiment", "priority": "High" }
  ]
}
\`\`\`

Supported Action Types:
- "create_card": column ("backlog"|"today"|"in_progress"|"done"|"blocked"), title, category ("Feature"|"Growth"|"Experiment"|"Research"|"Technical"|"Design"|"Legal"), priority ("High"|"Medium"|"Low")
- "move_card": cardTitle (substring or full title of the card to move), toColumn ("backlog"|"today"|"in_progress"|"done"|"blocked")
- "add_priority": title, tag ("Experiment"|"Technical"|"Growth"|"Research"), priority ("High"|"Medium"|"Low")
- "update_assumption": statement, status ("Testing"|"Supported"|"Rejected")

Voice Optimization Rules:
1. Speak directly, concisely, and naturally aloud (1-3 short paragraphs).
2. Proactively confirm any board action you take (e.g. "I've added the ticket to Today's list and marked it High priority.").
3. In morning standups, review blocked and in-progress tickets by name.`;

    // 1. Call Gemini API if available
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
            maxOutputTokens: 800,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawReply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I've analyzed your request. Let's validate the primary hypothesis.";

        // Extract JSON action block if present
        let cleanReply = rawReply;
        let actions: AIAction[] = [];

        const jsonMatch = rawReply.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (Array.isArray(parsed.actions)) {
              actions = parsed.actions;
            }
            // Strip JSON block from spoken reply
            cleanReply = rawReply.replace(/```json[\s\S]*?```/, "").trim();
          } catch (e) {
            console.error("Failed to parse AI action JSON:", e);
          }
        }

        return NextResponse.json({ reply: cleanReply, actions });
      }
    }

    // 2. High-Intelligence Fallback Engine with Real Action Synthesis
    const lower = message.toLowerCase();
    let reply = "";
    const actions: AIAction[] = [];

    // Check for "create card / ticket / task"
    if (
      lower.includes("create") ||
      lower.includes("add card") ||
      lower.includes("add ticket") ||
      lower.includes("add a card") ||
      lower.includes("add a ticket") ||
      lower.includes("add task") ||
      lower.includes("make a ticket") ||
      lower.includes("new ticket")
    ) {
      let targetColumn: AIAction["column"] = "today";
      if (lower.includes("backlog")) targetColumn = "backlog";
      else if (lower.includes("in progress")) targetColumn = "in_progress";
      else if (lower.includes("done")) targetColumn = "done";
      else if (lower.includes("blocked")) targetColumn = "blocked";

      // Extract card title from user message
      let extractedTitle = message
        .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(card|ticket|task)\s+(called|named|for|to)?/i, "")
        .replace(/(in|to|on)\s+(today|backlog|in progress|done|blocked)/gi, "")
        .trim();

      if (!extractedTitle || extractedTitle.length < 3) {
        extractedTitle = `Validate hypothesis for ${venture?.name || "startup"}`;
      }

      actions.push({
        type: "create_card",
        column: targetColumn,
        title: extractedTitle,
        category: lower.includes("experiment") ? "Experiment" : lower.includes("growth") ? "Growth" : lower.includes("tech") ? "Technical" : "Feature",
        priority: "High",
      });

      reply = `Done! I've created the card "${extractedTitle}" and placed it directly in ${targetColumn?.toUpperCase().replace("_", " ")}.\n\nLet's get this prioritized so we can de-risk our core assumptions.`;
    }
    // Check for "move card to done / today"
    else if (lower.includes("move") || lower.includes("mark as done") || lower.includes("finished") || lower.includes("completed")) {
      let targetCol: AIAction["toColumn"] = "done";
      if (lower.includes("today")) targetCol = "today";
      else if (lower.includes("backlog")) targetCol = "backlog";
      else if (lower.includes("in progress")) targetCol = "in_progress";
      else if (lower.includes("blocked")) targetCol = "blocked";

      // Find best matching card title
      const allCards = [...inProgressCards, ...todayCards, ...backlogCards, ...blockedCards, ...doneCards];
      const matched = allCards.find((c: any) =>
        lower.includes(c.title.toLowerCase().slice(0, 10))
      ) || inProgressCards[0] || todayCards[0];

      if (matched) {
        actions.push({
          type: "move_card",
          cardTitle: matched.title,
          toColumn: targetCol,
        });

        reply = `Fantastic progress! I've moved "${matched.title}" to ${targetCol?.toUpperCase().replace("_", " ")} and updated your Sprint velocity.\n\nWhat should we tackle next?`;
      } else {
        reply = `I've updated your board. Which specific card would you like me to move to ${targetCol?.toUpperCase()}?`;
      }
    }
    // Standup board walkthrough
    else if (lower.includes("standup") || lower.includes("walk through") || lower.includes("review cards") || lower.includes("board")) {
      const inProgText = inProgressCards.length > 0 ? inProgressCards.map((c: any) => `"${c.title}"`).join(", ") : "no cards currently in progress";
      const todayText = todayCards.length > 0 ? todayCards.map((c: any) => `"${c.title}"`).join(", ") : "no cards on today's agenda";
      const blockedText = blockedCards.length > 0 ? `⚠️ We have ${blockedCards.length} blocker: ${blockedCards.map((c: any) => `"${c.title}"`).join(", ")}.` : "We have zero active blockers.";

      reply = `Good morning founder! Let's do our standup for ${venture?.name || "your startup"}.\n\n` +
        `• Active In Progress: ${inProgText}\n` +
        `• Today's Focus: ${todayText}\n\n` +
        `${blockedText}\n\nTell me what you completed yesterday or say "Create a ticket for..." to add work to the board!`;
    }
    // Pricing & monetization analysis
    else if (lower.includes("price") || lower.includes("cost") || lower.includes("charge") || lower.includes("monetiz") || lower.includes("dollar")) {
      reply = `Let's analyze the pricing model for ${venture?.name || "your venture"}.\n\n` +
        `Key Risk: Founders frequently undercharge or copy competitors without testing willingness to pay. For ${venture?.targetCustomer || "your target users"}, if the tool doesn't save at least 5 hours per month, a recurring subscription will face heavy churn.\n\n` +
        `I recommend running a 5-interview pricing test before finalizing your tiers.`;
    } else {
      reply = `I've analyzed this in the context of ${venture?.name}.\n\n` +
        `Our immediate focus is de-risking: "${venture?.problemStatement || "validating the core opportunity"}".\n\n` +
        `You can tell me to "Create a ticket for XYZ", "Move XYZ to Done", or ask me to review our active board. What's on your mind?`;
    }

    return NextResponse.json({ reply, actions });
  } catch (error) {
    console.error("AI Analyst API Error:", error);
    return NextResponse.json(
      { reply: "I encountered an error analyzing your request. Please check your connection or try again." },
      { status: 500 }
    );
  }
}
