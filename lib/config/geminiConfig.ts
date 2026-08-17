export const GEMINI_CONFIG = {
  // Current Gemini Developer API model for low-latency bidirectional voice.
  LIVE_MODEL: "gemini-3.1-flash-live-preview",

  // Requested text-model order. Unsupported/unavailable candidates fall
  // through so a single model rollout cannot take down the BA.
  TEXT_MODELS: [
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
  ] as const,
  TEXT_MODEL: "gemini-3.7-flash",

  // Dedicated text-to-speech fallback model (not the Live agent).
  AUDIO_MODEL: "gemini-3.1-flash-tts-preview",

  // Supported Prebuilt Gemini Neural Voices
  VOICES: {
    DEFAULT_ADVISOR: "Sulafat", // Warm strategic co-founder
    SPRINT_COACH: "Charon", // Informative operations lead
    REQUIREMENTS_ARCHITECT: "Erinome", // Clear technical BA
  },

  // Audio parameters matching Google Live specification
  AUDIO_INPUT_SAMPLE_RATE: 16000,
  AUDIO_OUTPUT_SAMPLE_RATE: 24000,
};
