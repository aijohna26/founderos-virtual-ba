"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Settings,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Brain,
  Database,
  X,
  Clock,
  Calendar,
  Radio,
  Trash2,
  ChevronDown,
  Check
} from "lucide-react";
import { Venture, VentureStore, ChatMessage } from "@/lib/store/ventureStore";
import { VoiceEngine, VoiceState } from "@/lib/voice/voiceEngine";
import { GeminiLiveService, type LiveSessionState } from "@/lib/agent/geminiLiveService";
import { MemoryService, MemoryFact } from "@/lib/db/memoryService";
import { BAAgentService, type ToolExecutionResult } from "@/lib/agent/baAgentService";
import { DocumentStore } from "@/lib/store/documentStore";
import {
  ADVISOR_PERSONAS,
  GEMINI_VOICES,
  findGeminiVoice,
  resolveAdvisor,
  type AdvisorPersona,
} from "@/lib/config/advisorPersonas";
import {
  createPendingTicketProposal,
  isProposalCancellation,
  isProposalConfirmation,
  isTicketMutationAction,
  type PendingTicketProposal,
} from "@/lib/agent/ticketProposal";

// Maps a genuine (non-"aborted"/"no-speech") SpeechRecognition error code to a message the
// founder actually needs to see, since VoiceEngine only ever logged these to the console before.
function describeMicError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked, so Sarah can't hear you. Allow mic permissions for this site and try again.";
    case "audio-capture":
      return "No microphone was found. Voice input is paused until one is connected.";
    case "network":
      return "Voice recognition lost its connection. Trying to reconnect…";
    default:
      return `Voice input hit a snag ("${code}") and paused. Toggle the mic to retry.`;
  }
}

export interface AiAnalystPanelProps {
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
  voiceControlsManagedExternally?: boolean;
  activeWorkspace?: string;
}

