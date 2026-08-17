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
    SARAH_PRIMARY: "Kore", // Dynamic, analytical, agile sprint BA
    SARAH_FORMAL: "Aoede", // Crisp, executive, structured
    VENTURE_STRATEGY: "Zephyr", // Articulate & strategic
    EXECUTIVE_COACHING: "Puck", // Empathetic & collaborative
    AUTHORITATIVE_AUDIT: "Fenrir", // Deep & firm
  },

  // Audio parameters matching Google Live specification
  AUDIO_INPUT_SAMPLE_RATE: 16000,
  AUDIO_OUTPUT_SAMPLE_RATE: 24000,
};
