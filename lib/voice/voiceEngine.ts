"use client";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export class VoiceEngine {
  private static recognition: any = null;
  private static isListening: boolean = false;
  private static isSpeaking: boolean = false;

  // Initialize Speech Recognition (Speech-to-Text)
  static initRecognition(
    onTranscript: (text: string, isFinal: boolean) => void,
    onStateChange: (state: VoiceState) => void,
    onError: (err: string) => void
  ): boolean {
    if (typeof window === "undefined") return false;

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
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
      } catch (e) {
        console.warn("Recognition stop error:", e);
      }
    }
  }

  // Text-to-Speech (AI Voice)
  static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    // Cancel any active speech
    window.speechSynthesis.cancel();

    // Clean markdown formatting for clean, natural speech audio
    const cleanText = text
      .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
      .replace(/(\*|_)(.*?)\1/g, "$2") // italic
      .replace(/#+\s/g, "") // headers
      .replace(/`{1,3}.*?`{1,3}/g, "") // code
      .replace(/•\s/g, "") // bullet dots
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // markdown links
      .replace(/[-*]\s/g, "")
      .replace(/\n+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly brisk professional pace
    utterance.pitch = 1.0;

    // Pick a natural sounding English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") ||
          v.name.includes("Victoria") ||
          v.name.includes("Google US English") ||
          v.name.includes("Karen") ||
          v.name.includes("Natural") ||
          v.name.includes("Female"))
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn("Speech synthesis notice:", e);
      this.isSpeaking = false;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  // Stop speaking immediately
  static stopSpeaking(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  static isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
}
