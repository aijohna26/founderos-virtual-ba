"use client";

import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { Venture } from "@/lib/store/ventureStore";
import { BAAgentService, ToolExecutionResult } from "@/lib/agent/baAgentService";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";
import { CommitmentStore } from "@/lib/store/commitmentStore";
import { MemoryService } from "@/lib/db/memoryService";
import { buildGeminiLiveConfig } from "@/lib/agent/geminiLiveConfig";
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
  onToolExecuting: (toolName: string, args: Record<string, unknown>) => void;
  onToolExecuted: (toolName: string, result: ToolExecutionResult) => void;
  onVentureUpdated: (venture: Venture) => void;
  onError: (error: string) => void;
}

interface LiveSessionAuthorization {
  token: string;
  expiresAt: string;
  newSessionExpiresAt: string;
  model: string;
  voice: string;
  sampleRate: number;
}

export class GeminiLiveService {
  private session: Session | null = null;
  private outputAudioContext: AudioContext | null = null;
  private captureAudioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isConnected = false;
  private isMuted = false;
  private isDisconnecting = false;
  private fallbackSignaled = false;
  private connectStartedAt = 0;
  private venture: Venture;
  private readonly callbacks: GeminiLiveServiceCallbacks;
  private nextPlayTime = 0;
  private audioQueue: AudioBufferSourceNode[] = [];
  private readonly voiceName: string;

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

  async connect(): Promise<boolean> {
    this.connectStartedAt = performance.now();
    this.callbacks.onStateChange("connecting");
    this.isDisconnecting = false;
    this.fallbackSignaled = false;

    try {
      const context = {
        venture: this.venture,
        commitments: CommitmentStore.getOutstandingCommitments(this.venture.id),
        learnings: CommitmentStore.getLearnings(this.venture.id),
        memories: MemoryService.getMemories(this.venture.id),
        voiceName: this.voiceName,
      };
      const authRes = await fetch("/api/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(context),
      });
      const auth = (await authRes.json()) as LiveSessionAuthorization & { error?: string };
      if (!authRes.ok || !auth.token) {
        throw new Error(auth.error || "Failed to provision a Gemini Live token");
      }

      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.outputAudioContext = new AudioCtx({ sampleRate: GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE });
      if (this.outputAudioContext.state === "suspended") {
        await this.outputAudioContext.resume();
      }
      this.analyserNode = this.outputAudioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.connect(this.outputAudioContext.destination);

      const ai = new GoogleGenAI({
        apiKey: auth.token,
        httpOptions: { apiVersion: "v1alpha" },
      });
      this.session = await ai.live.connect({
        model: auth.model,
        config: buildGeminiLiveConfig(context),
        callbacks: {
          onopen: () => {
            this.isConnected = true;
          },
          onmessage: (message) => this.handleServerMessage(message),
          onerror: (event) => {
            const detail = event.message || "Gemini Live connection error";
            this.signalFallback(detail);
          },
          onclose: (event) => {
            this.isConnected = false;
            if (!this.isDisconnecting) {
              this.signalFallback(event.reason || "Gemini Live connection closed unexpectedly");
            }
          },
        },
      });

      await this.startMicrophone();
      this.callbacks.onStateChange("listening");
      AIOperationsLogger.logOperation({
        ventureId: this.venture.id,
        ceremony: "daily_standup",
        geminiModel: auth.model,
        toolRequested: "live_session_start",
        toolArguments: { voice: this.voiceName, auth: "ephemeral_token" },
        toolResult: { status: "connected", expiresAt: auth.expiresAt },
        reasoningCategory: "accountability",
        latencyMs: Math.max(1, Math.round(performance.now() - this.connectStartedAt)),
        success: true,
      });

      this.session.sendClientContent({
        turns: [{
          role: "user",
          parts: [{ text: "Start the stand-up now with the single most important observation from the supplied sprint context." }],
        }],
        turnComplete: true,
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to Gemini Live";
      this.signalFallback(message);
      this.cleanup();
      return false;
    }
  }

  private async startMicrophone(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.captureAudioContext = new AudioCtx();
    if (this.captureAudioContext.state === "suspended") {
      await this.captureAudioContext.resume();
    }
    this.microphoneSource = this.captureAudioContext.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.captureAudioContext.createScriptProcessor(2048, 1, 1);
    const inputSampleRate = this.captureAudioContext.sampleRate;

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isConnected || this.isMuted || !this.session) return;
      const mono = event.inputBuffer.getChannelData(0);
      const resampled = this.resample(mono, inputSampleRate, GEMINI_CONFIG.AUDIO_INPUT_SAMPLE_RATE);
      const pcm16 = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const sample = Math.max(-1, Math.min(1, resampled[i]));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      this.session.sendRealtimeInput({
        audio: {
          data: this.arrayBufferToBase64(pcm16.buffer),
          mimeType: `audio/pcm;rate=${GEMINI_CONFIG.AUDIO_INPUT_SAMPLE_RATE}`,
        },
      });
    };

