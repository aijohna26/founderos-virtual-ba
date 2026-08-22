import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AIOperationEntry } from "@/lib/agent/aiOperationsLog";

// lib/agent/aiOperationsLog.ts's AIOperationsLogger is "use client" (writes through
// PersistenceClient, a browser fetch wrapper) -- server-only code like
// lib/rag/companyKnowledgeContext.ts can't call it directly without a wasteful HTTP
// round-trip back into this same app. This writes the same ai_operation_logs row shape
// directly via getSupabaseAdmin(), for server-side callers only. Client-recorded and
// server-recorded entries are indistinguishable in the AI Ops dashboard by design -- same
// table, same columns -- so it's the venture's one, honest activity trail.
export async function logAIOperationServer(
  entry: Omit<AIOperationEntry, "id" | "timestamp"> & { userId: string },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin.from("ai_operation_logs").insert({
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: entry.userId,
    venture_id: entry.ventureId,
    ceremony: entry.ceremony,
    gemini_model: entry.geminiModel,
    tool_requested: entry.toolRequested,
    tool_arguments: entry.toolArguments,
    tool_result: entry.toolResult,
    reasoning_category: entry.reasoningCategory,
    latency_ms: entry.latencyMs,
    success: entry.success,
  });

  if (error) console.error("Failed to record server-side AI operation log:", error);
}
