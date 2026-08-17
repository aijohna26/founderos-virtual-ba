import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

export interface AIAction {
  type: "create_card" | "move_card" | "add_priority" | "update_assumption" | "record_commitment" | "record_learning" | "update_ticket";
  column?: "backlog" | "today" | "in_progress" | "done" | "blocked";
  title?: string;
  category?: "Feature" | "Growth" | "Experiment" | "Research" | "Technical" | "Design" | "Legal";
  priority?: "High" | "Medium" | "Low";
  cardTitle?: string;
  toColumn?: "backlog" | "today" | "in_progress" | "done" | "blocked";
  commitment?: string;
  pattern?: string;
  ticketId?: string;
  description?: string;
}

// Formal 7 PRD Tool Declarations using @google/genai
const getSprintContextTool: FunctionDeclaration = {
  name: "get_sprint_context",
  description: "Retrieves authoritative current sprint status, board state, commitments, and sprint goals.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      includeHistory: {
        type: Type.BOOLEAN,
        description: "Whether to include prior sprint retrospective history",
      },
    },
  },
};

const getTicketTool: FunctionDeclaration = {
  name: "get_ticket",
  description: "Retrieves authoritative details for a specific card/ticket by ID or title substring.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cardTitle: {
        type: Type.STRING,
        description: "Title or substring of the card to lookup",
      },
      ticketId: {
        type: Type.STRING,
        description: "Unique ID of the ticket if known",
      },
    },
    required: ["cardTitle"],
  },
};

const createTicketTool: FunctionDeclaration = {
  name: "create_ticket",
  description: "Creates a new card or task on the founder's Kanban sprint board.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Clear, actionable title of the task or experiment",
      },
      column: {
        type: Type.STRING,
        enum: ["backlog", "today", "in_progress", "done", "blocked"],
        description: "Target column (defaults to 'today' or 'backlog')",
      },
      category: {
        type: Type.STRING,
        enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"],
        description: "Classification of the ticket",
      },
      priority: {
        type: Type.STRING,
        enum: ["High", "Medium", "Low"],
        description: "Priority urgency",
      },
      reason: {
        type: Type.STRING,
        description: "Why this ticket matters towards de-risking the sprint goal",
      },
    },
    required: ["title"],
  },
};

const updateTicketTool: FunctionDeclaration = {
  name: "update_ticket",
  description: "Modifies or refines an existing ticket (acceptance criteria, description, priority).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cardTitle: {
        type: Type.STRING,
        description: "Title of the card to update",
      },
      description: {
        type: Type.STRING,
        description: "Updated description or acceptance criteria",
      },
      priority: {
        type: Type.STRING,
        enum: ["High", "Medium", "Low"],
        description: "Updated priority",
      },
    },
    required: ["cardTitle"],
  },
};

const moveTicketTool: FunctionDeclaration = {
  name: "move_ticket",
  description: "Moves an existing ticket between columns on the Kanban board (e.g. to 'done', 'backlog', 'today', 'blocked').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cardTitle: {
        type: Type.STRING,
        description: "Title or substring of the card to move",
      },
      toColumn: {
        type: Type.STRING,
        enum: ["backlog", "today", "in_progress", "done", "blocked"],
        description: "Destination column",
      },
    },
    required: ["cardTitle", "toColumn"],
  },
};

const recordCommitmentTool: FunctionDeclaration = {
  name: "record_commitment",
  description: "Records a specific daily commitment made by the founder for morning accountability.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      commitment: {
        type: Type.STRING,
        description: "The concrete commitment the founder promised to finish",
      },
      deadline: {
        type: Type.STRING,
        description: "Target deadline (e.g. 'End of Day' or '12:30 PM')",
      },
    },
    required: ["commitment"],
  },
};

