"use client";

import {
  DEFAULT_ADVISOR,
  findGeminiVoice,
} from "@/lib/config/advisorPersonas";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "paused";

// Browser speech voices vary wildly by OS and regularly sound nothing like the
// selected Gemini persona. Keep this escape hatch opt-in instead of silently
// impersonating a Gemini voice when server audio is unavailable.
const BROWSER_TTS_FALLBACK_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_BROWSER_TTS_FALLBACK === "true";

type BrowserVoiceProfile = {
  rate: number;
  pitch: number;
  gender: "female" | "male";
};

const FEMALE_GEMINI_VOICES = new Set([
  "Achernar", "Aoede", "Autonoe", "Callirrhoe", "Despina", "Erinome",
  "Gacrux", "Kore", "Laomedeia", "Leda", "Pulcherrima", "Sulafat",
  "Vindemiatrix", "Zephyr",
]);

const VOICE_STYLE_PROFILES: Record<string, Pick<BrowserVoiceProfile, "rate" | "pitch">> = {
  Bright: { rate: 1.04, pitch: 1.12 },
  Upbeat: { rate: 1.08, pitch: 1.08 },
  Informative: { rate: 0.94, pitch: 0.9 },
  Firm: { rate: 0.91, pitch: 0.86 },
  Excitable: { rate: 1.12, pitch: 1.14 },
  Youthful: { rate: 1.05, pitch: 1.18 },
  Breezy: { rate: 1.02, pitch: 1.08 },
  "Easy-going": { rate: 0.92, pitch: 1.02 },
  Breathy: { rate: 0.88, pitch: 0.96 },
  Clear: { rate: 0.98, pitch: 0.98 },
  Smooth: { rate: 0.9, pitch: 0.92 },
  Gravelly: { rate: 0.86, pitch: 0.72 },
  Soft: { rate: 0.88, pitch: 1.06 },
  Even: { rate: 0.94, pitch: 0.94 },
  Mature: { rate: 0.88, pitch: 0.82 },
  Forward: { rate: 1.01, pitch: 1.0 },
  Friendly: { rate: 1.0, pitch: 1.05 },
  Casual: { rate: 0.97, pitch: 0.96 },
  Gentle: { rate: 0.87, pitch: 1.04 },
  Lively: { rate: 1.1, pitch: 1.1 },
  Knowledgeable: { rate: 0.91, pitch: 0.88 },
  Warm: { rate: 0.9, pitch: 1.02 },
};

const BROWSER_FEMALE_VOICE_PATTERNS = [
  "samantha", "karen", "moira", "tessa", "fiona", "serena", "victoria",
  "zira", "aria", "jenny", "female", "google uk english female",
];

const BROWSER_MALE_VOICE_PATTERNS = [
  "daniel", "alex", "aaron", "arthur", "oliver", "rishi", "david",
  "guy", "ryan", "male", "google uk english male",
];

function voiceNameHash(value: string): number {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);
}

function getBrowserVoiceProfile(voiceName: string): BrowserVoiceProfile {
  const geminiVoice = findGeminiVoice(voiceName);
  const style = VOICE_STYLE_PROFILES[geminiVoice?.character || "Warm"] ||
    VOICE_STYLE_PROFILES.Warm;

  return {
    ...style,
    gender: FEMALE_GEMINI_VOICES.has(voiceName) ? "female" : "male",
  };
}

function selectBrowserVoice(
  voices: SpeechSynthesisVoice[],
  voiceName: string,
  gender: BrowserVoiceProfile["gender"]
): SpeechSynthesisVoice | undefined {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const pool = englishVoices.length > 0 ? englishVoices : voices;
  const patterns = gender === "female"
    ? BROWSER_FEMALE_VOICE_PATTERNS
    : BROWSER_MALE_VOICE_PATTERNS;
  const matchingVoices = pool.filter((voice) => {
    const normalizedName = voice.name.toLowerCase();
    return patterns.some((pattern) => normalizedName.includes(pattern));
  });
  const candidates = matchingVoices.length > 0 ? matchingVoices : pool;

  return candidates.length > 0
    ? candidates[voiceNameHash(voiceName) % candidates.length]
    : undefined;
}

