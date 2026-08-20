import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { estimateLiveCostUsd, estimateTextCostUsd, estimateTtsCostUsd } from "@/lib/config/aiPricingConfig";

export type AiInteractionType = "text_chat" | "live_voice" | "tts" | "document_processing" | "background_job";

interface RecordAiCostBase {
  userId?: string | null;
  ventureId?: string | null;
  planSlug?: string | null;
  sessionId?: string | null;
}

/**
 * Records one AI cost ledger entry. Best-effort: never throws into the caller's response
 * path -- a broken cost record shouldn't take down the actual AI reply. Returns silently
 * (with a console warning) if Supabase isn't configured, same convention as the rest of the
 * billing/usage modules in this app.
 */
async function insertLedgerEntry(row: {
  userId: string | null;
  ventureId: string | null;
  planSlug: string | null;
  sessionId: string | null;
  model: string;
  interactionType: AiInteractionType;
  inputTokens: number | null;
  outputTokens: number | null;
  liveInputMinutes: number | null;
  liveOutputMinutes: number | null;
  sessionDurationSeconds: number | null;
  documentProcessingUnits: number | null;
  estimatedCostUsd: number;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const id = `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await admin.from("ai_cost_ledger").insert({
    id,
    user_id: row.userId,
    venture_id: row.ventureId,
    plan_slug: row.planSlug,
    session_id: row.sessionId,
    model: row.model,
    interaction_type: row.interactionType,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    live_input_minutes: row.liveInputMinutes,
    live_output_minutes: row.liveOutputMinutes,
    session_duration_seconds: row.sessionDurationSeconds,
    document_processing_units: row.documentProcessingUnits,
    estimated_cost_usd: row.estimatedCostUsd,
  });

  if (error) console.error("Failed to record AI cost ledger entry:", error);
}

export async function recordTextChatCost(params: RecordAiCostBase & {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    await insertLedgerEntry({
      userId: params.userId ?? null,
      ventureId: params.ventureId ?? null,
      planSlug: params.planSlug ?? null,
      sessionId: params.sessionId ?? null,
      model: params.model,
      interactionType: "text_chat",
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      liveInputMinutes: null,
      liveOutputMinutes: null,
      sessionDurationSeconds: null,
      documentProcessingUnits: null,
      estimatedCostUsd: estimateTextCostUsd(params.model, params.inputTokens, params.outputTokens),
    });
  } catch (err) {
    console.error("recordTextChatCost failed:", err);
  }
}

export async function recordTtsCost(params: RecordAiCostBase & {
  model: string;
  outputMinutes: number;
}): Promise<void> {
  try {
    await insertLedgerEntry({
      userId: params.userId ?? null,
      ventureId: params.ventureId ?? null,
      planSlug: params.planSlug ?? null,
      sessionId: params.sessionId ?? null,
      model: params.model,
      interactionType: "tts",
      inputTokens: null,
      outputTokens: null,
      liveInputMinutes: null,
      liveOutputMinutes: params.outputMinutes,
      sessionDurationSeconds: null,
      documentProcessingUnits: null,
      estimatedCostUsd: estimateTtsCostUsd(params.outputMinutes),
    });
  } catch (err) {
    console.error("recordTtsCost failed:", err);
  }
}

export async function recordLiveVoiceCost(params: RecordAiCostBase & {
  model: string;
  inputMinutes: number;
  outputMinutes: number;
  sessionDurationSeconds: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): Promise<void> {
  try {
    await insertLedgerEntry({
      userId: params.userId ?? null,
      ventureId: params.ventureId ?? null,
      planSlug: params.planSlug ?? null,
      sessionId: params.sessionId ?? null,
      model: params.model,
      interactionType: "live_voice",
      inputTokens: params.inputTokens ?? null,
      outputTokens: params.outputTokens ?? null,
      liveInputMinutes: params.inputMinutes,
      liveOutputMinutes: params.outputMinutes,
      sessionDurationSeconds: params.sessionDurationSeconds,
      documentProcessingUnits: null,
      estimatedCostUsd: estimateLiveCostUsd(params.inputMinutes, params.outputMinutes),
    });
  } catch (err) {
    console.error("recordLiveVoiceCost failed:", err);
  }
}