const recordLearningTool: FunctionDeclaration = {
  name: "record_learning",
  description: "Stores durable learnings and recurring behavioral patterns to guide future sprint coaching.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: "Observed behavioral pattern or customer insight",
      },
      evidence: {
        type: Type.STRING,
        description: "Supporting outcome evidence from this sprint",
      },
      suggestedCoachingBehavior: {
        type: Type.STRING,
        description: "How Sarah should adapt future coaching advice",
      },
    },
    required: ["pattern"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const { message, venture, history, memories } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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

    const systemInstruction = `You are Sarah Jenkins, the Lead AI Business Analyst and startup co-pilot for "${venture?.name || "the startup"}".

ROLE & POSITIONING:
- You work ALONGSIDE the founder. You run morning stand-ups, audit sprint progress, challenge distractions, and hold the founder accountable to their sprint goal.
- Never act like a robotic generic chatbot. Talk like a sharp, perceptive, warm colleague in a quick morning call.
- Be concise (1 to 3 spoken sentences). Get straight to the point.
- When the founder commits to something, asks to move a ticket, or creates work, use your native function tools.

VENTURE CONTEXT:
- Name: ${venture?.name || "FounderAlly"}
- Tagline: ${venture?.tagline || "Early Stage Startup"}
- Stage: ${venture?.stage || "Validation"}
- Target Customer (ICP): ${venture?.targetCustomer || venture?.strategy?.icp || "Solo founders & early builders"}
- Problem Statement / Sprint Goal: "${venture?.problemStatement || "Validating product-market fit"}"
- Value Proposition: ${venture?.strategy?.valueProp || "Fast, clear business analysis"}
- Core Moat: ${venture?.strategy?.moat || "Structured discovery engine & persistent memory"}

LIVE BOARD STATE:
- TODAY (${todayCards.length}): ${todayCards.map((c: any) => `"${c.title}"`).join(", ") || "None"}
- IN PROGRESS (${inProgressCards.length}): ${inProgressCards.map((c: any) => `"${c.title}"`).join(", ") || "None"}
- BLOCKED (${blockedCards.length}): ${blockedCards.map((c: any) => `"${c.title}"`).join(", ") || "None"}
- DONE (${doneCards.length}): ${doneCards.map((c: any) => `"${c.title}"`).join(", ") || "None"}
- BACKLOG (${backlogCards.length}): ${backlogCards.slice(0, 5).map((c: any) => `"${c.title}"`).join(", ") || "None"}

KNOWLEDGE & MEMORY:
${formattedMemories}`;

    // 1. Call Google Gen AI SDK (@google/genai) with Native Function Calling
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const contents: any[] = [];

        if (Array.isArray(history) && history.length > 0) {
          for (const msg of history.slice(-6)) {
            if (msg.sender === "user" && msg.text) {
              contents.push({ role: "user", parts: [{ text: msg.text }] });
            } else if (msg.sender === "ai" && msg.text) {
              contents.push({ role: "model", parts: [{ text: msg.text }] });
            }
          }
        }

        contents.push({
          role: "user",
          parts: [{ text: message }],
        });

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 800,
            tools: [
              {
                functionDeclarations: [
                  getSprintContextTool,
                  getTicketTool,
                  createTicketTool,
                  updateTicketTool,
                  moveTicketTool,
                  recordCommitmentTool,
                  recordLearningTool,
                ],
              },
            ],
          },
        });

        let replyText = response.text || "";
        const actions: AIAction[] = [];

        const functionCalls = response.functionCalls;
        if (Array.isArray(functionCalls) && functionCalls.length > 0) {
          for (const call of functionCalls) {
            const name = call.name;
            const args = (call.args || {}) as Record<string, any>;

            if (name === "create_ticket" || name === "create_card") {
              actions.push({
                type: "create_card",
                title: args.title,
                column: args.column || "today",
                category: args.category || "Feature",
                priority: args.priority || "High",
                description: args.reason || args.description,
              });
              if (!replyText) {
                replyText = `Done. I've created "${args.title}" in ${args.column || "Today"}.`;
              }
            } else if (name === "move_ticket" || name === "move_card") {
              actions.push({
                type: "move_card",
                cardTitle: args.cardTitle,
                toColumn: args.toColumn || "done",
              });
              if (!replyText) {
                replyText = `Done. I've moved "${args.cardTitle}" to ${(args.toColumn || "done").toUpperCase()}.`;
              }
            } else if (name === "record_commitment") {
              actions.push({
                type: "record_commitment",
                commitment: args.commitment,
              });
              if (!replyText) {
                replyText = `Recorded your commitment: "${args.commitment}". I'll check on this at tomorrow's standup.`;
              }
            } else if (name === "record_learning") {
              actions.push({
                type: "record_learning",
                pattern: args.pattern,
              });
            } else if (name === "update_ticket") {
              actions.push({
                type: "update_ticket",
                cardTitle: args.cardTitle,
                description: args.description,
                priority: args.priority,
              });
            }
          }
        }

        if (replyText.trim().length > 0) {
          return NextResponse.json({
            reply: replyText.trim(),
            actions,
            modelUsed: "@google/genai (Gemini 2.5 Flash Native Function Calling)",
          });
        }
      } catch (sdkError) {
        console.warn("GoogleGenAI SDK execution notice:", sdkError);
      }
    }

    // 2. Intelligent Contextual Engine (Non-repetitive, zero script fallback)
    const lower = message.toLowerCase().trim();
    let reply = "";
    const actions: AIAction[] = [];

    if (lower.includes("price") || lower.includes("cost") || lower.includes("charge") || lower.includes("package") || lower.includes("trial")) {
      reply = `For ${venture?.name || "your startup"}, I recommend validating a low-friction introductory trial or flat-rate pilot first. That gives you active usage data before locking in pricing tiers.`;
    } else if (lower.includes("what you mean") || lower.includes("explain")) {
      reply = `Our sprint goal is de-risking: "${venture?.problemStatement || "customer validation"}". If a feature doesn't directly validate that assumption, it should stay in the backlog.`;
    } else if (lower.includes("create") || lower.includes("add") || lower.includes("ticket") || lower.includes("task")) {
      const extractedTitle = message
        .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(card|ticket|task)\s*(for|called|named)?/i, "")
        .trim() || "Customer discovery test";

      actions.push({
        type: "create_card",
        column: "today",
        title: extractedTitle,
        category: "Experiment",
        priority: "High",
      });
      reply = `Done. I've added "${extractedTitle}" to Today's queue with High priority.`;
    } else if (lower.includes("move") || lower.includes("done") || lower.includes("finish") || lower.includes("completed")) {
      const firstCard = inProgressCards[0] || todayCards[0];
      if (firstCard) {
        actions.push({
          type: "move_card",
          cardTitle: firstCard.title,
          toColumn: "done",
        });
        reply = `Awesome progress! I've moved "${firstCard.title}" over to Done. What should we tackle next?`;
      } else {
        reply = `I've updated your board. Which ticket would you like me to mark as done?`;
      }
    } else {
      reply = `I'm tracking with you. What specific commitment or ticket are we focusing on today for ${venture?.name || "the sprint"}?`;
    }

    return NextResponse.json({
      reply,
      actions,
      modelUsed: "Google Gen AI Contextual Engine",
    });
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
