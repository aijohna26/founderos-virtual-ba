// Cost-per-unit table backing the AI cost ledger (docs/founderally-next-implementation-todo.md
// P0 #6). Centralized so nothing hardcodes a $ figure at the call site.
//
// IMPORTANT: these are placeholder estimates, not verified current Google pricing. The
// models this app targets (gemini-3.7-flash, gemini-3.1-flash-live-preview,
// gemini-3.1-flash-tts-preview, see lib/config/geminiConfig.ts) are recent enough that their
// actual published per-token/per-minute rates should be checked against
// https://ai.google.dev/gemini-api/docs/pricing before any real margin/gross-cost decision
// is made from this ledger's estimatedCostUsd numbers. Treat them as "roughly this order of
// magnitude," not "accurate to the cent," until verified and this comment is updated.
//
// PRICING_VERIFIED: false -- last touched 2026-08-21, numbers not checked against a live
// Google pricing page. Whoever verifies these against real rates should flip this to true
// and update the date; whoever next changes a model in lib/config/geminiConfig.ts without
// updating the corresponding row here should flip it back to false.
export const PRICING_VERIFIED = false;
export const PRICING_LAST_UPDATED = "2026-08-21";

export interface ModelPricing {
  /** USD per 1,000,000 input tokens. */
  inputPerMillionUsd: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillionUsd: number;
}

export const TEXT_MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-3.7-flash": { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  "gemini-flash-latest": { inputPerMillionUsd: 0.10, outputPerMillionUsd: 0.40 },
  "gemini-3.1-flash-lite": { inputPerMillionUsd: 0.04, outputPerMillionUsd: 0.15 },
};

export const DEFAULT_TEXT_MODEL_PRICING: ModelPricing = TEXT_MODEL_PRICING["gemini-3.7-flash"];

// Audio (Live + TTS) is priced per minute here rather than per token -- Gemini's audio
// pricing is generally quoted that way, and it's what the rest of this app already measures
// (live_usage_sessions tracks session duration, not audio tokens).
export const LIVE_AUDIO_USD_PER_MINUTE = {
  input: 0.02,
  output: 0.08,
};
export const TTS_AUDIO_USD_PER_MINUTE = 0.08;

export function estimateTextCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = TEXT_MODEL_PRICING[model] ?? DEFAULT_TEXT_MODEL_PRICING;
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillionUsd +
    (outputTokens / 1_000_000) * pricing.outputPerMillionUsd
  );
}

export function estimateLiveCostUsd(inputMinutes: number, outputMinutes: number): number {
  return inputMinutes * LIVE_AUDIO_USD_PER_MINUTE.input + outputMinutes * LIVE_AUDIO_USD_PER_MINUTE.output;
}

export function estimateTtsCostUsd(outputMinutes: number): number {
  return outputMinutes * TTS_AUDIO_USD_PER_MINUTE;
}
