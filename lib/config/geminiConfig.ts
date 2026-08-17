export const GEMINI_CONFIG = {
  // Official Google GenAI Live Model for real-time bidirectional audio
  LIVE_MODEL: "models/gemini-2.0-flash-exp",

  // Core Reasoning Model for multi-turn structured BA analysis
  TEXT_MODEL: "gemini-2.5-flash",

  // Audio synthesis model for voice playback
  AUDIO_MODEL: "gemini-2.0-flash",

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
