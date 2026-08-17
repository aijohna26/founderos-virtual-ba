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
  Radio
} from "lucide-react";
import { Venture, VentureStore, ChatMessage, KanbanCard } from "@/lib/store/ventureStore";
import { VoiceEngine, VoiceState } from "@/lib/voice/voiceEngine";
import { GeminiLiveClient } from "@/lib/voice/geminiLiveClient";
import { MemoryService, MemoryFact } from "@/lib/db/memoryService";
import { BAAgentService } from "@/lib/agent/baAgentService";

export interface AiAnalystPanelProps {
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onMobileOpen?: () => void;
}

export function AiAnalystPanel({
  isDailyCallActive,
  setIsDailyCallActive,
  venture,
  onUpdateVenture,
  isMobileOpen = false,
  onMobileClose,
  onMobileOpen,
}: AiAnalystPanelProps) {
  const [micMuted, setMicMuted] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeakingAI, setIsSpeakingAI] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(venture?.standupTime || "09:00 AM");
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);

  const messages = venture?.chatHistory || [
    {
      id: "1",
      sender: "ai",
      text: `Good morning! I'm your AI Business Analyst for ${venture.name}. What critical hypothesis are we testing today?`,
      timestamp: "09:00 AM",
    },
  ];

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
      const loadedMemories = MemoryService.getMemories(venture.id);
      setMemories(loadedMemories);
    }
  }, [venture?.id]);

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
          if (pendingTranscriptRef.current.trim().length > 0 && !isTyping) {
            const textToSubmit = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = "";

            // 🛑 Block self-echo loop fragments
            const lower = textToSubmit.toLowerCase();
            if (lower === "got it" || lower === "got it." || lower === "got it looking" || lower === "i" || lower === "the") {
              return;
            }

            submitMessage(textToSubmit);
          }
        }, delay);
      },
      (state) => {
        setVoiceState(state);
      },
      (err) => {
        console.warn("Voice Engine:", err);
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
  }, [venture]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Manage mic listening during Daily Call
  useEffect(() => {
    if (isDailyCallActive && !micMuted) {
      VoiceEngine.startListening();
    } else {
      VoiceEngine.stopListening();
    }
  }, [isDailyCallActive, micMuted]);

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

  const submitMessage = async (userText: string) => {
    if (!userText.trim() || isTyping) return;
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

    try {
      const activeMemories = MemoryService.getMemories(venture.id);

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
          },
          memories: activeMemories,
          history: updatedHistory.slice(-6),
        }),
      });

      const data = await res.json();
      const aiReplyText =
        data.reply ||
        `I've analyzed your input for ${venture.name}. Let's prioritize validating your core hypothesis.`;

      let currentVenture: Venture = { ...venture };

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const action of data.actions) {
          const toolName = action.type;
          const execRes = BAAgentService.executeTool(toolName, action, currentVenture, "daily_standup");
          if (execRes.updatedVenture) {
            currentVenture = execRes.updatedVenture;
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalVenture: Venture = {
        ...currentVenture,
        chatHistory: [...updatedHistory, aiMsg],
      };

      VentureStore.updateVenture(finalVenture);
      onUpdateVenture(finalVenture);

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
          aiReplyText,
          () => setIsSpeakingAI(true),
          () => setIsSpeakingAI(false)
        );
      }
    } catch (err) {
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
      setIsTyping(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage(inputVal);
  };

  const toggleMic = () => {
    const nextMuted = !micMuted;
    setMicMuted(nextMuted);
    if (nextMuted) {
      VoiceEngine.stopListening();
      setVoiceState("idle");
    } else {
      if (isDailyCallActive) {
        VoiceEngine.startListening();
      }
    }
  };

  const handleLiveToolCall = (name: string, args: Record<string, any>) => {
    let currentColumns = { ...venture.columns };
    if (name === "create_card" && args.title) {
      const colKey = (args.column || "today") as keyof Venture["columns"];
      const newCard: KanbanCard = {
        id: "c-live-" + Date.now(),
        title: args.title,
        category: args.category || "Feature",
        priority: args.priority || "High",
        owner: "YOU",
      };
      const existing = currentColumns[colKey]?.items || [];
      currentColumns = {
        ...currentColumns,
        [colKey]: { ...currentColumns[colKey], items: [...existing, newCard] },
      };
      const updated = { ...venture, columns: currentColumns };
      VentureStore.updateVenture(updated);
      onUpdateVenture(updated);
    } else if (name === "move_card" && args.cardTitle && args.toColumn) {
      const toCol = args.toColumn as keyof Venture["columns"];
      let foundCard: KanbanCard | null = null;
      let fromCol: keyof Venture["columns"] | null = null;
      for (const colName of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
        const match = currentColumns[colName]?.items?.find((c) =>
          c.title.toLowerCase().includes(args.cardTitle.toLowerCase().slice(0, 10))
        );
        if (match) {
          foundCard = match;
          fromCol = colName;
          break;
        }
      }
      if (foundCard && fromCol && fromCol !== toCol) {
        const updatedFrom = (currentColumns[fromCol]?.items || []).filter((c) => c.id !== foundCard!.id);
        const updatedTo = [...(currentColumns[toCol]?.items || []), { ...foundCard, completed: toCol === "done" }];
        currentColumns = {
          ...currentColumns,
          [fromCol]: { ...currentColumns[fromCol], items: updatedFrom },
          [toCol]: { ...currentColumns[toCol], items: updatedTo },
        };
        const updated = { ...venture, columns: currentColumns };
        VentureStore.updateVenture(updated);
        onUpdateVenture(updated);
      }
    }
  };

  const toggleCall = () => {
    const nextCall = !isDailyCallActive;
    setIsDailyCallActive(nextCall);

    if (!nextCall) {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      VoiceEngine.stopSpeaking();
      VoiceEngine.stopListening();
      setIsSpeakingAI(false);
      setVoiceState("idle");
    } else {
      // Unlock audio and ensure voice is active
      setVoiceAudioEnabled(true);
      VoiceEngine.unlockAudio();

      const lastAiMsg = [...messages].reverse().find((m) => m.sender === "ai");
      const greeting =
        lastAiMsg?.text ||
        `Good day Founder! I'm your AI Business Analyst. I've loaded your venture context for ${venture.name}. What's the biggest uncertainty we should stress-test today?`;

      VoiceEngine.speak(
        greeting,
        () => setIsSpeakingAI(true),
        () => setIsSpeakingAI(false)
      );
    }
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
            src="/avatar-ai-ba.jpg"
            alt="AI BA"
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
    <div className="flex flex-col justify-between h-full w-full bg-white select-none">
      {/* 1. Header */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-bold text-slate-900">AI BA Co-Pilot</h2>
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
                  src="/avatar-ai-ba.jpg"
                  alt="AI Business Analyst"
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

        {/* Call Status & Standup Schedule */}
        <div className="text-center mt-1 mb-2">
          <p className="text-[11px] font-bold text-slate-800">
            {isSpeakingAI
              ? "🔊 AI BA Speaking..."
              : isDailyCallActive
              ? voiceState === "listening"
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

        {/* Audio / Voice Call Control Buttons */}
        <div className="flex items-center justify-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={toggleMic}
            className={`p-2.5 rounded-full transition-all cursor-pointer ${
              micMuted
                ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                : voiceState === "listening"
                ? "bg-blue-600 text-white ring-2 ring-blue-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* End Call / Start Call Button */}
          <button
            onClick={toggleCall}
            className={`p-3 rounded-full text-white shadow-md transition-all cursor-pointer ${
              isDailyCallActive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30 ring-2 ring-rose-300"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:scale-105"
            }`}
            title={isDailyCallActive ? "End Daily Call" : "Start Daily Call & Speak"}
          >
            {isDailyCallActive ? (
              <PhoneOff className="w-4 h-4" />
            ) : (
              <PhoneCall className="w-4 h-4" />
            )}
          </button>

          {/* Direct Speak / Play Voice / Interrupt button */}
          <button
            onClick={() => {
              if (isSpeakingAI) {
                VoiceEngine.stopSpeaking();
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
            title={isSpeakingAI ? "Click to interrupt Sarah" : "Speak latest message aloud"}
          >
            {isSpeakingAI ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Morning Standup Quick Action */}
        <div className="w-full mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-center">
          <button
            onClick={() => {
              if (!isDailyCallActive) setIsDailyCallActive(true);
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
      <aside className="hidden lg:flex w-72 lg:w-80 bg-white border-l border-slate-200/90 flex-col justify-between h-screen sticky top-0 z-30 select-none shrink-0 shadow-xs transition-all duration-200">
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
