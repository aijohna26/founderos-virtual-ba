// Cost-per-unit table backing the AI cost ledger (docs/founderally-next-implementation-todo.md
// P0 #6). Centralized so nothing hardcodes a $ figure at the call site.
//
// PRICING_VERIFIED: true -- checked against https://ai.google.dev/gemini-api/docs/pricing on
// 2026-08-21 (paid-tier "Standard" rates for each model in lib/config/geminiConfig.ts).
// Whoever next changes a model there without updating the corresponding row here should flip
// this back to false. Two things below are *not* directly-quoted figures, flagged inline:
// gemini-flash-latest's price (it's an alias, not a priced model in its own right) and the
// TTS per-minute rate (derived, not published -- see its own comment).
//
// gemini-3.7-flash's input/output rates are scheduled to double on 2027-01-01 ($0.75->$1.50
// in, $3.75->$7.50 out per the pricing page) -- these are the current (pre-increase) rates;
// whoever's still on this file after that date should update them and re-verify.
export const PRICING_VERIFIED = true;
export const PRICING_LAST_UPDATED = "2026-08-21";

export interface ModelPricing {
  /** USD per 1,000,000 input tokens. */
  inputPerMillionUsd: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillionUsd: number;
}

export const TEXT_MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-3.7-flash": { inputPerMillionUsd: 0.75, outputPerMillionUsd: 3.75 },
  // Not a real priced model -- "gemini-flash-latest" is an alias Google resolves to whichever
  // Flash model is current, and doesn't appear on the pricing page in its own right. Priced
  // the same as gemini-3.7-flash (today's default Flash target in geminiConfig.ts) as the
  // closest available estimate; re-check if the alias ever resolves somewhere materially
  // different in price.
  "gemini-flash-latest": { inputPerMillionUsd: 0.75, outputPerMillionUsd: 3.75 },
  // gemini-3.1-flash-lite's *input* is priced by input type on the pricing page (text/image/
  // video: $0.25/1M, audio: $0.50/1M) -- this app never sends it audio input (it's a text-only
  // candidate in geminiConfig.ts's TEXT_MODELS fallback chain), so the text rate applies.
  "gemini-3.1-flash-lite": { inputPerMillionUsd: 0.25, outputPerMillionUsd: 1.50 },
};

export const DEFAULT_TEXT_MODEL_PRICING: ModelPricing = TEXT_MODEL_PRICING["gemini-3.7-flash"];

// Audio (Live + TTS) is priced per minute here rather than per token -- Gemini's audio
// pricing is generally quoted that way, and it's what the rest of this app already measures
// (live_usage_sessions tracks session duration, not audio tokens).
//
// gemini-3.1-flash-live-preview: the pricing page states these per-minute audio rates
// directly ($3.00/1M or $0.005/min in, $12.00/1M or $0.018/min out) -- not derived.
export const LIVE_AUDIO_USD_PER_MINUTE = {
  input: 0.005,
  output: 0.018,
};
// gemini-3.1-flash-tts-preview: the pricing page states only $20.00 per 1M output audio
// tokens, with no published per-minute equivalent (unlike the Live model above). Derived here
// using the 25-tokens-per-second audio rate the pricing page states for Live's own audio
// pricing (and which reproduces Live's $0.018/min exactly: 25 * 60 / 1_000_000 * 12.00 =
// 0.018) -- assumed to be the same underlying audio tokenization Google uses across its
// audio-capable Gemini models, since TTS's own page gives no other conversion. Re-derive if
// Google ever publishes a TTS-specific rate instead: 25 * 60 / 1_000_000 * 20.00 = 0.03.
export const TTS_AUDIO_USD_PER_MINUTE = 0.03;

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
