"use client";

import { Venture, KanbanCard } from "@/lib/store/ventureStore";

export type GeminiLiveVoiceName = "Aoede" | "Kore" | "Puck" | "Fenrir" | "Charon";

export interface GeminiLiveCallbacks {
  onStateChange: (state: "connected" | "disconnected" | "speaking" | "listening" | "error") => void;
  onTranscript: (sender: "user" | "ai", text: string, isFinal: boolean) => void;
  onToolCall: (name: string, args: Record<string, any>) => void;
  onError: (error: string) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private isMuted: boolean = false;
  private callbacks: GeminiLiveCallbacks;
  private apiKey: string;
  private venture: Venture;
  private voiceName: GeminiLiveVoiceName;
  private nextPlayTime: number = 0;
  private audioQueue: AudioBufferSourceNode[] = [];

  constructor(
    apiKey: string,
    venture: Venture,
    callbacks: GeminiLiveCallbacks,
    voiceName: GeminiLiveVoiceName = "Aoede"
  ) {
    this.apiKey = apiKey;
    this.venture = venture;
    this.callbacks = callbacks;
    this.voiceName = voiceName;
  }

  // Connect to Gemini Live Bidirectional WebSocket
  async connect(): Promise<boolean> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      this.callbacks.onError("No Gemini API Key provided.");
      return false;
    }

    try {
      // 1. Initialize Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // 2. Open WebSocket connection to Google Gemini Live API
      const host = "generativelanguage.googleapis.com";
      const path = "ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
      const wsUrl = `wss://${host}/${path}?key=${encodeURIComponent(this.apiKey)}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onStateChange("connected");
        this.sendInitialSetup();
        this.startMicrophoneCapture();
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let responseData: any;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            responseData = JSON.parse(text);
          } else if (typeof event.data === "string") {
            responseData = JSON.parse(event.data);
          }

          if (responseData) {
            this.handleServerMessage(responseData);
          }
        } catch (e) {
          console.warn("Gemini Live message parsing notice:", e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("Gemini Live WebSocket notice:", err);
        this.callbacks.onStateChange("error");
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onStateChange("disconnected");
        this.cleanup();
      };

      return true;
    } catch (err: any) {
      console.error("Failed to connect to Gemini Live WebSocket:", err);
      this.callbacks.onError(err.message || "Failed to connect");
      return false;
    }
  }

  // Send initial Setup Frame with System Instructions, Voice, and Live Function Tools
  private sendInitialSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceName,
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: `You are Sarah, an expert AI Business Analyst and autonomous startup co-pilot talking in real-time with the founder of "${this.venture.name}".
Style: Warm, perceptive, crisp, conversational, and direct. Keep spoken answers to 1-3 natural sentences.
Stage: ${this.venture.stage || "Validation"}. Problem Statement: "${this.venture.problemStatement || "Validating product-market fit"}".
If the founder asks you to create a ticket, add a card, or move tasks, immediately call the corresponding function tool.`,
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "create_card",
                description: "Creates a new card/ticket on the live Kanban sprint board",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    column: {
                      type: "STRING",
                      enum: ["backlog", "today", "in_progress", "done", "blocked"],
                      description: "The column to place the card in",
                    },
                    title: { type: "STRING", description: "Title of the card/task" },
                    category: {
                      type: "STRING",
                      enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"],
                    },
                    priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                  },
                  required: ["title"],
                },
              },
              {
                name: "move_card",
                description: "Moves an existing Kanban card to a different column",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    cardTitle: { type: "STRING", description: "Title or keyword of the card to move" },
                    toColumn: {
                      type: "STRING",
                      enum: ["backlog", "today", "in_progress", "done", "blocked"],
                    },
                  },
                  required: ["cardTitle", "toColumn"],
                },
              },
            ],
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  // Capture Microphone Audio as 16kHz PCM (Linear 16-bit Mono)
  private async startMicrophoneCapture(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = audioCtx.createMediaStreamSource(this.mediaStream);
      // ScriptProcessor captures raw PCM samples
      this.scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array [-1.0, 1.0] to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode PCM chunk
        const base64Chunk = this.arrayBufferToBase64(pcm16.buffer);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const clientContent = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Chunk,
                },
              ],
            },
          };
          this.ws.send(JSON.stringify(clientContent));
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(audioCtx.destination);
    } catch (err: any) {
      console.warn("Microphone capture error:", err);
      this.callbacks.onError("Microphone access error: " + err.message);
    }
  }

  // Handle Incoming Server WebSocket Messages (PCM Audio, Text, Tools, Interruption)
  private handleServerMessage(data: any): void {
    // 1. Check for Server-Side Interruption / Barge-in
    if (data.serverContent?.interrupted) {
      console.log("⚡ Gemini Live interrupted by user speech! Clearing playback buffer...");
      this.stopCurrentAudioPlayback();
      this.callbacks.onStateChange("listening");
      return;
    }

    // 2. Process Model Audio Turn
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        // Audio chunk (24kHz PCM)
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          this.playPcmChunk(base64Data);
          this.callbacks.onStateChange("speaking");
        }

        // Text transcript chunk
        if (part.text) {
          this.callbacks.onTranscript("ai", part.text, false);
        }
      }
    }

    if (data.serverContent?.turnComplete) {
      this.callbacks.onTranscript("ai", "", true);
      this.callbacks.onStateChange("listening");
    }

    // 3. Process Function Tool Calls
    if (data.toolCall?.functionCalls) {
      for (const call of data.toolCall.functionCalls) {
        console.log("🔧 Gemini Live Tool Call:", call.name, call.args);
        this.callbacks.onToolCall(call.name, call.args || {});

        // Send function response back to Gemini Live
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const responseMsg = {
            toolResponse: {
              functionResponses: [
                {
                  response: { output: { success: true } },
                  id: call.id,
                },
              ],
            },
          };
          this.ws.send(JSON.stringify(responseMsg));
        }
      }
    }
  }

  // Play 24kHz PCM audio chunk seamlessly using Web Audio API buffer scheduling
  private playPcmChunk(base64Data: string): void {
    if (!this.audioContext) return;

    try {
      const pcmBytes = this.base64ToArrayBuffer(base64Data);
      const int16Array = new Int16Array(pcmBytes);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      const currentTime = this.audioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.audioQueue.push(source);

      source.onended = () => {
        const idx = this.audioQueue.indexOf(source);
        if (idx > -1) this.audioQueue.splice(idx, 1);
      };
    } catch (e) {
      console.warn("PCM audio playback error:", e);
    }
  }

  // Stop currently playing audio on barge-in
  private stopCurrentAudioPlayback(): void {
    for (const source of this.audioQueue) {
      try {
        source.stop();
      } catch (e) {}
    }
    this.audioQueue = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  // Disconnect & Clean Up
  disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.isConnected = false;
    this.stopCurrentAudioPlayback();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
