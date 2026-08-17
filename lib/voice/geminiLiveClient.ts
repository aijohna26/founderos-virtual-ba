"use client";

import { Venture } from "@/lib/store/ventureStore";
import { BAAgentService } from "@/lib/agent/baAgentService";

export type GeminiLiveVoiceName = "Aoede" | "Kore" | "Puck" | "Fenrir" | "Charon";

export interface GeminiLiveCallbacks {
  onStateChange: (state: "connected" | "disconnected" | "speaking" | "listening" | "error") => void;
  onTranscript: (sender: "user" | "ai", text: string, isFinal: boolean) => void;
  onToolCall: (name: string, args: Record<string, any>) => void;
  onError: (error: string) => void;
  onVentureUpdated?: (venture: Venture) => void;
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

  // Send Initial Setup Frame with 7 Formal PRD Tools
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
              text: `You are Sarah Jenkins, the Lead AI Business Analyst for "${this.venture.name}".
You are on a real-time live voice standup with the founder.
Goal: "${this.venture.problemStatement || "Validate product-market fit"}".
Style: Warm, perceptive, crisp, conversational, and direct. Keep spoken answers to 1-3 natural sentences.
When the founder commits to something, requests a ticket move, creates work, or reflects on sprint learnings, call the appropriate tool immediately and continue speaking after receiving the result.`,
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "get_sprint_context",
                description: "Retrieves authoritative sprint goal, board columns, active commitments, and velocity.",
                parameters: { type: "OBJECT", properties: {} },
              },
              {
                name: "get_ticket",
                description: "Retrieves details for a specific card by title or ID.",
                parameters: {
                  type: "OBJECT",
                  properties: { cardTitle: { type: "STRING", description: "Card title" } },
                  required: ["cardTitle"],
                },
              },
              {
                name: "create_ticket",
                description: "Creates a new task or card on the Kanban board.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Title of the card" },
                    column: { type: "STRING", enum: ["backlog", "today", "in_progress", "done", "blocked"] },
                    category: { type: "STRING", enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"] },
                    priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                    reason: { type: "STRING", description: "Why this matters towards the sprint goal" },
                  },
                  required: ["title"],
                },
              },
              {
                name: "update_ticket",
                description: "Updates details or description on an existing ticket.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    cardTitle: { type: "STRING", description: "Card title to update" },
                    description: { type: "STRING", description: "New description" },
                    priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                  },
                  required: ["cardTitle"],
                },
              },
              {
                name: "move_ticket",
                description: "Moves an existing ticket between board columns (e.g. to 'done' or 'today').",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    cardTitle: { type: "STRING", description: "Card title or substring" },
                    toColumn: { type: "STRING", enum: ["backlog", "today", "in_progress", "done", "blocked"] },
                  },
                  required: ["cardTitle", "toColumn"],
                },
              },
              {
                name: "record_commitment",
                description: "Records an explicit daily commitment made by the founder for stand-up accountability.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    commitment: { type: "STRING", description: "The commitment text" },
                    deadline: { type: "STRING", description: "Target completion deadline" },
                  },
                  required: ["commitment"],
                },
              },
              {
                name: "record_learning",
                description: "Stores durable sprint learnings and recurring behavioral patterns.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    pattern: { type: "STRING", description: "The learning or pattern observed" },
                    evidence: { type: "STRING", description: "Supporting evidence" },
                  },
                  required: ["pattern"],
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
      this.scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

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
    // 1. Server-Side Interruption / Barge-In
    if (data.serverContent?.interrupted) {
      console.log("⚡ Gemini Live interrupted by user speech! Halting audio buffer...");
      this.stopCurrentAudioPlayback();
      this.callbacks.onStateChange("listening");
      return;
    }

    // 2. Model Audio & Transcript Turn
    if (data.serverContent?.modelTurn?.parts) {
      for (const part of data.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          this.playPcmChunk(part.inlineData.data);
          this.callbacks.onStateChange("speaking");
        }

        if (part.text) {
          this.callbacks.onTranscript("ai", part.text, false);
        }
      }
    }

    if (data.serverContent?.turnComplete) {
      this.callbacks.onTranscript("ai", "", true);
      this.callbacks.onStateChange("listening");
    }

    // 3. Native Function Tool Execution Loop
    if (data.toolCall?.functionCalls) {
      for (const call of data.toolCall.functionCalls) {
        console.log("🔧 Gemini Live Native Tool Call:", call.name, call.args);
        this.callbacks.onToolCall(call.name, call.args || {});

        // Execute tool authoritatively against venture state
        const toolResult = BAAgentService.executeTool(
          call.name,
          call.args || {},
          this.venture,
          "daily_standup"
        );

        if (toolResult.updatedVenture) {
          this.venture = toolResult.updatedVenture;
          this.callbacks.onVentureUpdated?.(toolResult.updatedVenture);
        }

        // Return tool execution result back to Gemini Live
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const responseMsg = {
            toolResponse: {
              functionResponses: [
                {
                  response: {
                    output: {
                      success: toolResult.success,
                      message: toolResult.message,
                      data: toolResult.data || {},
                    },
                  },
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

  // Play 24kHz PCM audio chunk seamlessly
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

  // Stop currently playing audio
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