export class VoiceEngine {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static shouldBeListening: boolean = false;
  private static isSpeaking: boolean = false;
  private static lastSpokenEndTime: number = 0;
  private static recentlySpokenSentences: string[] = [];
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentAudioUrl: string | null = null;
  private static voicesLoaded: boolean = false;
  private static activeUtterances: Set<SpeechSynthesisUtterance> = new Set();
  private static keepAliveTimer: any = null;
  private static stateChangeCallback: ((state: VoiceState) => void) | null = null;
  private static onInterruptCallback: (() => void) | null = null;
  private static transcriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private static recognitionErrorCallback: ((error: string) => void) | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static audioSourceNode: MediaElementAudioSourceNode | null = null;
  private static speechGeneration = 0;
  private static ttsAbortController: AbortController | null = null;

  // Clean markdown, code blocks, bullet points and JSON from text for clear, natural speech
  static cleanTextForSpeech(text: string): string {
    if (!text) return "";
    return text
      .replace(/```json[\s\S]*?```/gi, "")
      .replace(/```[\s\S]*?```/gi, "")
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
      .replace(/(\*|_)(.*?)\1/g, "$2") // italic
      .replace(/#+\s/g, "") // headers
      .replace(/`{1,3}.*?`{1,3}/g, "") // code snippets
      .replace(/[•●▪-]\s/g, "") // bullet points
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links
      .replace(/\{"actions":[\s\S]*?\}/gi, "")
      .replace(/\n+/g, " ")
      .trim();
  }

  // Pre-load voices on client
  static preloadVoices(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          VoiceEngine.voicesLoaded = true;
        }
      } catch (e) {}
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Unlock browser audio context on user click/tap
  static unlockAudio(): void {
    if (typeof window === "undefined") return;
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 64;
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}
  }

  static getAudioAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  // Initialize Speech Recognition with Echo Rejection & Real-Time Interim Transcripts
  static initRecognition(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: VoiceState) => void,
    onError: (err: string) => void,
    onInterrupt?: () => void
  ): boolean {
    if (typeof window === "undefined") return false;

    this.preloadVoices();
    this.unlockAudio();
    this.stateChangeCallback = onStateChange;
    this.onInterruptCallback = onInterrupt || null;
    this.transcriptCallback = onTranscript;
    this.recognitionErrorCallback = onError;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      return false;
    }

    try {
      if (!this.recognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = "en-US";

        this.recognition.onstart = () => {
          this.isListening = true;
          if (!this.isSpeaking && this.stateChangeCallback) {
            this.stateChangeCallback("listening");
          }
        };

        this.recognition.onresult = (event: any) => {
          // Drop mic input during AI speech or right after speech to prevent acoustic loops
          const now = Date.now();
          if (VoiceEngine.isSpeaking || (now - VoiceEngine.lastSpokenEndTime < 450)) {
            return;
          }

          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const rawHeard = (finalTranscript || interimTranscript).trim().toLowerCase();
          if (!rawHeard || rawHeard.length < 2) return;

          // Phrase bleed filter
          const isRecentEcho = VoiceEngine.recentlySpokenSentences.some((recent) => {
            const cleanRecent = recent.toLowerCase();
            return cleanRecent.includes(rawHeard) || rawHeard === "got it" || rawHeard === "got it.";
          });

          if (isRecentEcho && rawHeard.split(" ").length < 4) {
            return;
          }

          if (finalTranscript.trim().length > 0) {
            VoiceEngine.transcriptCallback?.(finalTranscript.trim(), true);
          } else if (interimTranscript.trim().length > 0) {
            VoiceEngine.transcriptCallback?.(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            console.warn("Speech recognition notice:", event.error);
            VoiceEngine.recognitionErrorCallback?.(event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          // Continuous listening loop
          if (this.shouldBeListening && !this.isSpeaking) {
            setTimeout(() => {
              if (this.shouldBeListening && !this.isSpeaking && !this.isListening) {
                try {
                  this.recognition.start();
                  this.isListening = true;
                } catch (e) {}
              }
            }, 150);
          } else {
            if (!this.isSpeaking && this.stateChangeCallback) {
              this.stateChangeCallback("idle");
            }
          }
        };
      }
      return true;
    } catch (e) {
      console.error("Error setting up speech recognition:", e);
      return false;
    }
  }

  // Start listening to microphone
  static startListening(): void {
    this.shouldBeListening = true;
    if (this.recognition && !this.isListening && !this.isSpeaking) {
      try {
        this.recognition.start();
        this.isListening = true;
        if (this.stateChangeCallback && !this.isSpeaking) {
          this.stateChangeCallback("listening");
        }
      } catch (e) {
        console.warn("Recognition start notice:", e);
      }
    }
  }

  // Stop listening
  static stopListening(): void {
    this.shouldBeListening = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
      if (this.stateChangeCallback && !this.isSpeaking) {
        this.stateChangeCallback("idle");
      }
    }
  }

  // Set state directly (e.g. "thinking")
  static setState(state: VoiceState): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback(state);
    }
  }

  // Server-generated Gemini neural voice playback for the selected advisor.
  static async speak(
    text: string,
    voiceOrOnStart?: string | (() => void),
    onStartOrOnEnd?: () => void,
    onEndCallback?: () => void
  ): Promise<void> {
    let voiceName: string = DEFAULT_ADVISOR.voiceName;
    let onStart: (() => void) | undefined = undefined;
    let onEnd: (() => void) | undefined = undefined;

    if (typeof voiceOrOnStart === "string") {
      voiceName = voiceOrOnStart;
      onStart = onStartOrOnEnd;
      onEnd = onEndCallback;
    } else if (typeof voiceOrOnStart === "function") {
      onStart = voiceOrOnStart;
      onEnd = onStartOrOnEnd;
    }

    if (typeof window === "undefined") {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeaking();
    const speechGeneration = ++this.speechGeneration;
    const abortController = new AbortController();
    this.ttsAbortController = abortController;
    this.isSpeaking = true;
    this.recentlySpokenSentences.push(cleanText);
    if (this.recentlySpokenSentences.length > 5) {
      this.recentlySpokenSentences.shift();
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }

    // 1. Server-side Google Gemini neural voice audio.
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, voice: voiceName }),
        signal: abortController.signal,
      });

      if (speechGeneration !== this.speechGeneration) return;

      const contentType = res.headers.get("content-type") || "";

      if (res.ok && contentType.includes("audio")) {
        const blob = await res.blob();
        if (speechGeneration !== this.speechGeneration) return;
        const audioUrl = URL.createObjectURL(blob);
        this.currentAudioUrl = audioUrl;

        const audio = new Audio(audioUrl);
        audio.crossOrigin = "anonymous";
        this.currentAudio = audio;

        // Connect to Web Audio AnalyserNode for real-time waveform visualizer
        try {
          if (!this.audioContext) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioCtx();
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 64;
          }
          if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
          }

          const source = this.audioContext.createMediaElementSource(audio);
          source.connect(this.analyserNode!);
          this.analyserNode!.connect(this.audioContext.destination);
        } catch (ctxErr) {
          console.warn("Audio analyser connect notice:", ctxErr);
        }

        audio.onplay = () => {
          if (speechGeneration !== VoiceEngine.speechGeneration) return;
          VoiceEngine.isSpeaking = true;
          if (VoiceEngine.stateChangeCallback) {
            VoiceEngine.stateChangeCallback("speaking");
          }
          if (onStart) onStart();
        };

        const handleAudioEnd = () => {
          if (speechGeneration !== VoiceEngine.speechGeneration) return;
          VoiceEngine.isSpeaking = false;
          VoiceEngine.lastSpokenEndTime = Date.now();
          if (VoiceEngine.currentAudioUrl) {
            URL.revokeObjectURL(VoiceEngine.currentAudioUrl);
            VoiceEngine.currentAudioUrl = null;
          }
          VoiceEngine.currentAudio = null;

          if (VoiceEngine.shouldBeListening) {
            setTimeout(() => {
              if (VoiceEngine.shouldBeListening && !VoiceEngine.isSpeaking) {
                VoiceEngine.startListening();
              }
            }, 400);
          } else if (VoiceEngine.stateChangeCallback) {
            VoiceEngine.stateChangeCallback("idle");
          }

          if (onEnd) onEnd();
        };

        audio.onended = handleAudioEnd;
        audio.onerror = () => handleAudioEnd();

        await audio.play();
        if (speechGeneration === this.speechGeneration) {
          this.ttsAbortController = null;
        }
        return;
      } else {
        console.warn(
          `Gemini TTS returned ${res.status} for ${voiceName}.`
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (speechGeneration !== this.speechGeneration) return;
      console.warn("HD Audio streaming notice:", err);
    }

    if (speechGeneration !== this.speechGeneration) return;
    this.ttsAbortController = null;

    if (BROWSER_TTS_FALLBACK_ENABLED) {
      this.speakWithBrowserNeural(
        cleanText,
        voiceName,
        speechGeneration,
        onStart,
        onEnd
      );
      return;
    }

    // Preserve the text/microphone conversation without substituting an
    // unrelated OS voice for the selected Gemini advisor.
    this.isSpeaking = false;
    this.lastSpokenEndTime = Date.now();
    if (this.shouldBeListening) {
      setTimeout(() => {
        if (speechGeneration === this.speechGeneration) this.startListening();
      }, 100);
    } else if (this.stateChangeCallback) {
      this.stateChangeCallback("idle");
    }
    if (onEnd) onEnd();
  }

  private static speakWithBrowserNeural(
    cleanText: string,
    voiceName: string,
    speechGeneration: number,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.isSpeaking = false;
      this.lastSpokenEndTime = Date.now();
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;
      this.activeUtterances.add(utterance);

      const profile = getBrowserVoiceProfile(voiceName);
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice = selectBrowserVoice(voices, voiceName, profile.gender);

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      const handleSpeechComplete = () => {
        if (speechGeneration !== VoiceEngine.speechGeneration) {
          VoiceEngine.activeUtterances.delete(utterance);
          return;
        }
        VoiceEngine.isSpeaking = false;
        VoiceEngine.lastSpokenEndTime = Date.now();
        VoiceEngine.activeUtterances.delete(utterance);
        if (VoiceEngine.currentUtterance === utterance) {
          VoiceEngine.currentUtterance = null;
        }
        if (VoiceEngine.keepAliveTimer) {
          clearInterval(VoiceEngine.keepAliveTimer);
          VoiceEngine.keepAliveTimer = null;
        }

        if (VoiceEngine.shouldBeListening) {
          setTimeout(() => {
            if (VoiceEngine.shouldBeListening && !VoiceEngine.isSpeaking) {
              VoiceEngine.startListening();
            }
          }, 400);
        } else if (VoiceEngine.stateChangeCallback) {
          VoiceEngine.stateChangeCallback("idle");
        }

        if (onEnd) onEnd();
      };

      utterance.onstart = () => {
        if (speechGeneration !== VoiceEngine.speechGeneration) return;
        VoiceEngine.isSpeaking = true;
        if (VoiceEngine.stateChangeCallback) {
          VoiceEngine.stateChangeCallback("speaking");
        }
        if (onStart) onStart();
      };

      utterance.onend = handleSpeechComplete;
      utterance.onerror = () => handleSpeechComplete();

      setTimeout(() => {
        if (speechGeneration !== VoiceEngine.speechGeneration) return;
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          handleSpeechComplete();
        }
      }, 50);
    } catch (err) {
      this.isSpeaking = false;
      this.lastSpokenEndTime = Date.now();
      if (onEnd) onEnd();
    }
  }

  // Stop speaking immediately (Barge-in / Cancel)
  static stopSpeaking(): void {
    this.speechGeneration += 1;
    this.ttsAbortController?.abort();
    this.ttsAbortController = null;
    this.isSpeaking = false;
    this.lastSpokenEndTime = Date.now();

    if (typeof window !== "undefined") {
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        } catch (e) {}
        this.currentAudio = null;
      }
      if (this.currentAudioUrl) {
        try {
          URL.revokeObjectURL(this.currentAudioUrl);
        } catch (e) {}
        this.currentAudioUrl = null;
      }

      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }

      this.currentUtterance = null;
      this.activeUtterances.clear();
    }

    if (this.shouldBeListening) {
      setTimeout(() => {
        if (this.shouldBeListening) this.startListening();
      }, 100);
    }
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