export function AiAnalystPanel({
  isDailyCallActive,
  setIsDailyCallActive,
  venture,
  onUpdateVenture,
  isMobileOpen = false,
  onMobileClose,
  onMobileOpen,
  voiceControlsManagedExternally = false,
  activeWorkspace,
}: AiAnalystPanelProps) {
  const advisor = resolveAdvisor(venture.advisorId, venture.advisorVoiceName);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeakingAI, setIsSpeakingAI] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [micWarning, setMicWarning] = useState<string | null>(null);
  const [isConnectingCall, setIsConnectingCall] = useState(false);
  // Mirrors liveClientRef.current being a connected session, kept as state (not a direct ref
  // read) specifically so it's safe to use in JSX -- reading ref.current during render can
  // silently desync from what's on screen.
  const [isLiveCallConnected, setIsLiveCallConnected] = useState(false);
  const [liveToolNotice, setLiveToolNotice] = useState<string | null>(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAdvisorPicker, setShowAdvisorPicker] = useState(false);
  const [focusedTicket, setFocusedTicket] = useState<{ id: string; title: string } | null>(null);
  const [pendingTicketProposal, setPendingTicketProposal] = useState<PendingTicketProposal | null>(null);
  const [scheduledTime, setScheduledTime] = useState(venture?.standupTime || "09:00 AM");
  const [memories, setMemories] = useState<MemoryFact[]>(() => MemoryService.getMemories(venture.id));
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const analystRequestRef = useRef<AbortController | null>(null);
  const componentActiveRef = useRef(true);
  const isTypingRef = useRef(isTyping);
  const submitMessageRef = useRef<(text: string) => void>(() => {});
  const liveClientRef = useRef<GeminiLiveService | null>(null);
  // GeminiLiveService callbacks are bound once per call and outlive individual renders, so
  // they need a way to read the *current* venture (not the one closed over when the call
  // started) to append chat messages onto the latest history instead of a stale snapshot.
  const ventureRef = useRef(venture);
  useEffect(() => {
    ventureRef.current = venture;
  }, [venture]);
  const liveAiBufferRef = useRef("");

  const messages = venture?.chatHistory || [
    {
      id: "1",
      sender: "ai",
      text: `Good morning! I'm your AI Business Analyst for ${venture.name}. What critical hypothesis are we testing today?`,
      timestamp: "09:00 AM",
    },
  ];

  const focusedTicketRecord = focusedTicket
    ? (Object.keys(venture.columns) as Array<keyof Venture["columns"]>).flatMap((column) =>
        (venture.columns[column]?.items || []).map((card) => ({ card, column }))
      ).find(({ card }) => card.id === focusedTicket.id) || null
    : null;

  const selectAdvisor = (nextAdvisor: AdvisorPersona) => {
    VoiceEngine.stopSpeaking();
    setIsSpeakingAI(false);
    const updatedVenture: Venture = { ...venture, advisorId: nextAdvisor.id };
    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setShowAdvisorPicker(false);
  };

  const selectVoice = (voiceName: string) => {
    const voice = findGeminiVoice(voiceName);
    if (!voice) return;
    VoiceEngine.stopSpeaking();
    setIsSpeakingAI(false);
    const updatedVenture: Venture = {
      ...venture,
      advisorVoiceName: voice.name,
    };
    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
  };

  // Sync standup schedule time when switching projects
  useEffect(() => {
    if (venture) {
      const defaultTime =
        venture.id === "founderally"
          ? "09:00 AM"
          : venture.id?.toLowerCase().includes("property")
          ? "11:00 AM"
          : "10:00 AM";
      setScheduledTime(venture.standupTime || defaultTime);
    }
  }, [venture?.id, venture?.standupTime]);

  // Load long-term memory for active venture
  useEffect(() => {
    if (venture?.id) {
      let active = true;
      void MemoryService.hydrate(venture.id).then((hydrated) => {
        if (active && hydrated) setMemories(MemoryService.getMemories(venture.id));
      });
      return () => {
        active = false;
      };
    }
  }, [venture?.id]);

  useEffect(() => {
    const handleTicketFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ ventureId?: string; ticketId?: string; title?: string; prompt?: string }>).detail;
      if (detail?.ventureId !== venture.id || !detail.ticketId || !detail.title) return;
      setFocusedTicket({ id: detail.ticketId, title: detail.title });
      setPendingTicketProposal((current) => current?.ticketId === detail.ticketId ? current : null);
      if (detail.prompt) setInputVal(detail.prompt);
      if (window.innerWidth < 1024) onMobileOpen?.();
    };
    window.addEventListener("founderally:focus-ticket", handleTicketFocus);
    return () => window.removeEventListener("founderally:focus-ticket", handleTicketFocus);
  }, [venture.id, onMobileOpen]);

  // Auto-scroll to the top of the latest message
  useEffect(() => {
    if (isTyping) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } else if (latestMsgRef.current) {
      latestMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, isTyping]);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptRef = useRef<string>("");

  useEffect(() => {
    componentActiveRef.current = true;
    return () => {
      componentActiveRef.current = false;
      analystRequestRef.current?.abort();
      analystRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // Initialize Speech Recognition & Voice Engine with Real-Time Interruption & Silence Detection
  useEffect(() => {
    VoiceEngine.preloadVoices();
    VoiceEngine.initRecognition(
      (transcript, isFinal) => {
        if (!transcript.trim()) return;

        // If user spoke, ensure AI speaking state is immediately cleared
        setIsSpeakingAI(false);
        setInputVal(transcript);
        pendingTranscriptRef.current = transcript.trim();

        // Clear existing silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        // Wait for the user to finish speaking (600ms on final or 1300ms on pause)
        const delay = isFinal ? 600 : 1300;
        silenceTimerRef.current = setTimeout(() => {
          if (pendingTranscriptRef.current.trim().length > 0 && !isTypingRef.current) {
            const textToSubmit = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = "";

            // 🛑 Block self-echo loop fragments
            const lower = textToSubmit.toLowerCase();
            if (lower === "got it" || lower === "got it." || lower === "got it looking" || lower === "i" || lower === "the") {
              return;
            }

            submitMessageRef.current(textToSubmit);
          }
        }, delay);
      },
      (state) => {
        setVoiceState(state);
        // Recognition made it back to "listening" or "speaking", so whatever previously
        // interrupted it (permission prompt resolved, mic reconnected, network back) is over.
        if (state === "listening" || state === "speaking") {
          setMicWarning(null);
        }
      },
      (err) => {
        console.warn("Voice Engine:", err);
        setMicWarning(describeMicError(err));
      },
      () => {
        // Interrupted callback: User spoke over AI
        setIsSpeakingAI(false);
        setVoiceState("listening");
      }
    );

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      VoiceEngine.stopListening();
      VoiceEngine.stopSpeaking();
    };
  }, [venture.id]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Daily Call's microphone is owned entirely by GeminiLiveService now (it captures raw
  // audio itself once connected) -- the old Web Speech recognition path must stay off during
  // a call, or both would transcribe the same input and could double-fire submitMessage.
  useEffect(() => {
    VoiceEngine.stopListening();
  }, [voiceControlsManagedExternally]);

  // Disconnect the live session on unmount (venture switch, panel closing) so a call never
  // keeps streaming audio after the component that owns it is gone.
  useEffect(() => {
    return () => {
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
    };
  }, []);

  // Call timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDailyCallActive) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDailyCallActive]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs
      .toString()
      .padStart(2, "0")}`;
  };

  const executePendingTicketProposal = (confirmationText = "Confirm changes") => {
    if (!pendingTicketProposal) return;
    const userConfirmation: ChatMessage = {
      id: `u-confirm-${Date.now()}`,
      sender: "user",
      text: confirmationText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    let currentVenture: Venture = { ...venture };
    const results = pendingTicketProposal.actions.map((action) => {
      const result = BAAgentService.executeTool(action.type, action, currentVenture, "ad_hoc_decision");
      if (result.updatedVenture) currentVenture = result.updatedVenture;
      return result;
    });
    const failed = results.find((result) => !result.success);
    const resultText = failed
      ? `I couldn't apply the proposed ticket changes: ${failed.message}`
      : `Done. I updated “${pendingTicketProposal.ticketTitle}”: ${pendingTicketProposal.changes.join("; ")}. What should we refine next?`;
    const aiResult: ChatMessage = {
      id: `ai-confirm-${Date.now()}`,
      sender: "ai",
      text: resultText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const finalVenture: Venture = {
      ...currentVenture,
      chatHistory: [...messages, userConfirmation, aiResult],
    };
    VentureStore.updateVenture(finalVenture);
    onUpdateVenture(finalVenture);
    setPendingTicketProposal(null);
    if (voiceAudioEnabled) {
      VoiceEngine.speak(
        resultText,
        advisor.voiceName,
        () => setIsSpeakingAI(true),
        () => setIsSpeakingAI(false),
      );
    }
  };

  const cancelPendingTicketProposal = (cancellationText = "Cancel changes") => {
    if (!pendingTicketProposal) return;
    const userCancellation: ChatMessage = {
      id: `u-cancel-${Date.now()}`,
      sender: "user",
      text: cancellationText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const aiCancellation: ChatMessage = {
      id: `ai-cancel-${Date.now()}`,
      sender: "ai",
      text: `Cancelled. I left “${pendingTicketProposal.ticketTitle}” unchanged.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updatedVenture: Venture = {
      ...venture,
      chatHistory: [...messages, userCancellation, aiCancellation],
    };
    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setPendingTicketProposal(null);
  };

  // Appends one message to chat history using the *current* venture (via ventureRef, not the
  // possibly-stale `venture` prop closed over when the live call started) so successive
  // transcript events during one call build on each other instead of clobbering history.
  const appendChatMessage = (sender: "user" | "ai", text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated: Venture = {
      ...ventureRef.current,
      chatHistory: [...(ventureRef.current.chatHistory || []), msg],
    };
    ventureRef.current = updated;
    VentureStore.updateVenture(updated);
    onUpdateVenture(updated);
  };

  const submitMessage = async (userText: string) => {
    if (!userText.trim() || isTyping) return;
    if (pendingTicketProposal && isProposalConfirmation(userText)) {
      setInputVal("");
      executePendingTicketProposal(userText);
      return;
    }
    if (pendingTicketProposal && isProposalCancellation(userText)) {
      setInputVal("");
      cancelPendingTicketProposal(userText);
      return;
    }
    // A Daily Call is live -- send typed text into that same session instead of the
    // text-then-separately-fetch-audio /api/ai-analyst path. Live won't transcribe typed
    // input itself (there's no audio to run ASR on), so the user bubble is added here.
    if (liveClientRef.current?.isActive()) {
      setInputVal("");
      appendChatMessage("user", userText);
      liveClientRef.current.sendText(userText);
      return;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    pendingTranscriptRef.current = "";
    setInputVal("");

    const newMsg: ChatMessage = {
      id: "u-" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...messages, newMsg];
    const updatedVenture = {
      ...venture,
      chatHistory: updatedHistory,
    };

    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
    setIsTyping(true);
    analystRequestRef.current?.abort();
    const requestController = new AbortController();
    analystRequestRef.current = requestController;

    try {
      const activeMemories = MemoryService.getMemories(venture.id);
      const activeDocuments = DocumentStore.getDocuments(venture.id);

      const res = await fetch("/api/ai-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          venture: {
            name: venture.name,
            tagline: venture.tagline,
            stage: venture.stage,
            targetCustomer: venture.targetCustomer,
            problemStatement: venture.problemStatement,
            assumptions: venture.assumptions,
            columns: venture.columns,
            priorities: venture.priorities,
            ticketActivity: venture.ticketActivity,
            boardSnapshots: venture.boardSnapshots,
            lastStandupAt: venture.lastStandupAt,
            standupComparisonSince: venture.standupComparisonSince,
            members: venture.members,
            standupSessions: venture.standupSessions,
          },
          memories: activeMemories,
          documents: activeDocuments,
          history: updatedHistory.slice(-6),
          focusedTicket: focusedTicketRecord ? {
            id: focusedTicketRecord.card.id,
            title: focusedTicketRecord.card.title,
            column: focusedTicketRecord.column,
          } : null,
        }),
        signal: requestController.signal,
      });

      const data = await res.json();
      if (!componentActiveRef.current || requestController.signal.aborted) return;
      const aiReplyText =
        data.reply ||
        `I've analyzed your input for ${venture.name}. Let's prioritize validating your core hypothesis.`;

      // The assistant resolved a specific ticket this turn (e.g. "open the login bug card")
      // -- actually open it instead of leaving the reply text as the only evidence anything
      // happened. BoardTab (or the dashboard shell, if Board isn't the active tab) listens
      // for this.
      if (typeof data.openTicketId === "string" && data.openTicketId) {
        window.dispatchEvent(new CustomEvent("founderally:open-card", {
          detail: { ventureId: venture.id, ticketId: data.openTicketId },
        }));
      }

      let currentVenture: Venture = { ...venture };
      const toolResults: ToolExecutionResult[] = [];
      const rawActions = Array.isArray(data.actions) ? data.actions : [];
      const proposedTicketActions = focusedTicketRecord
        ? rawActions.filter(isTicketMutationAction)
        : [];
      const immediateActions = proposedTicketActions.length > 0
        ? rawActions.filter((action: unknown) => !isTicketMutationAction(action))
        : rawActions;
      const proposal = focusedTicketRecord && proposedTicketActions.length > 0
        ? createPendingTicketProposal(
            proposedTicketActions,
            { id: focusedTicketRecord.card.id, title: focusedTicketRecord.card.title },
            venture,
          )
        : null;

      if (immediateActions.length > 0) {
        for (const action of immediateActions) {
          const toolName = action.type;
          const execRes = BAAgentService.executeTool(toolName, action, currentVenture, "daily_standup");
          toolResults.push(execRes);
          if (execRes.updatedVenture) {
            currentVenture = execRes.updatedVenture;
          }
        }
      }

      const failedTool = toolResults.find((result) => !result.success);
      const successfulTool = [...toolResults].reverse().find((result) => result.success);
      const confirmedReplyText = proposal
        ? `I’ve prepared ${proposal.changes.length || proposal.actions.length} proposed ${proposal.changes.length === 1 ? "change" : "changes"} for “${proposal.ticketTitle}”. Review them below and confirm before I update the board.`
        : failedTool
        ? `I couldn't complete that action: ${failedTool.message}`
        : successfulTool
        ? `Done — ${successfulTool.message}. What would you like to refine next?`
        : aiReplyText;

      const aiMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: confirmedReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalVenture: Venture = {
        ...currentVenture,
        chatHistory: [...updatedHistory, aiMsg],
      };

      VentureStore.updateVenture(finalVenture);
      onUpdateVenture(finalVenture);
      if (proposal) setPendingTicketProposal(proposal);

      // Auto-extract memory fact if significant
      if (
        userText.toLowerCase().includes("pricing") ||
        userText.toLowerCase().includes("customer") ||
        userText.toLowerCase().includes("target") ||
        userText.toLowerCase().includes("decision")
      ) {
        const newFact = MemoryService.addMemory(
          venture.id,
          `Founder noted: "${userText.slice(0, 100)}..."`,
          "Customer",
          "founder"
        );
        setMemories((prev) => [newFact, ...prev]);
      }

      // Speak response aloud if voice audio is enabled and Daily Call is active
      if (voiceAudioEnabled) {
        VoiceEngine.speak(
          confirmedReplyText,
          advisor.voiceName,
          () => setIsSpeakingAI(true),
          () => setIsSpeakingAI(false)
        );
      }
    } catch (err) {
      if (requestController.signal.aborted || !componentActiveRef.current) return;
      console.error("Failed to fetch AI Analyst response:", err);
      const fallbackMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: `I've registered your note for ${venture.name}. Let's prioritize customer discovery.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      const finalVenture = {
        ...venture,
        chatHistory: [...updatedHistory, fallbackMsg],
      };
      VentureStore.updateVenture(finalVenture);
      onUpdateVenture(finalVenture);
    } finally {
      if (analystRequestRef.current === requestController) {
        analystRequestRef.current = null;
      }
      if (componentActiveRef.current) {
        setIsTyping(false);
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    submitMessageRef.current = submitMessage;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(inputVal);
  };

  const toggleMic = () => {
    if (voiceControlsManagedExternally) return;
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (liveClientRef.current) {
      liveClientRef.current.setMuted(nextMuted);
    } else if (nextMuted) {
      VoiceEngine.stopListening();
      setVoiceState("idle");
    }
  };

  const speakFallbackGreeting = () => {
    const lastAiMsg = [...messages].reverse().find((m) => m.sender === "ai");
    const greeting =
      lastAiMsg?.text ||
      `Good day Founder! I'm your AI Business Analyst. I've loaded your venture context for ${venture.name}. What's the biggest uncertainty we should stress-test today?`;
    VoiceEngine.speak(
      greeting,
      advisor.voiceName,
      () => setIsSpeakingAI(true),
      () => setIsSpeakingAI(false)
    );
  };

  const toggleCall = async () => {
    if (voiceControlsManagedExternally) return;

    if (isDailyCallActive) {
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      liveAiBufferRef.current = "";
      VoiceEngine.stopSpeaking();
      VoiceEngine.stopListening();
      setIsDailyCallActive(false);
      setIsSpeakingAI(false);
      setVoiceState("idle");
      setIsConnectingCall(false);
      setIsLiveCallConnected(false);
      setLiveToolNotice(null);
      return;
    }

    setVoiceAudioEnabled(true);
    VoiceEngine.unlockAudio();
    setIsDailyCallActive(true);
    setIsConnectingCall(true);

    // Daily Call now runs on the same real-time Gemini Live session Standup uses, instead of
    // the old "get a text reply, then fetch a whole TTS clip for it" pipeline -- audio streams
    // as Sarah composes it, and barge-in is Gemini's own server-side voice activity detection
    // rather than the browser SpeechRecognition heuristic.
    const client = new GeminiLiveService(
      ventureRef.current,
      {
        onStateChange: (state: LiveSessionState) => {
          setIsConnectingCall(state === "connecting");
          setIsLiveCallConnected(state !== "connecting" && state !== "disconnected" && state !== "error");
          setIsSpeakingAI(state === "speaking");
          if (state === "thinking" || state === "using_tool") setVoiceState("thinking");
          else if (state === "listening") setVoiceState("listening");
          else if (state === "speaking") setVoiceState("speaking");
          else setVoiceState("idle");
        },
        onTranscript: (sender, text, isFinal) => {
          if (sender === "user") {
            if (isFinal) appendChatMessage("user", text);
            return;
          }
          // AI transcript streams in as incremental chunks, then a final ("", true)
          // turnComplete signal -- buffer chunks and commit the whole reply as one message,
          // matching how a normal chat reply looks in history.
          if (isFinal) {
            if (liveAiBufferRef.current.trim()) appendChatMessage("ai", liveAiBufferRef.current);
            liveAiBufferRef.current = "";
          } else if (text) {
            liveAiBufferRef.current += text;
          }
        },
        onToolExecuting: (toolName) => {
          setLiveToolNotice(`${advisor.name} is executing: ${toolName}...`);
        },
        onToolExecuted: () => {
          setLiveToolNotice(null);
        },
        onVentureUpdated: (updatedVenture) => {
          ventureRef.current = updatedVenture;
          onUpdateVenture(updatedVenture);
        },
        onError: (err) => {
          console.warn("Gemini Live notice:", err);
          liveClientRef.current?.disconnect();
          liveClientRef.current = null;
          setIsConnectingCall(false);
          setIsLiveCallConnected(false);
          setLiveToolNotice(null);
          setMicWarning("Live voice hit a snag, so this call is using the standard voice fallback instead.");
          speakFallbackGreeting();
        },
      },
      advisor,
      `Start our conversation now with the most useful thing to raise first for ${ventureRef.current.name}, given the current sprint context.`
    );

    liveClientRef.current = client;
    await client.connect();
  };

  const clearChat = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    pendingTranscriptRef.current = "";
    VoiceEngine.stopSpeaking();
    setInputVal("");
    setIsTyping(false);
    setIsSpeakingAI(false);
    setPendingTicketProposal(null);

    const updatedVenture: Venture = { ...venture, chatHistory: [] };
    VentureStore.updateVenture(updatedVenture);
    onUpdateVenture(updatedVenture);
  };

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 z-40 bg-white/95 backdrop-blur-xs border-2 border-blue-600 shadow-xl rounded-full p-2 pr-4 flex items-center gap-3 hover:scale-105 transition-all group animate-in slide-in-from-right-4"
        title="Open AI Business Analyst Co-Pilot"
      >
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md relative shrink-0">
          <Image
            src={advisor.avatar}
            alt={`${advisor.name}, AI business advisor`}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
          {isDailyCallActive && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
          )}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>AI Business Analyst</span>
            <span className="text-[9px] px-1 rounded bg-blue-100 text-blue-700 font-extrabold">Gemini</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isDailyCallActive ? "Daily Call Active" : "Online · Click to expand"}</span>
          </div>
        </div>
      </button>
    );
  }

  const panelContent = (
    <div className="relative flex flex-col justify-between h-full w-full bg-white select-none">
      {/* 1. Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-slate-900">
              {activeWorkspace === "Board" ? "Board Co-Pilot" : "AI BA Co-Pilot"}
            </h2>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700">
              Gemini
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSpeakingAI
                  ? "bg-purple-500 animate-ping"
                  : voiceState === "listening"
                  ? "bg-blue-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            <span className="truncate max-w-[110px]">
              {isSpeakingAI
                ? "Speaking aloud..."
                : voiceState === "listening"
                ? "Listening..."
                : `Online · ${venture.name}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
            title="Clear this venture's chat history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear chat</span>
          </button>

          {/* Memory Drawer button */}
          <button
            onClick={() => setShowMemoryModal(true)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors relative"
            title="View Venture Database Memory"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600" />
          </button>

          {/* Voice mute audio button */}
          <button
            onClick={() => {
              const next = !voiceAudioEnabled;
              setVoiceAudioEnabled(next);
              if (!next) VoiceEngine.stopSpeaking();
            }}
            className={`p-1 rounded-lg transition-colors ${
              voiceAudioEnabled
                ? "hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                : "bg-rose-50 text-rose-600"
            }`}
            title={voiceAudioEnabled ? "Voice Output Active (If you can't hear audio, please restart your browser)" : "Voice Output Muted"}
          >
            {voiceAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Collapse Panel Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            title="Collapse Chat Panel for more space"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeWorkspace === "Board" && (
        <div className="mx-3 mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold leading-relaxed text-blue-800">
          <div>Viewing and acting on the {venture.name} board</div>
          <div className="mt-1 font-normal text-blue-700">Every confirmed tool action updates the board beside this chat.</div>
          {focusedTicket && (
            <div className="mt-2 rounded-xl border border-blue-300 bg-white/80 px-2.5 py-2 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">Focused: {focusedTicket.title}</p>
                  {focusedTicketRecord && (
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-600">
                      {focusedTicketRecord.column.replaceAll("_", " ")} · {focusedTicketRecord.card.priority || "Medium"} · {focusedTicketRecord.card.category}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => {
                  setFocusedTicket(null);
                  setPendingTicketProposal(null);
                }} className="text-blue-500 hover:text-blue-800" aria-label="Clear focused ticket">×</button>
              </div>
              <p className="mt-1.5 text-[9px] font-normal leading-relaxed text-slate-600">
                I can read its complete description, criteria, assignments, dates, assumption link and activity before proposing changes.
              </p>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              ...(focusedTicket ? [`Review the acceptance criteria for ticket ${focusedTicket.id}. `] : []),
              "Create a ticket for ",
              "Move a ticket to ",
              "My commitment today is ",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInputVal(prompt)}
                className="rounded-md border border-blue-200 bg-white px-2 py-1 text-[9px] font-bold text-blue-700 hover:border-blue-400"
              >
                {prompt.trim()}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingTicketProposal && (
        <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-sm">
          <div className="border-b border-amber-200 bg-amber-100/70 px-3 py-2">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-700">Awaiting your confirmation</p>
            <p className="mt-0.5 truncate text-[11px] font-black text-slate-900">{pendingTicketProposal.ticketTitle}</p>
          </div>
          <div className="space-y-1.5 px-3 py-2.5">
            {(pendingTicketProposal.changes.length > 0
              ? pendingTicketProposal.changes
              : ["Apply the discussed ticket update"]
            ).map((change) => (
              <div key={change} className="flex items-start gap-1.5 text-[10px] font-semibold leading-snug text-slate-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{change}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-amber-200 bg-white/70 p-2.5">
            <button
              type="button"
              onClick={() => cancelPendingTicketProposal()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => executePendingTicketProposal()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-slate-800"
            >
              <Check className="h-3 w-3 text-emerald-400" />
              Confirm changes
            </button>
          </div>
        </div>
      )}

      {showAdvisorPicker && (
        <div className="absolute left-3 right-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
            <div>
              <p className="text-xs font-black text-slate-900">Choose BA &amp; voice for {venture.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Saved only to this project</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvisorPicker(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close advisor picker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 p-2">
            {ADVISOR_PERSONAS.map((candidate) => {
              const isSelected = candidate.id === advisor.id;
              return (
                <button
                  type="button"
                  key={candidate.id}
                  onClick={() => selectAdvisor(candidate)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Image
                    src={candidate.avatar}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-900">
                      {candidate.name}
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </span>
                    <span className="block truncate text-[10px] text-slate-500">{candidate.title}</span>
                    <span className="mt-0.5 block text-[9px] font-semibold text-blue-600">
                      Gemini {candidate.voiceName} · {candidate.voiceCharacter}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/80 p-3">
            <label htmlFor="project-ba-voice" className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-700">
              <span>Voice for {venture.name}</span>
              <span className="font-semibold text-blue-600">30 Gemini voices</span>
            </label>
            <select
              id="project-ba-voice"
              value={advisor.voiceName}
              onChange={(event) => selectVoice(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {GEMINI_VOICES.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} — {voice.character}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[9px] leading-relaxed text-slate-500">
              Applied to Gemini Live and server TTS fallback for this project only.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Voice / Daily Call Section */}
      <div className="p-3 border-b border-slate-100 bg-gradient-to-b from-blue-50/30 to-white flex flex-col items-center">
        {/* Waveform and Avatar Container */}
        <div className="flex items-center justify-center gap-2.5 w-full my-1">
          {/* Left Waveform Bars */}
          <div className="flex items-center gap-0.5">
            <span
              className={`w-0.5 bg-blue-400 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-5 animate-pulse" : "h-2"
              }`}
            />
            <span
              className={`w-0.5 bg-blue-500 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-7 animate-bounce" : "h-4"
              }`}
              style={{ animationDelay: "150ms" }}
            />
            <span
              className={`w-0.5 bg-indigo-600 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-9 animate-pulse" : "h-6"
              }`}
              style={{ animationDelay: "300ms" }}
            />
          </div>

          {/* AI Avatar Circle */}
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 shadow-md transition-all ${
                isSpeakingAI ? "ring-2 ring-purple-400/50 shadow-purple-500/30 scale-105" : "shadow-blue-500/20"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden relative border-2 border-white shadow-inner bg-slate-100">
                <Image
                  src={advisor.avatar}
                  alt={`${advisor.name}, AI business advisor`}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover object-center"
                  priority
                />
              </div>
            </div>
            {isDailyCallActive && (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                  isSpeakingAI ? "bg-purple-500 animate-ping" : "bg-emerald-500"
                }`}
              />
            )}
          </div>

          {/* Right Waveform Bars */}
          <div className="flex items-center gap-0.5">
            <span
              className={`w-0.5 bg-indigo-600 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-9 animate-pulse" : "h-6"
              }`}
              style={{ animationDelay: "400ms" }}
            />
            <span
              className={`w-0.5 bg-blue-500 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-7 animate-bounce" : "h-4"
              }`}
              style={{ animationDelay: "100ms" }}
            />
            <span
              className={`w-0.5 bg-blue-400 rounded-full transition-all duration-150 ${
                isSpeakingAI || voiceState === "listening" ? "h-5 animate-pulse" : "h-2"
              }`}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvisorPicker(true)}
          disabled={isDailyCallActive}
          className="group mt-1 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm transition-all hover:border-blue-400 hover:text-blue-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
          title={isDailyCallActive ? "End the daily call before changing BA or voice" : `Change BA or voice for ${venture.name}`}
        >
          <span>{advisor.name}</span>
          <span className="text-blue-600">Change BA / Voice</span>
          <ChevronDown className="h-3 w-3 text-slate-400 transition-transform group-hover:translate-y-0.5" />
        </button>

        {/* Call Status & Standup Schedule */}
        <div className="text-center mt-1 mb-2">
          <p className="text-[11px] font-bold text-slate-800">
            {isConnectingCall
              ? "Connecting..."
              : isSpeakingAI
              ? "🔊 AI BA Speaking..."
              : isDailyCallActive
              ? voiceState === "thinking"
                ? "Thinking..."
                : voiceState === "listening"
                ? "Listening to mic..."
                : "Daily Call Active"
              : "Daily Call Standby"}
          </p>
          {isDailyCallActive ? (
            <p className="text-[10px] font-mono text-emerald-600 font-bold mt-0.5">
              ● {formatTimer(callDuration)}
            </p>
          ) : (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-0.5 rounded-full mt-1 cursor-pointer transition-all border border-blue-200/80 shadow-2xs hover:scale-105"
              title="Click to schedule or change the daily standup time for this project"
            >
              <Clock className="w-3 h-3 text-blue-600" />
              <span>Standup: {venture.standupTime || scheduledTime || "09:00 AM"}</span>
              <span className="text-[8px] text-blue-400 font-extrabold uppercase tracking-wider ml-0.5">Set</span>
            </button>
          )}
        </div>

        {liveToolNotice && (
          <div className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-xl bg-blue-950/80 border border-blue-700 px-2.5 py-1.5 text-[10px] font-semibold text-blue-200 animate-pulse">
            <Database className="h-3 w-3 shrink-0 text-blue-400" />
            <span>{liveToolNotice}</span>
          </div>
        )}

        {micWarning && (
          <div className="mx-3 mb-2 flex items-start gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-left">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
            <p className="flex-1 text-[10px] font-semibold leading-snug text-amber-800">{micWarning}</p>
            <button
              type="button"
              onClick={() => setMicWarning(null)}
              className="shrink-0 text-amber-500 hover:text-amber-700"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Audio / Voice Call Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMic}
            disabled={voiceControlsManagedExternally}
            className={`p-2.5 rounded-full transition-all cursor-pointer ${
              micMuted
                ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                : voiceState === "listening"
                ? "bg-blue-600 text-white ring-2 ring-blue-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={voiceControlsManagedExternally ? "Use the Stand-up controls for this call" : micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* End Call / Start Call Button */}
          <button
            onClick={toggleCall}
            disabled={voiceControlsManagedExternally}
            className={`p-3 rounded-full text-white shadow-md transition-all cursor-pointer ${
              isDailyCallActive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 ring-2 ring-rose-300"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:scale-105"
            }`}
            title={voiceControlsManagedExternally ? "Use the Stand-up controls for this call" : isDailyCallActive ? "End Daily Call" : "Start Daily Call & Speak"}
          >
            {isDailyCallActive ? (
              <PhoneOff className="w-4 h-4" />
            ) : (
              <PhoneCall className="w-4 h-4" />
            )}
          </button>

          {/* Interrupt (while speaking) / Replay last message (outside a live call) button.
              Replay is hidden mid-call: it would play through the old TTS path while
              GeminiLiveService's own mic is capturing input, risking Gemini mistaking the
              replay for new user speech. */}
          {(isSpeakingAI || !isLiveCallConnected) && (
            <button
              onClick={() => {
                if (isSpeakingAI) {
                  if (liveClientRef.current?.isActive()) {
                    liveClientRef.current.interrupt();
                  } else {
                    VoiceEngine.stopSpeaking();
                  }
                  setIsSpeakingAI(false);
                  setVoiceState("listening");
                  return;
                }
                VoiceEngine.unlockAudio();
                setVoiceAudioEnabled(true);
                const lastAiMsg = [...messages].reverse().find((m) => m.sender === "ai");
                if (lastAiMsg) {
                  VoiceEngine.speak(
                    lastAiMsg.text,
                    advisor.voiceName,
                    () => setIsSpeakingAI(true),
                    () => setIsSpeakingAI(false)
                  );
                }
              }}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${
                isSpeakingAI
                  ? "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title={isSpeakingAI ? "Click to interrupt the advisor" : "Speak latest message aloud"}
            >
              {isSpeakingAI ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Morning Standup Quick Action */}
        <div className="w-full mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-center">
          <button
            onClick={async () => {
              if (!isDailyCallActive) await toggleCall();
              submitMessage(
                `Let's do our daily morning standup review for ${venture.name}. Walk me through our active cards on the board, any blocked tasks, and our #1 priority for today.`
              );
            }}
            className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors border border-blue-200/50"
          >
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Walk Through Board Cards</span>
          </button>
        </div>
      </div>

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin flex flex-col">
        {messages.map((msg, index) => {
          const isLatest = index === messages.length - 1;
          return (
            <div
              key={msg.id}
              ref={isLatest ? latestMsgRef : null}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span className="text-[9px] font-bold text-slate-400">
                  {msg.sender === "ai" ? "AI BA" : "You"}
                </span>
                {msg.sender === "ai" && (
                  <button
                    onClick={() => {
                      VoiceEngine.speak(
                        msg.text,
                        advisor.voiceName,
                        () => setIsSpeakingAI(true),
                        () => setIsSpeakingAI(false)
                      );
                    }}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                    title="Read aloud with AI voice"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs font-medium leading-relaxed shadow-2xs whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-xs"
                    : "bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/60"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs px-2 py-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[11px] font-semibold text-slate-400 ml-1">Gemini AI is analyzing...</span>
          </div>
        )}

        <div ref={chatBottomRef} className="h-1" />
      </div>

      {/* 4. Chat & Voice Input Box */}
      <div className="p-3 border-t border-slate-200/80 bg-white">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={`Talk or type to AI BA about ${venture.name}...`}
            className="w-full pl-3.5 pr-10 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            className="absolute right-1.5 p-2 rounded-full text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Database Memory Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {venture.name} Database Memory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Facts and context Gemini references during calls and analyses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMemoryModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px]">
                        {m.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{m.source}</span>
                    </div>
                    <p className="text-slate-800 font-medium leading-relaxed">{m.fact}</p>
                  </div>
                  <button
                    onClick={() => {
                      MemoryService.deleteMemory(venture.id, m.id);
                      setMemories((prev) => prev.filter((item) => item.id !== m.id));
                    }}
                    className="text-slate-300 hover:text-rose-600 text-xs font-bold"
                    title="Remove Memory Fact"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {memories.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No memory facts stored yet. Start talking to your AI BA to auto-record context!
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowMemoryModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Daily Standup Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Daily Standup Schedule
                  </h3>
                  <p className="text-xs text-slate-500">
                    Project: <span className="font-bold text-slate-700">{venture.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Set when you want your AI Business Analyst to conduct your daily check-in, review active Kanban cards, and align on today&apos;s sprint goal.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Choose Standup Time
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "08:00 AM",
                    "08:30 AM",
                    "09:00 AM",
                    "09:30 AM",
                    "10:00 AM",
                    "11:00 AM",
                    "02:00 PM",
                    "05:00 PM",
                    "06:00 PM",
                  ].map((timeOption) => (
                    <button
                      key={timeOption}
                      type="button"
                      onClick={() => setScheduledTime(timeOption)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                        scheduledTime === timeOption
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                      }`}
                    >
                      {timeOption}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                  Or Custom Time
                </label>
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="e.g. 09:15 AM"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedVenture = {
                    ...venture,
                    standupTime: scheduledTime.trim() || "09:00 AM",
                  };
                  VentureStore.updateVenture(updatedVenture);
                  onUpdateVenture(updatedVenture);
                  setShowScheduleModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Panel */}
      <aside className={`hidden lg:flex bg-white border-l flex-col justify-between h-screen sticky top-0 z-30 select-none shrink-0 shadow-xs transition-all duration-200 ${
        activeWorkspace === "Board" ? "w-96 border-blue-200" : "w-72 lg:w-80 border-slate-200/90"
      }`}>
        {panelContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={onMobileClose}
          />
          {/* Drawer Body */}
          <aside className="relative w-80 max-w-[90vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {panelContent}
          </aside>
        </div>
      )}

      {/* Mobile Floating Action Trigger */}
      {!isMobileOpen && onMobileOpen && (
        <div className="fixed bottom-5 right-5 z-40 lg:hidden">
          <button
            onClick={onMobileOpen}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl shadow-blue-500/40 border border-blue-400/40 active:scale-95 transition-all cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <PhoneCall className="w-3.5 h-3.5" />
            <span>AI BA Co-Pilot</span>
          </button>
        </div>
      )}
    </>
  );
}
