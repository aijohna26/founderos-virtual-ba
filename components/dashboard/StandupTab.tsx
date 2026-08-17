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
  RotateCcw,
  Activity
} from "lucide-react";
import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";
import { VoiceSphereVisualizer, SARAH_PERSONAS, BusinessPersona, AgentAudioState } from "@/components/dashboard/VoiceSphereVisualizer";
import { GeminiLiveService, LiveSessionState } from "@/lib/agent/geminiLiveService";
import { StandupPrepEngine } from "@/lib/agent/standupPrepEngine";
import { CommitmentStore } from "@/lib/store/commitmentStore";
import { VoiceEngine } from "@/lib/voice/voiceEngine";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";

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
  const [sessionState, setSessionState] = useState<LiveSessionState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [activeToolNotice, setActiveToolNotice] = useState<string | null>(null);

  const liveClientRef = useRef<GeminiLiveService | null>(null);

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

  const commitments = CommitmentStore.getOutstandingCommitments(venture.id);
  const learnings = CommitmentStore.getLearnings(venture.id);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, []);

  const handleStartCall = async () => {
    if (isDailyCallActive) {
      // Disconnect
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      VoiceEngine.stopSpeaking();
      VoiceEngine.stopListening();
      setIsDailyCallActive(false);
      setSessionState("idle");
      setInterimTranscript("");
      setActiveToolNotice(null);
      return;
    }

    setIsDailyCallActive(true);
    setSessionState("connecting");

    // Initialize Gemini Live Service
    const client = new GeminiLiveService(
      venture,
      {
        onStateChange: (st) => {
          setSessionState(st);
        },
        onTranscript: (sender, text, isFinal) => {
          if (sender === "user") {
            setInterimTranscript(text);
          } else if (sender === "ai" && text) {
            setInterimTranscript("");
          }
        },
        onToolExecuting: (toolName, args) => {
          setActiveToolNotice(`Sarah is executing: ${toolName}...`);
        },
        onToolExecuted: (toolName, res) => {
          setActiveToolNotice(null);
        },
        onVentureUpdated: (updatedV) => {
          onUpdateVenture(updatedV);
        },
        onError: (err) => {
          console.warn("Gemini Live notice:", err);
          // Fallback to HTTP contextual engine if live connection dropped
          handleFallbackGreeting();
        },
      },
      selectedPersona.voiceName.includes("Kore") ? "Kore" : "Aoede"
    );

    liveClientRef.current = client;
    const connected = await client.connect();

    if (!connected) {
      handleFallbackGreeting();
    }
  };

  const handleFallbackGreeting = () => {
    VoiceEngine.unlockAudio();
    const agenda = StandupPrepEngine.prepareAgenda(venture);
    setSessionState("speaking");

    VoiceEngine.speak(
      agenda.greeting,
      "Kore",
      () => setSessionState("speaking"),
      () => {
        setSessionState("listening");
        VoiceEngine.startListening();
      }
    );
  };

  const handleInterrupt = () => {
    if (liveClientRef.current) {
      liveClientRef.current.interrupt();
    }
    VoiceEngine.stopSpeaking();
    setSessionState("listening");
  };

  const handleTestVoice = () => {
    VoiceEngine.unlockAudio();
    setSessionState("speaking");
    VoiceEngine.speak(
      `Hello! I'm Sarah Jenkins, your Lead AI Business Analyst powered by Google Gemini Live. I'm connected and ready for our daily standup.`,
      "Kore",
      () => setSessionState("speaking"),
      () => setSessionState("idle")
    );
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (liveClientRef.current) {
      liveClientRef.current.setMuted(nextMute);
    }
  };

  const visualizerAudioState: AgentAudioState =
    sessionState === "speaking"
      ? "speaking"
      : sessionState === "thinking" || sessionState === "using_tool"
      ? "thinking"
      : sessionState === "listening" || sessionState === "connecting"
      ? "listening"
      : "idle";

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Interactive Voice Sphere Visualizer & Strict Persona Workspace */}
      <VoiceSphereVisualizer
        persona={selectedPersona}
        onSelectPersona={setSelectedPersona}
        state={visualizerAudioState}
        isCallActive={isDailyCallActive}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onInterrupt={handleInterrupt}
        onStartCall={handleStartCall}
        onTestVoice={handleTestVoice}
        audioAnalyser={liveClientRef.current?.getAudioAnalyser() || VoiceEngine.getAudioAnalyser()}
        interimTranscript={interimTranscript}
      />

      {/* Active Tool Execution Pill */}
      {activeToolNotice && (
        <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-950/80 border border-blue-700 text-xs font-semibold text-blue-200 animate-pulse shadow-lg">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>{activeToolNotice}</span>
        </div>
      )}

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

      {/* 3. Commitments & Learnings Accountability Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Outstanding Commitments */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Commitments ({commitments.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Sprint Accountability
            </span>
          </div>
          {commitments.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No outstanding commitments. Make a commitment to Sarah during standup!
            </p>
          ) : (
            <div className="space-y-2">
              {commitments.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-800 truncate pr-2">&ldquo;{c.commitment}&rdquo;</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                    {c.deadline || "Today"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Durable Learnings & Behavioral Adaptation */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Observed Learnings & Adaptation ({learnings.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
              Adaptive Memory
            </span>
          </div>
          {learnings.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Sarah is observing sprint delivery patterns to personalize future coaching.
            </p>
          ) : (
            <div className="space-y-2">
              {learnings.slice(0, 2).map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs space-y-1"
                >
                  <div className="font-semibold text-purple-900">{l.pattern}</div>
                  <div className="text-[10px] text-purple-600 font-normal">Coach: {l.suggestedCoachingBehavior}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
