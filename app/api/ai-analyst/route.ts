import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

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
        description: "How the advisor should adapt future coaching advice",
      },
    },
    required: ["pattern"],
  },
};

function normalizeInteractionSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeInteractionSchema);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      key === "type" && typeof item === "string"
        ? item.toLowerCase()
        : normalizeInteractionSchema(item),
    ])
  );
}

const interactionTools = [
  getSprintContextTool,
  getTicketTool,
  createTicketTool,
  updateTicketTool,
  moveTicketTool,
  recordCommitmentTool,
  recordLearningTool,
].map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: normalizeInteractionSchema(tool.parameters),
}));

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

    const systemInstruction = `You are FounderAlly's Lead AI Business Advisor and startup co-pilot for "${venture?.name || "the startup"}".

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

        const priorHistory = Array.isArray(history)
          ? history
              .slice(-7)
              .filter((item: { sender?: string; text?: string }, index: number, items: Array<{ sender?: string; text?: string }>) => {
                const isDuplicatedCurrentMessage =
                  index === items.length - 1 &&
                  item.sender === "user" &&
                  item.text?.trim() === message.trim();
                return Boolean(item.text) && !isDuplicatedCurrentMessage;
              })
              .map((item: { sender?: string; text?: string }) =>
                `${item.sender === "ai" ? "ADVISOR" : "FOUNDER"}: ${item.text}`
              )
              .join("\n")
          : "";
        const interactionInput = priorHistory
          ? `RECENT CONVERSATION\n${priorHistory}\n\nCURRENT FOUNDER MESSAGE\n${message}`
          : message;

        let response: Awaited<ReturnType<typeof ai.interactions.create>> | null = null;
        let modelUsed = "";
        let lastModelError: unknown;
        for (const model of GEMINI_CONFIG.TEXT_MODELS) {
          try {
            response = await ai.interactions.create({
              model,
              input: interactionInput,
              system_instruction: systemInstruction,
              tools: interactionTools,
              generation_config: { max_output_tokens: 800 },
            });
            modelUsed = model;
            break;
          } catch (modelError) {
            lastModelError = modelError;
            console.warn(`Gemini text model ${model} unavailable; trying the next candidate.`);
          }
        }
        if (!response) throw lastModelError || new Error("No configured Gemini text model was available");

        let replyText = response.output_text || "";
        const actions: AIAction[] = [];

        const functionCalls = (response.steps || []).filter(
          (step) => step.type === "function_call"
        );
        if (Array.isArray(functionCalls) && functionCalls.length > 0) {
          for (const call of functionCalls) {
            const name = call.name;
            const args = (call.arguments || {}) as Record<string, any>;

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
            modelUsed,
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
    } else if (lower.includes("commit") || lower.startsWith("i'll ") || lower.startsWith("i will ")) {
      const commitment = message
        .replace(/^(i(?:\s+will|'ll)\s+|my commitment is\s+|record (my|a) commitment( to)?\s*)/i, "")
        .trim();
      actions.push({
        type: "record_commitment",
        commitment: commitment || message.trim(),
      });
      reply = `I'll record that commitment for the next stand-up: "${commitment || message.trim()}".`;
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
      const requestedTitle = message.match(/move\s+(?:the\s+)?(.+?)\s+to\s+(?:the\s+)?(?:backlog|today|in[ _-]?progress|done|blocked)/i)?.[1]?.trim();
      const requestedColumn = lower.includes("backlog")
        ? "backlog"
        : lower.includes("blocked")
        ? "blocked"
        : /in[ _-]?progress/.test(lower)
        ? "in_progress"
        : lower.includes("today")
        ? "today"
        : "done";
      const allCards = [...backlogCards, ...todayCards, ...inProgressCards, ...doneCards, ...blockedCards];
      const selectedCard = requestedTitle
        ? allCards.find((card) => card.title.toLowerCase() === requestedTitle.toLowerCase()) ||
          allCards.find((card) => card.title.toLowerCase().includes(requestedTitle.toLowerCase()))
        : inProgressCards[0] || todayCards[0];
      if (selectedCard) {
        actions.push({
          type: "move_card",
          cardTitle: selectedCard.title,
          toColumn: requestedColumn,
        });
        reply = `I'll move "${selectedCard.title}" to ${requestedColumn.replace("_", " ")}.`;
      } else {
        reply = `I couldn't resolve that ticket safely. Which exact ticket should I move?`;
      }
    } else if (/\b(hello|hi|hey|good morning|good afternoon)\b/.test(lower)) {
      const activeCard = inProgressCards[0]?.title || todayCards[0]?.title;
      reply = activeCard
        ? `Good to hear you. The active focus for ${venture?.name || "this sprint"} is "${activeCard}". What changed since the last check-in?`
        : `Good to hear you. ${venture?.name || "This sprint"} has no active ticket yet—tell me the outcome you want today and I'll turn it into one.`;
    } else if (/\b(blocked|blocker|stuck|problem|issue)\b/.test(lower)) {
      const existingBlocker = blockedCards[0]?.title;
      reply = existingBlocker
        ? `The board already shows "${existingBlocker}" as blocked. Tell me what is preventing progress and the decision or person needed to unblock it.`
        : `I don't see a blocked ticket on the board yet. Name the affected ticket and what is stopping it, and I'll help make the blocker explicit.`;
    } else if (/\b(priority|prioritise|prioritize|focus|next)\b/.test(lower)) {
      const focusCard = inProgressCards[0]?.title || todayCards[0]?.title || backlogCards[0]?.title;
      reply = focusCard
        ? `Based on the current board, "${focusCard}" is the clearest next focus because it is closest to the active sprint. What outcome will prove it is done?`
        : `The board is empty, so the next priority should be the smallest test of "${venture?.problemStatement || "the core customer problem"}".`;
    } else if (/\b(status|standup|progress|today|board)\b/.test(lower)) {
      reply = `${venture?.name || "The venture"} currently has ${inProgressCards.length} in progress, ${todayCards.length} planned today, ${blockedCards.length} blocked, and ${doneCards.length} done. ${blockedCards.length > 0 ? `Start with "${blockedCards[0].title}".` : inProgressCards.length > 0 ? `The immediate focus is "${inProgressCards[0].title}".` : "Choose one Today ticket to start."}`;
    } else {
      const captured = message.trim().replace(/\s+/g, " ").slice(0, 140);
      const sprintFocus = inProgressCards[0]?.title || todayCards[0]?.title || venture?.problemStatement;
      reply = sprintFocus
        ? `You raised: "${captured}". The current sprint focus is "${sprintFocus}"—should this become a ticket, a commitment, or a decision against that goal?`
        : `You raised: "${captured}". Tell me whether you want it captured as a ticket, a commitment, or a business learning.`;
    }

    return NextResponse.json({
      reply,
      actions,
      modelUsed: "FounderAlly local fallback",
      degraded: true,
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
