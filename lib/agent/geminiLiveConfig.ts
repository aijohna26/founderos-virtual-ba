import { Modality, Type, type FunctionDeclaration, type LiveConnectConfig } from "@google/genai";
import type { Venture } from "@/lib/store/ventureStore";
import type { FounderCommitment, LearningPattern } from "@/lib/store/commitmentStore";
import type { MemoryFact } from "@/lib/db/memoryService";
import type { AdvisorPersona } from "@/lib/config/advisorPersonas";

export interface GeminiLiveContext {
  venture: Venture;
  commitments: FounderCommitment[];
  learnings: LearningPattern[];
  memories: MemoryFact[];
  voiceName: string;
  advisor: Pick<AdvisorPersona, "name" | "title" | "style" | "voiceDirection">;
}

export const GEMINI_LIVE_TOOLS: FunctionDeclaration[] = [
  {
    name: "get_sprint_context",
    description: "Retrieve authoritative sprint, board, commitment, and learning context before reasoning about the founder's work.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_ticket",
    description: "Retrieve one ticket by its stable ID or an unambiguous title. Use this before mutating an uncertain ticket.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticketId: { type: Type.STRING, description: "Stable ticket ID, when known." },
        cardTitle: { type: Type.STRING, description: "Exact or unambiguous ticket title, when the ID is not known." },
      },
    },
  },
  {
    name: "create_ticket",
    description: "Create a concrete, actionable ticket on the Kanban board.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        column: { type: Type.STRING, enum: ["backlog", "today", "in_progress", "done", "blocked"] },
        category: { type: Type.STRING, enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"] },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
      },
      required: ["title"],
    },
  },
  {
    name: "update_ticket",
    description: "Update an existing ticket's title, description, priority, or category.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticketId: { type: Type.STRING },
        cardTitle: { type: Type.STRING },
        newTitle: { type: Type.STRING },
        description: { type: Type.STRING },
        priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        category: { type: Type.STRING, enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"] },
      },
    },
  },
  {
    name: "move_ticket",
    description: "Move one existing ticket to another Kanban column. Never claim success before receiving the tool result.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ticketId: { type: Type.STRING },
        cardTitle: { type: Type.STRING },
        toColumn: { type: Type.STRING, enum: ["backlog", "today", "in_progress", "done", "blocked"] },
      },
      required: ["toColumn"],
    },
  },
  {
    name: "record_commitment",
    description: "Persist an explicit founder commitment so it can be checked at the next stand-up.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        commitment: { type: Type.STRING },
        deadline: { type: Type.STRING },
        relatedTicketId: { type: Type.STRING },
      },
      required: ["commitment"],
    },
  },
  {
    name: "record_learning",
    description: "Persist a durable customer insight or founder delivery pattern that should influence later coaching.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: { type: Type.STRING },
        evidence: { type: Type.STRING },
        suggestedCoachingBehavior: { type: Type.STRING },
      },
      required: ["pattern"],
    },
  },
];

function summarizeCards(venture: Venture, column: keyof Venture["columns"]): string {
  const cards = venture.columns[column]?.items || [];
  return cards.length
    ? cards.map((card) => `${card.id}: ${card.title} (${card.priority || "Unprioritized"})`).join("; ")
    : "None";
}

export function buildGeminiLiveConfig(context: GeminiLiveContext): LiveConnectConfig {
  const { venture, commitments, learnings, memories, voiceName, advisor } = context;
  const memoryText = memories.length
    ? memories.slice(0, 12).map((item) => `[${item.category}/${item.confidence}] ${item.fact}`).join("\n")
    : "No persisted business facts yet.";
  const learningText = learnings.length
    ? learnings.slice(0, 8).map((item) => `${item.pattern} Evidence: ${item.evidence}`).join("\n")
    : "No persisted coaching patterns yet.";
  const commitmentText = commitments.length
    ? commitments.slice(0, 8).map((item) => `${item.id}: ${item.commitment} (deadline: ${item.deadline || "unspecified"})`).join("\n")
    : "No outstanding commitments.";

  return {
    responseModalities: [Modality.AUDIO],
    temperature: 0.35,
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName } },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    sessionResumption: {},
    systemInstruction: {
      role: "system",
      parts: [{
        text: `You are ${advisor.name}, ${advisor.title}, working with a solo founder during a live stand-up. Your coaching mode is ${advisor.style}. ${advisor.voiceDirection}

Your job is to keep the sprint focused, identify blockers, challenge work that does not support the sprint goal, create clear tickets, and hold the founder accountable to explicit commitments. Be conversational and concise: normally one to three spoken sentences. Distinguish facts from assumptions. Never say an action is complete until its tool result confirms success. After a successful tool result, acknowledge it naturally and ask the next useful stand-up question. After a failed result, explain the failure and ask for the information needed to recover.

VENTURE
Name: ${venture.name}
Stage: ${venture.stage}
Target customer: ${venture.targetCustomer}
Sprint: ${venture.currentSprint || 1}
Sprint goal: ${venture.problemStatement || "Validate primary customer demand"}

BOARD
Today: ${summarizeCards(venture, "today")}
In progress: ${summarizeCards(venture, "in_progress")}
Blocked: ${summarizeCards(venture, "blocked")}
Backlog: ${summarizeCards(venture, "backlog")}
Done: ${summarizeCards(venture, "done")}

OUTSTANDING COMMITMENTS
${commitmentText}

PERSISTED LEARNINGS
${learningText}

VENTURE MEMORY
${memoryText}

Begin by briefly referencing the most important outstanding commitment, blocker, or sprint-alignment risk. Use get_ticket before a mutation whenever the requested ticket is ambiguous.`,
      }],
    },
    tools: [{ functionDeclarations: GEMINI_LIVE_TOOLS }],
  };
}