    this.microphoneSource.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.captureAudioContext.destination);
  }

  private handleServerMessage(message: LiveServerMessage): void {
    const content = message.serverContent;
    if (content?.interrupted) {
      this.stopPlayback();
      this.callbacks.onStateChange("listening");
    }

    if (content?.interimInputTranscription?.text) {
      this.callbacks.onTranscript("user", content.interimInputTranscription.text, false);
    }
    if (content?.inputTranscription?.text) {
      this.callbacks.onTranscript("user", content.inputTranscription.text, true);
      this.callbacks.onStateChange("thinking");
    }
    if (content?.outputTranscription?.text) {
      this.callbacks.onTranscript("ai", content.outputTranscription.text, false);
    }

    if (content?.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.playPcmChunk(part.inlineData.data);
          this.callbacks.onStateChange("speaking");
        }
        if (part.text) {
          this.callbacks.onTranscript("ai", part.text, false);
        }
      }
    }

    if (content?.turnComplete) {
      this.callbacks.onTranscript("ai", "", true);
      this.callbacks.onStateChange("listening");
    }

    if (message.toolCall?.functionCalls?.length) {
      this.callbacks.onStateChange("using_tool");
      const functionResponses = message.toolCall.functionCalls.map((call) => {
        const startedAt = performance.now();
        const args = (call.args || {}) as Record<string, unknown>;
        this.callbacks.onToolExecuting(call.name || "unknown_tool", args);
        const result = BAAgentService.executeTool(
          call.name || "unknown_tool",
          args,
          this.venture,
          "daily_standup"
        );
        if (result.updatedVenture) {
          this.venture = result.updatedVenture;
          this.callbacks.onVentureUpdated(this.venture);
        }
        this.callbacks.onToolExecuted(call.name || "unknown_tool", result);

        AIOperationsLogger.logOperation({
          ventureId: this.venture.id,
          ceremony: "daily_standup",
          geminiModel: GEMINI_CONFIG.LIVE_MODEL,
          toolRequested: `live_roundtrip:${call.name || "unknown_tool"}`,
          toolArguments: args,
          toolResult: {
            success: result.success,
            message: result.message,
            returnedToSameSession: true,
          },
          reasoningCategory: call.name === "record_commitment" ? "accountability" : "board_mutation",
          latencyMs: Math.round(performance.now() - startedAt),
          success: result.success,
        });

        return {
          id: call.id,
          name: call.name,
          response: result.success
            ? { output: { success: true, message: result.message, data: result.data || {} } }
            : { error: { success: false, message: result.message } },
        };
      });

      // Synchronous Live tools pause model generation until this response is
      // returned, so Sarah continues in this exact conversation with the
      // authoritative success/failure result.
      this.session?.sendToolResponse({ functionResponses });
    }
  }

  private playPcmChunk(base64Data: string): void {
    if (!this.outputAudioContext || !this.analyserNode) return;
    try {
      const pcmBytes = this.base64ToArrayBuffer(base64Data);
      const pcm16 = new Int16Array(pcmBytes);
      const samples = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) samples[i] = pcm16[i] / 32768;

      const buffer = this.outputAudioContext.createBuffer(
        1,
        samples.length,
        GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE
      );
      buffer.getChannelData(0).set(samples);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyserNode);
      const now = this.outputAudioContext.currentTime;
      this.nextPlayTime = Math.max(this.nextPlayTime, now);
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
      this.audioQueue.push(source);
      source.onended = () => {
        this.audioQueue = this.audioQueue.filter((queued) => queued !== source);
      };
    } catch (error) {
      console.warn("Gemini Live PCM playback failed:", error);
    }
  }

  interrupt(): void {
    this.stopPlayback();
    this.callbacks.onStateChange("listening");
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }

  disconnect(): void {
    this.isDisconnecting = true;
    if (this.isConnected) {
      AIOperationsLogger.logOperation({
        ventureId: this.venture.id,
        ceremony: "daily_standup",
        geminiModel: GEMINI_CONFIG.LIVE_MODEL,
        toolRequested: "live_session_end",
        toolArguments: {},
        toolResult: { status: "closed_by_user" },
        reasoningCategory: "accountability",
        latencyMs: Math.max(1, Math.round(performance.now() - this.connectStartedAt)),
        success: true,
      });
    }
    this.cleanup();
    this.callbacks.onStateChange("disconnected");
  }

  private signalFallback(message: string): void {
    if (this.fallbackSignaled || this.isDisconnecting) return;
    this.fallbackSignaled = true;
    this.callbacks.onStateChange("error");
    this.callbacks.onError(message);
    AIOperationsLogger.logOperation({
      ventureId: this.venture.id,
      ceremony: "daily_standup",
      geminiModel: GEMINI_CONFIG.LIVE_MODEL,
      toolRequested: "live_session_fallback",
      toolArguments: {},
      toolResult: { error: message, fallback: "speech_text_tts" },
      reasoningCategory: "accountability",
      latencyMs: Math.max(1, Math.round(performance.now() - this.connectStartedAt)),
      success: false,
    });
  }

  private cleanup(): void {
    this.isConnected = false;
    this.stopPlayback();
    try { this.session?.close(); } catch {}
    this.session = null;
    try { this.microphoneSource?.disconnect(); } catch {}
    this.microphoneSource = null;
    try { this.scriptProcessor?.disconnect(); } catch {}
    this.scriptProcessor = null;
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
    void this.captureAudioContext?.close();
    void this.outputAudioContext?.close();
    this.captureAudioContext = null;
    this.outputAudioContext = null;
    this.analyserNode = null;
  }

  private stopPlayback(): void {
    for (const source of this.audioQueue) {
      try { source.stop(); } catch {}
    }
    this.audioQueue = [];
    if (this.outputAudioContext) this.nextPlayTime = this.outputAudioContext.currentTime;
  }

  private resample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
    if (inputRate === outputRate) return input;
    const ratio = inputRate / outputRate;
    const outputLength = Math.max(1, Math.round(input.length / ratio));
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      for (let j = start; j < end; j++) sum += input[j];
      output[i] = sum / Math.max(1, end - start);
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
}
