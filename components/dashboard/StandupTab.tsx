"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Flame,
  Calendar,
  Layers,
  Check,
  Plus,
  Play,
  RotateCcw
} from "lucide-react";
import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";
import { VoiceSphereVisualizer, SARAH_PERSONAS, BusinessPersona, AgentAudioState } from "@/components/dashboard/VoiceSphereVisualizer";
import { VoiceEngine, VoiceState } from "@/lib/voice/voiceEngine";
import { StandupPrepEngine } from "@/lib/agent/standupPrepEngine";
import { BAAgentService } from "@/lib/agent/baAgentService";
import { MemoryService } from "@/lib/db/memoryService";

export interface StandupTabProps {
  venture: Venture;
  onUpdateVenture: (venture: Venture) => void;
  isDailyCallActive: boolean;
  setIsDailyCallActive: (active: boolean) => void;
  setActiveTab: (tab: string) => void;
}

export function StandupTab({
  venture,
  onUpdateVenture,
  isDailyCallActive,
  setIsDailyCallActive,
  setActiveTab,
}: StandupTabProps) {
  const [selectedPersona, setSelectedPersona] = useState<BusinessPersona>(SARAH_PERSONAS[0]);
  const [audioState, setAudioState] = useState<AgentAudioState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptRef = useRef<string>("");

  const getColItems = (col: any): KanbanCard[] => {
    if (!col) return [];
    if (Array.isArray(col)) return col;
    if (Array.isArray(col.items)) return col.items;
    return [];
  };

  const doneCards = getColItems(venture?.columns?.done);
  const inProgressCards = getColItems(venture?.columns?.in_progress);
  const todayCards = getColItems(venture?.columns?.today);
  const blockedCards = getColItems(venture?.columns?.blocked);
  const backlogCards = getColItems(venture?.columns?.backlog);
  const totalActive = inProgressCards.length + todayCards.length;

  // Initialize Speech Recognition for Live Standup
  useEffect(() => {
    VoiceEngine.preloadVoices();
    VoiceEngine.initRecognition(
      (transcript, isFinal) => {
        if (!transcript.trim()) return;

        setInterimTranscript(transcript);
        pendingTranscriptRef.current = transcript.trim();

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        const delay = isFinal ? 600 : 1300;
        silenceTimerRef.current = setTimeout(() => {
          if (pendingTranscriptRef.current.trim().length > 0) {
            const textToSubmit = pendingTranscriptRef.current.trim();
            pendingTranscriptRef.current = "";
            setInterimTranscript("");

            // Filter echo loops
            const lower = textToSubmit.toLowerCase();
            if (lower === "got it" || lower === "got it." || lower === "i" || lower === "the") {
              return;
            }

            handleUserSpokenInput(textToSubmit);
          }
        }, delay);
      },
      (state) => {
        setAudioState(state);
      },
      (err) => {
        console.warn("Standup voice engine notice:", err);
      },
      () => {
        // Interrupted callback
        setAudioState("listening");
      }
    );

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [venture]);

  // Submit spoken text to Gemini BA Reasoning Engine
  const handleUserSpokenInput = async (spokenText: string) => {
    setAudioState("thinking");

    try {
      const activeMemories = MemoryService.getMemories(venture.id);

      const res = await fetch("/api/ai-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: spokenText,
          venture: {
            id: venture.id,
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
          history: (venture.chatHistory || []).slice(-6),
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || `I'm tracking your sprint progress. Let's focus on our primary goal.`;

      // Execute any autonomous tools via BAAgentService
      let currentVenture: Venture = { ...venture };
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        for (const action of data.actions) {
          const toolRes = BAAgentService.executeTool(action.type, action, currentVenture, "daily_standup");
          if (toolRes.updatedVenture) {
            currentVenture = toolRes.updatedVenture;
          }
        }
      }

      onUpdateVenture(currentVenture);
      VentureStore.updateVenture(currentVenture);

      // Speak response aloud with Google's Kore Neural Voice
      VoiceEngine.speak(
        aiReply,
        selectedPersona.voiceName.includes("Kore") ? "Kore" : "Aoede",
        () => setAudioState("speaking"),
        () => {
          if (isDailyCallActive) {
            setAudioState("listening");
            VoiceEngine.startListening();
          } else {
            setAudioState("idle");
          }
        }
      );
    } catch (err) {
      console.error("Standup voice processing error:", err);
      setAudioState(isDailyCallActive ? "listening" : "idle");
    }
  };

  const handleStartCall = () => {
    const nextCall = !isDailyCallActive;
    setIsDailyCallActive(nextCall);

    if (nextCall) {
      VoiceEngine.unlockAudio();
      const agenda = StandupPrepEngine.prepareAgenda(venture);
      setAudioState("speaking");

      VoiceEngine.speak(
        agenda.greeting,
        "Kore",
        () => setAudioState("speaking"),
        () => {
          setAudioState("listening");
          VoiceEngine.startListening();
        }
      );
    } else {
      VoiceEngine.stopSpeaking();
      VoiceEngine.stopListening();
      setAudioState("idle");
      setInterimTranscript("");
    }
  };

  const handleInterrupt = () => {
    VoiceEngine.stopSpeaking();
    setAudioState("listening");
    VoiceEngine.startListening();
  };

  const handleTestVoice = () => {
    VoiceEngine.unlockAudio();
    setAudioState("speaking");
    VoiceEngine.speak(
      `Hello! I'm Sarah Jenkins, your Lead AI Business Analyst. I'm connected with Google's neural voice engine and ready for our daily standup.`,
      "Kore",
      () => setAudioState("speaking"),
      () => setAudioState("idle")
    );
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      VoiceEngine.stopListening();
    } else {
      VoiceEngine.startListening();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Interactive Voice Sphere Visualizer & Strict Persona Workspace */}
      <VoiceSphereVisualizer
        persona={selectedPersona}
        onSelectPersona={setSelectedPersona}
        state={audioState}
        isCallActive={isDailyCallActive}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onInterrupt={handleInterrupt}
        onStartCall={handleStartCall}
        onTestVoice={handleTestVoice}
        audioAnalyser={VoiceEngine.getAudioAnalyser()}
        interimTranscript={interimTranscript}
      />

      {/* 2. Stand-up Structure Cards (3 Pillars of the Daily Standup) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: What was completed yesterday */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>1. Completed (Done)</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {doneCards.length}
              </span>
            </div>
            {doneCards.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No tickets moved to Done yet.
              </p>
            ) : (
              <div className="space-y-2">
                {doneCards.slice(0, 4).map((card) => (
                  <div
                    key={card.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700 flex items-center justify-between"
                  >
                    <span className="truncate pr-2 line-through text-slate-400">{card.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      Done
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setActiveTab("Board")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-2"
          >
            <span>View Board</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Pillar 2: Today's Focus & Commitments */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>2. Today&apos;s Focus</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {totalActive}
              </span>
            </div>
            {todayCards.length === 0 && inProgressCards.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nothing queued for today. Tell Sarah during standup to assign today&apos;s tasks.
              </p>
            ) : (
              <div className="space-y-2">
                {[...todayCards, ...inProgressCards].slice(0, 4).map((card) => (
                  <div
                    key={card.id}
                    className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs font-medium text-slate-800 flex items-center justify-between"
                  >
                    <span className="truncate pr-2 font-semibold">{card.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 shrink-0">
                      {card.category || "Feature"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setActiveTab("Board")}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer pt-2"
          >
            <span>Manage Today Queue</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Pillar 3: Active Blockers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>3. Blockers</span>
              </div>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                blockedCards.length > 0
                  ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {blockedCards.length}
              </span>
            </div>
            {blockedCards.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <p className="text-xs text-emerald-600 font-bold">Zero active blockers!</p>
                <p className="text-[11px] text-slate-400">All sprint work is flowing smoothly.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900 flex items-center justify-between"
                  >
                    <span className="truncate pr-2 font-bold">{card.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 shrink-0">
                      Blocked
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setActiveTab("Board")}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer pt-2"
          >
            <span>Resolve on Board</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. Sarah's Stand-up Intelligence & Guidelines */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Sarah Jenkins &bull; Stand-up Guidelines ({selectedPersona.style})
            </h3>
            <p className="text-xs text-slate-500">
              {selectedPersona.description}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed space-y-2">
          <p>
            • <strong>Velocity:</strong> {doneCards.length} tickets completed this sprint out of {doneCards.length + totalActive + backlogCards.length} total backlog items.
          </p>
          <p>
            • <strong>Immediate Priority:</strong> Focus on testing the core assumption: <em>&quot;{venture.problemStatement || "Primary customer discovery"}&quot;</em>.
          </p>
          <p>
            • <strong>Live Voice Tip:</strong> Click &quot;Connect Live Voice Standup&quot; above, speak naturally, and if you need to cut in, simply start talking or click <em>&quot;Interrupt Sarah&quot;</em>.
          </p>
        </div>
      </div>
    </div>
  );
}
