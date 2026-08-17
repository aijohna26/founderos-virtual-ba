"use client";

import { Venture, VentureStore } from "@/lib/store/ventureStore";
import { BAAgentService, ToolExecutionResult } from "@/lib/agent/baAgentService";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

export type LiveSessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "using_tool"
  | "speaking"
  | "disconnected"
  | "error";

export interface GeminiLiveServiceCallbacks {
  onStateChange: (state: LiveSessionState) => void;
  onTranscript: (sender: "user" | "ai", text: string, isFinal: boolean) => void;
  onToolExecuting: (toolName: string, args: Record<string, any>) => void;
  onToolExecuted: (toolName: string, result: ToolExecutionResult) => void;
  onVentureUpdated: (venture: Venture) => void;
  onError: (error: string) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private isMuted: boolean = false;
  private venture: Venture;
  private callbacks: GeminiLiveServiceCallbacks;
  private nextPlayTime: number = 0;
  private audioQueue: AudioBufferSourceNode[] = [];
  private voiceName: string;

  constructor(
    venture: Venture,
    callbacks: GeminiLiveServiceCallbacks,
    voiceName: string = GEMINI_CONFIG.VOICES.SARAH_PRIMARY
  ) {
    this.venture = venture;
    this.callbacks = callbacks;
    this.voiceName = voiceName;
  }

  getAudioAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  // Connect to persistent Gemini Live Session via Secure Server Endpoint
  async connect(): Promise<boolean> {
    this.callbacks.onStateChange("connecting");

    try {
      // 1. Authorize session securely via server endpoint (no exposed API keys on client)
      const authRes = await fetch("/api/live-session", { method: "POST" });
      if (!authRes.ok) {
        const errData = await authRes.json();
        throw new Error(errData.error || "Failed server session authorization");
      }

      const { wsUrl } = await authRes.json();

      // 2. Initialize Web Audio Context & Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;

      // 3. Open Bidirectional WebSocket to Gemini Live
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.callbacks.onStateChange("listening");
        this.sendSessionSetup();
        this.startMicrophone();

        AIOperationsLogger.logOperation({
          ventureId: this.venture.id,
          ceremony: "daily_standup",
          geminiModel: GEMINI_CONFIG.LIVE_MODEL,
          toolRequested: "session_start",
          toolArguments: { voice: this.voiceName },
          toolResult: { status: "connected" },
          reasoningCategory: "accountability",
          latencyMs: 0,
          success: true,
        });
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            data = JSON.parse(await event.data.text());
          } else if (typeof event.data === "string") {
            data = JSON.parse(event.data);
          }

          if (data) {
            this.handleServerMessage(data);
          }
        } catch (e) {
          console.warn("Gemini Live message parsing notice:", e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn("Gemini Live WebSocket notice:", e);
        this.callbacks.onStateChange("error");
        this.callbacks.onError("Gemini Live connection issue.");
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onStateChange("disconnected");
        this.cleanup();
      };

      return true;
    } catch (err: any) {
      console.error("Failed starting Gemini Live session:", err);
      this.callbacks.onStateChange("error");
      this.callbacks.onError(err.message || "Failed to connect to Live session");
      return false;
    }
  }

  // Send Initial Setup with the 7 MVP Formal Tool Declarations
  private sendSessionSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupPayload = {
      setup: {
        model: GEMINI_CONFIG.LIVE_MODEL,
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
ROLE: You facilitate the daily sprint stand-up with the founder.
SPRINT GOAL: "${this.venture.problemStatement || "Validate primary customer demand"}".
BEHAVIOR:
- Be concise (1-3 spoken sentences), sharp, focused on sprint goals, and challenging when the founder gets distracted by low-priority work.
- When the founder commits to something, requests a ticket move, creates work, or reflects on learnings, CALL THE APPROPRIATE NATIVE TOOL IMMEDIATELY.
- When you receive tool execution results, CONTINUE SPEAKING NATURALLY to confirm and set next actions.`,
            },
          ],
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: "get_sprint_context",
                description: "Retrieves authoritative current sprint status, board state, commitments, and sprint goals.",
                parameters: { type: "OBJECT", properties: {} },
              },
              {
                name: "get_ticket",
                description: "Retrieves authoritative details for a specific card/ticket by ID or title substring.",
                parameters: {
                  type: "OBJECT",
                  properties: { cardTitle: { type: "STRING", description: "Card title or ID" } },
                  required: ["cardTitle"],
                },
              },
              {
                name: "create_ticket",
                description: "Creates a new task or experiment on the Kanban board.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Ticket title" },
                    column: { type: "STRING", enum: ["backlog", "today", "in_progress", "done", "blocked"] },
                    category: { type: "STRING", enum: ["Feature", "Growth", "Experiment", "Research", "Technical", "Design", "Legal"] },
                    priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                    reason: { type: "STRING", description: "Why this ticket matters towards the sprint goal" },
                  },
                  required: ["title"],
                },
              },
              {
                name: "update_ticket",
                description: "Updates or refines an existing ticket (acceptance criteria, description, priority).",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    cardTitle: { type: "STRING", description: "Ticket title to update" },
                    description: { type: "STRING", description: "Updated description" },
                    priority: { type: "STRING", enum: ["High", "Medium", "Low"] },
                  },
                  required: ["cardTitle"],
                },
              },
              {
                name: "move_ticket",
                description: "Moves an existing ticket between columns (e.g. to 'done', 'backlog', 'today', 'blocked').",
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
                    deadline: { type: "STRING", description: "Target deadline (e.g. 'End of Day')" },
                  },
                  required: ["commitment"],
                },
              },
              {
                name: "record_learning",
                description: "Stores durable retrospective learnings and recurring behavioral patterns.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    pattern: { type: "STRING", description: "Observed behavioral pattern or customer insight" },
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

    this.ws.send(JSON.stringify(setupPayload));
  }

  // Stream Microphone Audio as 16kHz PCM (Linear 16-bit Mono)
  private async startMicrophone(): Promise<void> {
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
      console.warn("Microphone access notice:", err);
      this.callbacks.onError("Microphone access error: " + err.message);
    }
  }

  // Handle Server WebSocket Messages
  private handleServerMessage(data: any): void {
    // 1. Barge-In Interruption: User spoke over AI
    if (data.serverContent?.interrupted) {
      this.stopPlayback();
      this.callbacks.onStateChange("listening");
      return;
    }

    // 2. Audio & Transcript streaming from Gemini Live
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

    // 3. Native Function Call Handling -> Tool Result Loop in SAME Live Session
    if (data.toolCall?.functionCalls) {
      this.callbacks.onStateChange("using_tool");

      for (const call of data.toolCall.functionCalls) {
        this.callbacks.onToolExecuting(call.name, call.args || {});

        // Execute tool authoritatively against domain state
        const toolResult = BAAgentService.executeTool(
          call.name,
          call.args || {},
          this.venture,
          "daily_standup"
        );

        if (toolResult.updatedVenture) {
          this.venture = toolResult.updatedVenture;
          VentureStore.updateVenture(this.venture);
          this.callbacks.onVentureUpdated(this.venture);
        }

        this.callbacks.onToolExecuted(call.name, toolResult);

        // Return tool result back to Gemini Live in the SAME session
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const toolResponsePayload = {
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
          this.ws.send(JSON.stringify(toolResponsePayload));
        }
      }
    }
  }

  // Play 24kHz PCM Audio through Web Audio API
  private playPcmChunk(base64Data: string): void {
    if (!this.audioContext || !this.analyserNode) return;

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

      // Connect to AnalyserNode so visualizer canvas animates to live audio frequencies
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

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

  // Instant Interrupt / Barge-In
  interrupt(): void {
    this.stopPlayback();
    this.callbacks.onStateChange("listening");
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  disconnect(): void {
    this.cleanup();
  }

  private stopPlayback(): void {
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

  private cleanup(): void {
    this.isConnected = false;
    this.stopPlayback();

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
