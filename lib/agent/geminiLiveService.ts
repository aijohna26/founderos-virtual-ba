"use client";

import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { Venture } from "@/lib/store/ventureStore";
import { BAAgentService, ToolExecutionResult } from "@/lib/agent/baAgentService";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";
import { CommitmentStore } from "@/lib/store/commitmentStore";
import { MemoryService } from "@/lib/db/memoryService";
import { DocumentStore } from "@/lib/store/documentStore";
import { buildGeminiLiveConfig } from "@/lib/agent/geminiLiveConfig";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import {
  IDLE_DISCONNECT_SECONDS,
  IDLE_SIGNOFF_GRACE_MS,
  IDLE_WARNING_SECONDS,
  LIVE_SESSION_WARNING_LEAD_MINUTES,
  MAX_LIVE_SESSION_MINUTES,
} from "@/lib/config/liveUsageConfig";
import { DEFAULT_ADVISOR, type AdvisorPersona } from "@/lib/config/advisorPersonas";
import {
  isProposalCancellation,
  isProposalConfirmation,
  isTicketMutationAction,
} from "@/lib/agent/ticketProposal";

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
  /** Fired right before the 30-minute hard cutoff forces a disconnect, distinct from
   * onError -- this isn't a failure, it's the session doing exactly what it's supposed to. */
  onSessionTimedOut: () => void;
  /** Fired after the founder goes quiet through both the "are you still there?" check-in and
   * the grace period after it -- distinct from onSessionTimedOut (different reason: absence,
   * not the time cap) and onError (nothing went wrong). */
  onIdleDisconnect: () => void;
}

