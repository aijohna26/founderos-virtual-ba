"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Video,
  VideoOff,
  Settings,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Brain,
  Database,
  X
} from "lucide-react";
import { Venture, VentureStore, ChatMessage, KanbanCard } from "@/lib/store/ventureStore";
import { VoiceEngine, VoiceState } from "@/lib/voice/voiceEngine";
import { MemoryService, MemoryFact } from "@/lib/db/memoryService";

export interface AiAnalystPanelProps {
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
}

export function AiAnalystPanel({
  isDailyCallActive,
  setIsDailyCallActive,
  venture,
  onUpdateVenture,
}: AiAnalystPanelProps) {
  const [micMuted, setMicMuted] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(1477); // 24:37 in seconds
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeakingAI, setIsSpeakingAI] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const messages = venture?.chatHistory || [
    {
      id: "1",
      sender: "ai",
      text: `Good morning! I'm your AI Business Analyst for ${venture.name}. What critical hypothesis are we testing today?`,
      timestamp: "09:00 AM",
    },
  ];

  // Load long-term memory for active venture
  useEffect(() => {
    if (venture?.id) {
      const loadedMemories = MemoryService.getMemories(venture.id);
      setMemories(loadedMemories);
    }
  }, [venture?.id]);

  // Initialize Speech Recognition & Voice Engine
  useEffect(() => {
    VoiceEngine.initRecognition(
      (transcript, isFinal) => {
        if (isFinal && transcript.trim().length > 0) {
          submitMessage(transcript.trim());
        } else {
          setInputVal(transcript);
        }
      },
      (state) => {
        setVoiceState(state);
      },
      (err) => {
        console.warn("Voice Engine:", err);
      }
    );

    return () => {
      VoiceEngine.stopListening();
      VoiceEngine.stopSpeaking();
    };
  }, [venture]);

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

      // Apply any autonomous board actions returned by Gemini
      let currentColumns = { ...venture.columns };
      let currentPriorities = [...(venture.priorities || [])];
      let currentAssumptions = [...(venture.assumptions || [])];

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const action of data.actions) {
          if (action.type === "create_card" && action.title) {
            const colKey = (action.column || "today") as keyof Venture["columns"];
            const newCard: KanbanCard = {
              id: "c-ai-" + Date.now() + Math.random().toString(36).substr(2, 4),
              title: action.title,
              category: action.category || "Feature",
              priority: action.priority || "High",
              owner: "YOU",
            };
            const existingItems = currentColumns[colKey]?.items || [];
            currentColumns = {
              ...currentColumns,
              [colKey]: {
                ...currentColumns[colKey],
                items: [...existingItems, newCard],
              },
            };
          } else if (action.type === "move_card" && action.cardTitle && action.toColumn) {
            const toCol = action.toColumn as keyof Venture["columns"];
            let foundCard: KanbanCard | null = null;
            let fromCol: keyof Venture["columns"] | null = null;

            for (const colName of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
              const match = currentColumns[colName]?.items?.find((c) =>
                c.title.toLowerCase().includes(action.cardTitle.toLowerCase().slice(0, 10))
              );
              if (match) {
                foundCard = match;
                fromCol = colName;
                break;
              }
            }

            if (foundCard && fromCol && fromCol !== toCol) {
              const updatedFrom = (currentColumns[fromCol]?.items || []).filter(
                (c) => c.id !== foundCard!.id
              );
              const updatedTo = [
                ...(currentColumns[toCol]?.items || []),
                { ...foundCard, completed: toCol === "done" },
              ];

              currentColumns = {
                ...currentColumns,
                [fromCol]: { ...currentColumns[fromCol], items: updatedFrom },
                [toCol]: { ...currentColumns[toCol], items: updatedTo },
              };
            }
          } else if (action.type === "add_priority" && action.title) {
            const newPrio = {
              id: "pr-" + Date.now(),
              num: currentPriorities.length + 1,
              title: action.title,
              tag: action.tag || "Experiment",
              tagColor: "bg-blue-50 text-blue-700 border-blue-200",
              owner: "YOU",
              priority: action.priority || "High",
              priorityColor: "text-rose-600 font-bold",
            };
            currentPriorities = [...currentPriorities, newPrio];
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const finalVenture = {
        ...venture,
        columns: currentColumns,
        priorities: currentPriorities,
        assumptions: currentAssumptions,
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
    } else {
      VoiceEngine.startListening();
    }
  };

  const toggleCall = () => {
    const nextCall = !isDailyCallActive;
    setIsDailyCallActive(nextCall);
    if (!nextCall) {
      VoiceEngine.stopSpeaking();
      VoiceEngine.stopListening();
      setIsSpeakingAI(false);
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

  return (
    <aside className="w-64 bg-white border-l border-slate-200/90 flex flex-col justify-between h-screen sticky top-0 z-30 select-none shrink-0 shadow-xs transition-all duration-200">
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
            title={voiceAudioEnabled ? "Voice Output Active" : "Voice Output Muted"}
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

        {/* Call Status & Timer */}
        <div className="text-center mt-1 mb-2">
          <p className="text-[11px] font-bold text-slate-800">
            {isDailyCallActive
              ? isSpeakingAI
                ? "AI BA speaking..."
                : voiceState === "listening"
                ? "Listening to mic..."
                : "Daily Call Active"
              : "Daily Call Standby"}
          </p>
          <p className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5">
            {formatTimer(callDuration)}
          </p>
        </div>

        {/* Audio / Video / Call Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all ${
              micMuted
                ? "bg-rose-100 text-rose-600 hover:bg-rose-200"
                : voiceState === "listening"
                ? "bg-blue-600 text-white ring-2 ring-blue-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {micMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* End Call / Start Call Button */}
          <button
            onClick={toggleCall}
            className={`p-2.5 rounded-full text-white shadow-md transition-all ${
              isDailyCallActive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
            }`}
            title={isDailyCallActive ? "End Daily Call" : "Start Daily Call"}
          >
            {isDailyCallActive ? (
              <PhoneOff className="w-3.5 h-3.5" />
            ) : (
              <PhoneCall className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Video toggle */}
          <button
            onClick={() => setVideoActive(!videoActive)}
            className={`p-2 rounded-full transition-all ${
              videoActive
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {videoActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
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

      {/* 3. Messages Stream & Daily Summary */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
              {msg.sender === "ai" ? "AI BA" : "You"}
            </span>
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed shadow-2xs whitespace-pre-wrap ${
                msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-xs"
                  : "bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/60"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs px-2 py-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="text-[11px] font-semibold text-slate-400 ml-1">Gemini AI is analyzing...</span>
          </div>
        )}

        {/* Database Memory Quick Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Venture Memory</span>
            </div>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-200/60 px-2 py-0.5 rounded-md">
              {memories.length} facts stored
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {(() => {
                  const doneCol = venture?.columns?.done;
                  if (!doneCol) return 0;
                  if (Array.isArray(doneCol)) return doneCol.length;
                  if (Array.isArray(doneCol.items)) return doneCol.items.length;
                  return 0;
                })()}{" "}
                tasks completed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {Array.isArray(venture?.assumptions)
                  ? venture.assumptions.filter((a) => a.status === "Untested").length
                  : 0}{" "}
                untested hypotheses
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Stage: {venture?.stage || "Discovery & Validation"}</span>
            </div>
          </div>
        </div>

        <div ref={chatBottomRef} />
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
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
