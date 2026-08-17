"use client";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export class VoiceEngine {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static shouldBeListening: boolean = false;
  private static isSpeaking: boolean = false;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static currentAudio: HTMLAudioElement | null = null;
  private static currentAudioUrl: string | null = null;
  private static voicesLoaded: boolean = false;
  private static activeUtterances: Set<SpeechSynthesisUtterance> = new Set();
  private static keepAliveTimer: any = null;
  private static stateChangeCallback: ((state: VoiceState) => void) | null = null;
  private static onInterruptCallback: (() => void) | null = null;

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
      if ("speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}
  }

  // Initialize Speech Recognition with Voice Barge-In / Interruption
  static initRecognition(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: VoiceState) => void,
    onError: (err: string) => void,
    onInterrupt?: () => void
  ): boolean {
    if (typeof window === "undefined") return false;

    this.preloadVoices();
    this.stateChangeCallback = onStateChange;
    this.onInterruptCallback = onInterrupt || null;

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
          if (!this.isSpeaking) {
            onStateChange("listening");
          }
        };

        this.recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const rawText = (finalTranscript || interimTranscript).trim();

          // 🚨 VOICE BARGE-IN: If AI is speaking and user speaks, stop AI immediately!
          if (VoiceEngine.isSpeaking && rawText.length > 0) {
            console.log("⚡ User interrupted AI voice! Stopping playback and listening to user...");
            VoiceEngine.stopSpeaking();
            if (VoiceEngine.onInterruptCallback) {
              VoiceEngine.onInterruptCallback();
            }
            if (VoiceEngine.stateChangeCallback) {
              VoiceEngine.stateChangeCallback("listening");
            }
          }

          if (finalTranscript.trim().length > 0) {
            onTranscript(finalTranscript.trim(), true);
          } else if (interimTranscript.trim().length > 0) {
            onTranscript(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            console.warn("Speech recognition notice:", event.error);
            onError(event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          // Auto-restart loop for continuous 2-way conversation when call is active
          if (this.shouldBeListening) {
            setTimeout(() => {
              if (this.shouldBeListening) {
                try {
                  this.recognition.start();
                  this.isListening = true;
                } catch (e) {}
              }
            }, 100);
          } else {
            if (!this.isSpeaking) {
              onStateChange("idle");
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
    if (this.recognition && !this.isListening) {
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

  // High-Definition Text-to-Speech (Studio Audio Stream with Neural Fallback)
  static async speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    if (typeof window === "undefined") {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = this.cleanTextForSpeech(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    // Stop any currently playing audio or speech
    this.stopSpeaking();

    // 1. Attempt High-Definition Server-Side Audio Stream (ElevenLabs / OpenAI HD)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText }),
      });

      const contentType = res.headers.get("content-type") || "";

      if (res.ok && contentType.includes("audio")) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        this.currentAudioUrl = audioUrl;

        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onplay = () => {
          VoiceEngine.isSpeaking = true;
          if (VoiceEngine.stateChangeCallback) {
            VoiceEngine.stateChangeCallback("speaking");
          }
          if (onStart) onStart();
        };

        const handleAudioEnd = () => {
          VoiceEngine.isSpeaking = false;
          if (VoiceEngine.currentAudioUrl) {
            URL.revokeObjectURL(VoiceEngine.currentAudioUrl);
            VoiceEngine.currentAudioUrl = null;
          }
          VoiceEngine.currentAudio = null;

          if (VoiceEngine.shouldBeListening) {
            if (VoiceEngine.stateChangeCallback) {
              VoiceEngine.stateChangeCallback("listening");
            }
          } else if (VoiceEngine.stateChangeCallback) {
            VoiceEngine.stateChangeCallback("idle");
          }

          if (onEnd) onEnd();
        };

        audio.onended = handleAudioEnd;
        audio.onerror = (e) => {
          console.warn("Audio playback notice:", e);
          handleAudioEnd();
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("HD Audio streaming unavailable, using enhanced neural browser fallback:", err);
    }

    // 2. Fallback: High-Quality Browser Neural Synthesis (Enhanced Tuning)
    this.speakWithBrowserNeural(cleanText, onStart, onEnd);
  }

  // Enhanced Browser Neural Voice Fallback
  private static speakWithBrowserNeural(
    cleanText: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;
      this.activeUtterances.add(utterance);

      utterance.rate = 1.04;
      utterance.pitch = 1.02;
      utterance.volume = 1.0;

      // Prioritize natural, human-sounding neural voices
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Natural") ||
                v.name.includes("Jenny") ||
                v.name.includes("Aria") ||
                v.name.includes("Samantha") ||
                v.name.includes("Victoria") ||
                v.name.includes("Google US English") ||
                v.name.includes("Karen") ||
                v.name.includes("Enhanced") ||
                v.name.includes("Siri"))
          ) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      const handleSpeechComplete = () => {
        VoiceEngine.isSpeaking = false;
        VoiceEngine.activeUtterances.delete(utterance);
        if (VoiceEngine.currentUtterance === utterance) {
          VoiceEngine.currentUtterance = null;
        }
        if (VoiceEngine.keepAliveTimer) {
          clearInterval(VoiceEngine.keepAliveTimer);
          VoiceEngine.keepAliveTimer = null;
        }

        if (VoiceEngine.shouldBeListening) {
          if (VoiceEngine.stateChangeCallback) {
            VoiceEngine.stateChangeCallback("listening");
          }
        } else if (VoiceEngine.stateChangeCallback) {
          VoiceEngine.stateChangeCallback("idle");
        }

        if (onEnd) onEnd();
      };

      utterance.onstart = () => {
        VoiceEngine.isSpeaking = true;
        if (VoiceEngine.stateChangeCallback) {
          VoiceEngine.stateChangeCallback("speaking");
        }
        if (onStart) onStart();

        // Chrome keepalive watchdog
        if (VoiceEngine.keepAliveTimer) clearInterval(VoiceEngine.keepAliveTimer);
        VoiceEngine.keepAliveTimer = setInterval(() => {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            } else {
              handleSpeechComplete();
            }
          }
        }, 8000);
      };

      utterance.onend = handleSpeechComplete;
      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e);
        handleSpeechComplete();
      };

      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("TTS speak error:", err);
          handleSpeechComplete();
        }
      }, 50);
    } catch (err) {
      console.error("Failed to execute TTS speak:", err);
      if (onEnd) onEnd();
    }
  }

  // Stop speaking immediately (supports stopping both HTML5 Audio stream & Web Speech)
  static stopSpeaking(): void {
    if (typeof window !== "undefined") {
      // 1. Stop HTML5 streaming audio
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

      // 2. Stop Web Speech synthesis
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }

      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }

      this.isSpeaking = false;
      this.currentUtterance = null;
      this.activeUtterances.clear();
    }
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