interface LiveSessionAuthorization {
  token: string;
  expiresAt: string;
  newSessionExpiresAt: string;
  model: string;
  voice: string;
  sampleRate: number;
  sessionId?: string | null;
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
  private readonly advisor: AdvisorPersona;
  private connectGeneration = 0;
  private authAbortController: AbortController | null = null;
  private lastFinalUserTranscript = "";
  private pendingTicketMutation: { name: string; args: Record<string, unknown> } | null = null;
  private usageSessionId: string | null = null;
  private readonly handlePageHide = () => this.endUsageSession();
  private sessionWarningTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionCutoffTimer: ReturnType<typeof setTimeout> | null = null;
  private idleWarningTimer: ReturnType<typeof setTimeout> | null = null;
  private idleDisconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    venture: Venture,
    callbacks: GeminiLiveServiceCallbacks,
    advisor: AdvisorPersona = DEFAULT_ADVISOR,
    // Overridable so callers other than the stand-up ceremony (e.g. the general Daily Call
    // panel) aren't forced into stand-up-flavored opening phrasing.
    private readonly initialPrompt: string = "Start the stand-up now with the single most important observation from the supplied sprint context."
  ) {
    this.venture = venture;
    this.callbacks = callbacks;
    this.advisor = advisor;
  }

  getAudioAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  async connect(): Promise<boolean> {
    const connectGeneration = ++this.connectGeneration;
    this.authAbortController?.abort();
    const authAbortController = new AbortController();
    this.authAbortController = authAbortController;
    this.connectStartedAt = performance.now();
    this.callbacks.onStateChange("connecting");
    this.isDisconnecting = false;
    this.fallbackSignaled = false;

    try {
      await Promise.all([
        CommitmentStore.hydrate(this.venture.id),
        MemoryService.hydrate(this.venture.id),
        DocumentStore.hydrate(this.venture.id),
        AIOperationsLogger.hydrate(this.venture.id),
      ]);
      const context = {
        venture: this.venture,
        commitments: CommitmentStore.getOutstandingCommitments(this.venture.id),
        learnings: CommitmentStore.getLearnings(this.venture.id),
        memories: MemoryService.getMemories(this.venture.id),
        documents: DocumentStore.getDocuments(this.venture.id),
        voiceName: this.advisor.voiceName,
        advisor: {
          name: this.advisor.name,
          title: this.advisor.title,
          style: this.advisor.style,
          voiceDirection: this.advisor.voiceDirection,
        },
      };
      const authRes = await fetch("/api/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          venture: context.venture,
          commitments: context.commitments,
          learnings: context.learnings,
          memories: context.memories,
          documents: context.documents,
          advisorId: this.advisor.id,
          voiceName: this.advisor.voiceName,
        }),
        signal: authAbortController.signal,
      });
      const auth = (await authRes.json()) as LiveSessionAuthorization & { error?: string };
      if (connectGeneration !== this.connectGeneration || this.isDisconnecting) return false;
      if (!authRes.ok || !auth.token) {
        throw new Error(auth.error || "Failed to provision a Gemini Live token");
      }
      this.usageSessionId = auth.sessionId || null;

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
        httpOptions: { apiVersion: "v1beta" },
      });
      const session = await ai.live.connect({
        model: auth.model,
        config: buildGeminiLiveConfig(context),
        callbacks: {
          onopen: () => {
            if (connectGeneration !== this.connectGeneration || this.isDisconnecting) return;
            this.isConnected = true;
          },
          onmessage: (message) => {
            if (connectGeneration !== this.connectGeneration || this.isDisconnecting) return;
            this.handleServerMessage(message);
          },
          onerror: (event) => {
            if (connectGeneration !== this.connectGeneration || this.isDisconnecting) return;
            const detail = event.message || "Gemini Live connection error";
            this.signalFallback(detail);
          },
          onclose: (event) => {
            if (connectGeneration !== this.connectGeneration) return;
            this.isConnected = false;
            if (!this.isDisconnecting) {
              this.signalFallback(event.reason || "Gemini Live connection closed unexpectedly");
            }
          },
        },
      });
      if (connectGeneration !== this.connectGeneration || this.isDisconnecting) {
        try { session.close(); } catch {}
        return false;
      }
      this.session = session;
      this.authAbortController = null;
      // Best-effort finalize on tab close/crash -- normal disconnect() already ends the
      // usage session explicitly; this covers the case where that never gets called.
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", this.handlePageHide);
      }

      await this.startMicrophone();
      if (connectGeneration !== this.connectGeneration || this.isDisconnecting) {
        this.cleanup();
        return false;
      }
      this.callbacks.onStateChange("listening");
      this.scheduleSessionTimeLimits(connectGeneration);
      this.resetIdleTimer();
      AIOperationsLogger.logOperation({
        ventureId: this.venture.id,
        ceremony: "daily_standup",
        geminiModel: auth.model,
        toolRequested: "live_session_start",
        toolArguments: { advisor: this.advisor.name, voice: this.advisor.voiceName, auth: "ephemeral_token" },
        toolResult: { status: "connected", expiresAt: auth.expiresAt },
        reasoningCategory: "accountability",
        latencyMs: Math.max(1, Math.round(performance.now() - this.connectStartedAt)),
        success: true,
      });

      this.session.sendRealtimeInput({ text: this.initialPrompt });
      return true;
    } catch (error) {
      if (
        connectGeneration !== this.connectGeneration ||
        this.isDisconnecting ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        return false;
      }
      const message = error instanceof Error ? error.message : "Failed to connect to Gemini Live";
      this.signalFallback(message);
      // A usage session may already have been created server-side (token issuance
      // succeeded) even though the WebSocket connection itself just failed -- close it out
      // immediately rather than leaving it "active" until the 30-minute cap.
      this.endUsageSession();
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
      this.resetIdleTimer();
      this.lastFinalUserTranscript = content.inputTranscription.text.trim();
      if (isProposalCancellation(this.lastFinalUserTranscript)) {
        this.pendingTicketMutation = null;
      }
      this.callbacks.onTranscript("user", content.inputTranscription.text, true);
      this.callbacks.onStateChange("thinking");
    }
    if (content?.outputTranscription?.text) {
      this.callbacks.onTranscript("ai", content.outputTranscription.text, false);
    }

    if (content?.modelTurn?.parts) {
      for (const part of content.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.resetIdleTimer();
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
      this.resetIdleTimer();
      this.callbacks.onStateChange("using_tool");
      const functionResponses = message.toolCall.functionCalls.map((call) => {
        const startedAt = performance.now();
        const args = (call.args || {}) as Record<string, unknown>;
        const toolName = call.name || "unknown_tool";
        const isTicketMutation = isTicketMutationAction({ type: toolName });
        // Same tool name is enough to treat this as a follow-up on the pending proposal --
        // NOT a byte-exact args match. The model re-generates its own tool call in natural
        // language when it re-confirms, so any rephrasing (e.g. the exact wording of a
        // blockedReason) would silently break a strict equality check even after the founder
        // clearly said yes. pendingTicketMutation is a single slot anyway, so "same tool
        // name while one's outstanding" already identifies which proposal this is.
        const isPendingFollowUp = this.pendingTicketMutation?.name === toolName;

        if (isTicketMutation && !(isPendingFollowUp && isProposalConfirmation(this.lastFinalUserTranscript))) {
          this.pendingTicketMutation = { name: toolName, args };
          const pendingResult: ToolExecutionResult = {
            toolName,
            success: true,
            message: "This ticket change is prepared but has not been applied. Describe the exact proposed changes and ask the human to confirm yes or no.",
            data: { requiresConfirmation: true, proposedArguments: args },
          };
          this.callbacks.onToolExecuted(toolName, pendingResult);
          AIOperationsLogger.logOperation({
            ventureId: this.venture.id,
            ceremony: "daily_standup",
            geminiModel: GEMINI_CONFIG.LIVE_MODEL,
            toolRequested: `live_confirmation_required:${toolName}`,
            toolArguments: args,
            toolResult: { success: true, requiresConfirmation: true, returnedToSameSession: true },
            reasoningCategory: "board_mutation",
            latencyMs: Math.round(performance.now() - startedAt),
            success: true,
          });
          return {
            id: call.id,
            name: call.name,
            response: { output: { success: true, requiresConfirmation: true, message: pendingResult.message } },
          };
        }

        if (isTicketMutation) this.pendingTicketMutation = null;
        this.callbacks.onToolExecuting(toolName, args);
        const result = BAAgentService.executeTool(
          toolName,
          args,
          this.venture,
          "daily_standup"
        );
        if (result.updatedVenture) {
          this.venture = result.updatedVenture;
          this.callbacks.onVentureUpdated(this.venture);
        }
        this.callbacks.onToolExecuted(toolName, result);

        AIOperationsLogger.logOperation({
          ventureId: this.venture.id,
          ceremony: "daily_standup",
          geminiModel: GEMINI_CONFIG.LIVE_MODEL,
          toolRequested: `live_roundtrip:${toolName}`,
          toolArguments: args,
          toolResult: {
            success: result.success,
            message: result.message,
            returnedToSameSession: true,
          },
          reasoningCategory: toolName === "record_commitment" ? "accountability" : "board_mutation",
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
      // returned, so the selected advisor continues in this exact conversation with the
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

  /**
   * Sends a typed message into this live session, same conversation as spoken input. Note
   * this does not itself produce an onTranscript("user", ...) callback -- there's no audio
   * for Gemini to transcribe, so the caller is responsible for reflecting the typed text in
   * its own UI/history before calling this.
   */
  sendText(text: string): void {
    if (!this.session || !this.isConnected || !text.trim()) return;
    this.session.sendRealtimeInput({ text: text.trim() });
  }

  isActive(): boolean {
    return this.isConnected;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
  }

  disconnect(): void {
    this.connectGeneration += 1;
    this.authAbortController?.abort();
    this.authAbortController = null;
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
    this.endUsageSession();
    this.cleanup();
    this.callbacks.onStateChange("disconnected");
  }

  /**
   * P0 #4: 30-minute maximum Live session. Scheduled once the mic is actually live (not from
   * when connect() was first called), so the cap reflects real conversation time. A warning
   * fires a few minutes before the cutoff -- as a text nudge into the live session so Sarah
   * herself announces it naturally in-voice, using the existing transcript/tool machinery
   * rather than a separate summary-generation step -- then a hard disconnect follows at the
   * cap. `connectGeneration` is captured at schedule time so a manual disconnect/reconnect
   * before either fires can't let a stale timer act on the wrong session.
   */
  private scheduleSessionTimeLimits(connectGeneration: number): void {
    const warningDelayMs = Math.max(
      0,
      (MAX_LIVE_SESSION_MINUTES - LIVE_SESSION_WARNING_LEAD_MINUTES) * 60_000,
    );
    this.sessionWarningTimer = setTimeout(() => {
      if (connectGeneration !== this.connectGeneration || !this.session) return;
      this.session.sendRealtimeInput({
        text: `[SYSTEM: Only ${LIVE_SESSION_WARNING_LEAD_MINUTES} minutes remain before this Live session must end. Tell the founder now, briefly: we're nearly at the end of this session, summarize the key decisions and commitments so far, and ask if anything important still needs to be resolved before we finish.]`,
      });
    }, warningDelayMs);

    this.sessionCutoffTimer = setTimeout(() => {
      if (connectGeneration !== this.connectGeneration) return;
      this.callbacks.onSessionTimedOut();
      this.disconnect();
    }, MAX_LIVE_SESSION_MINUTES * 60_000);
  }

  private clearSessionTimeLimits(): void {
    if (this.sessionWarningTimer) clearTimeout(this.sessionWarningTimer);
    if (this.sessionCutoffTimer) clearTimeout(this.sessionCutoffTimer);
    this.sessionWarningTimer = null;
    this.sessionCutoffTimer = null;
  }

  /**
   * P0 #5: idle detection. (Re)arms on genuine activity only -- a final user transcript, a
   * tool call, or Sarah actually speaking a turn -- never on interim ASR blips or ambient
   * audio, so background noise can neither reset this nor be mistaken for the founder still
   * being present. This also catches the doc's named "stale session" cases (sleeping laptop,
   * dead network, an abandoned tab) for free: every one of them simply stops producing
   * activity, so the same clock ends all of them the same way.
   */
  private resetIdleTimer(): void {
    if (this.idleWarningTimer) clearTimeout(this.idleWarningTimer);
    if (this.idleDisconnectTimer) clearTimeout(this.idleDisconnectTimer);
    this.idleDisconnectTimer = null;

    const generation = this.connectGeneration;
    this.idleWarningTimer = setTimeout(() => {
      if (generation !== this.connectGeneration || !this.session) return;
      this.session.sendRealtimeInput({
        text: "[SYSTEM: The founder has been quiet for about a minute. Check in briefly and naturally -- ask if they're still there.]",
      });

      this.idleDisconnectTimer = setTimeout(() => {
        if (generation !== this.connectGeneration || !this.session) return;
        this.session.sendRealtimeInput({
          text: "[SYSTEM: There's been no response to your check-in. Say a brief, natural goodbye -- you're ending the call here and you've saved progress so far.]",
        });
        setTimeout(() => {
          if (generation !== this.connectGeneration) return;
          this.callbacks.onIdleDisconnect();
          this.disconnect();
        }, IDLE_SIGNOFF_GRACE_MS);
      }, IDLE_DISCONNECT_SECONDS * 1000);
    }, IDLE_WARNING_SECONDS * 1000);
  }

  private clearIdleTimer(): void {
    if (this.idleWarningTimer) clearTimeout(this.idleWarningTimer);
    if (this.idleDisconnectTimer) clearTimeout(this.idleDisconnectTimer);
    this.idleWarningTimer = null;
    this.idleDisconnectTimer = null;
  }

  /** Finalizes this session's live_usage_sessions row via the server's own clock. Uses
   * sendBeacon so it reliably completes even during a tab close/unload, when a normal fetch
   * could get cancelled mid-flight. Safe to call more than once (server-side no-op on an
   * already-ended session). */
  private endUsageSession(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.handlePageHide);
    }
    if (!this.usageSessionId) return;
    const sessionId = this.usageSessionId;
    this.usageSessionId = null;
    try {
      const payload = JSON.stringify({ sessionId });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/live-session/end", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/live-session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch (err) {
      console.warn("Failed to finalize live usage session:", err);
    }
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
    this.clearSessionTimeLimits();
    this.clearIdleTimer();
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
