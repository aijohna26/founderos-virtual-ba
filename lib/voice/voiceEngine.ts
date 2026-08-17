"use client";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export class VoiceEngine {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static isSpeaking: boolean = false;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static voicesLoaded: boolean = false;

  // Pre-load voices on client
  static preloadVoices(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        VoiceEngine.voicesLoaded = true;
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  // Initialize Speech Recognition (Speech-to-Text)
  static initRecognition(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: VoiceState) => void,
    onError: (err: string) => void
  ): boolean {
    if (typeof window === "undefined") return false;

    // Also preload TTS voices
    this.preloadVoices();

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
          onStateChange("listening");
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

          if (finalTranscript.trim().length > 0) {
            onTranscript(finalTranscript.trim(), true);
          } else if (interimTranscript.trim().length > 0) {
            onTranscript(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
          if (event.error !== "no-speech") {
            onError(event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (!this.isSpeaking) {
            onStateChange("idle");
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
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.warn("Recognition already started or error:", e);
      }
    }
  }

  // Stop listening
  static stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  private static activeUtterances: Set<SpeechSynthesisUtterance> = new Set();

  // Text-to-Speech (AI Voice)
  static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("speechSynthesis not supported on this browser.");
      if (onEnd) onEnd();
      return;
    }

    try {
      // Cancel previous speech to prevent overlapping queues
      window.speechSynthesis.cancel();

      // Clean markdown formatting & actions JSON for natural, smooth voice
      const cleanText = text
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
        .replace(/(\*|_)(.*?)\1/g, "$2") // italic
        .replace(/#+\s/g, "") // headers
        .replace(/`{1,3}.*?`{1,3}/g, "") // code
        .replace(/•\s/g, "") // bullet dots
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // markdown links
        .replace(/[-*]\s/g, "")
        .replace(/\n+/g, " ")
        .trim();

      if (!cleanText) {
        if (onEnd) onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.currentUtterance = utterance;
      this.activeUtterances.add(utterance);

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select natural English voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Samantha") ||
                v.name.includes("Victoria") ||
                v.name.includes("Google US English") ||
                v.name.includes("Karen") ||
                v.name.includes("Natural") ||
                v.name.includes("Jenny") ||
                v.name.includes("Aria"))
          ) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0];

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        VoiceEngine.isSpeaking = true;
        if (onStart) onStart();
      };

      utterance.onend = () => {
        VoiceEngine.isSpeaking = false;
        VoiceEngine.activeUtterances.delete(utterance);
        VoiceEngine.currentUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis notice:", e);
        VoiceEngine.isSpeaking = false;
        VoiceEngine.activeUtterances.delete(utterance);
        VoiceEngine.currentUtterance = null;
        if (onEnd) onEnd();
      };

      // In Chrome/Safari, ensure speech synthesis engine is resumed
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Failed to execute TTS speak:", err);
      if (onEnd) onEnd();
    }
  }

  // Stop speaking immediately
  static stopSpeaking(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
