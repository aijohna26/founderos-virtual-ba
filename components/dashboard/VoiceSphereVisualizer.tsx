"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, Sparkles, Volume2, Radio, Volume1, ShieldCheck, UserCheck, Settings2 } from "lucide-react";

export type AgentAudioState = "idle" | "listening" | "thinking" | "speaking" | "paused";

export interface BusinessPersona {
  id: string;
  name: string;
  title: string;
  organization: string;
  voiceName: string;
  domain: string;
  avatar: string;
  style: "Strict & Analytical" | "Strategic Co-Founder" | "Technical Architect";
  description: string;
}

export const SARAH_PERSONAS: BusinessPersona[] = [
  {
    id: "sarah-strict",
    name: "Sarah Jenkins",
    title: "Senior Lead AI Business Analyst",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Aoede (Google HD Neural)",
    domain: "Agile BA & Sprint Auditor",
    avatar: "/avatar-ai-ba.jpg",
    style: "Strict & Analytical",
    description: "Laser-focused on de-risking hypotheses, holding sprint commitments, and eliminating fluff.",
  },
  {
    id: "sarah-cofounder",
    name: "Sarah Jenkins",
    title: "Venture Partner & Strategy BA",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Kore (Google HD Studio)",
    domain: "Strategic Venture Building",
    avatar: "/avatar-ai-ba.jpg",
    style: "Strategic Co-Founder",
    description: "Supportive, inquisitive, and challenges assumptions to accelerate product-market fit.",
  },
  {
    id: "sarah-tech",
    name: "Sarah Jenkins",
    title: "Technical Requirements Architect",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Journey-F (Neural HD)",
    domain: "PRDs & Feature Scoping",
    avatar: "/avatar-ai-ba.jpg",
    style: "Technical Architect",
    description: "Deep dive on technical feasibility, ticket specifications, and acceptance criteria.",
  },
];

interface VoiceSphereVisualizerProps {
  persona?: BusinessPersona;
  onSelectPersona?: (persona: BusinessPersona) => void;
  state: AgentAudioState;
  isCallActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onStartCall: () => void;
  onTestVoice: () => void;
  audioAnalyser?: AnalyserNode | null;
  interimTranscript?: string;
}

export const VoiceSphereVisualizer: React.FC<VoiceSphereVisualizerProps> = ({
  persona = SARAH_PERSONAS[0],
  onSelectPersona,
  state,
  isCallActive,
  isMuted,
  onToggleMute,
  onInterrupt,
  onStartCall,
  onTestVoice,
  audioAnalyser,
  interimTranscript,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // Audio frequency waveform rendering with active AnalyserNode
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const bufferLength = audioAnalyser ? audioAnalyser.frequencyBinCount : 32;
      const dataArray = new Uint8Array(bufferLength);

      if (audioAnalyser && state === "speaking") {
        audioAnalyser.getByteFrequencyData(dataArray);
      } else {
        // Simulated organic rhythm when speaking/listening/thinking
        for (let i = 0; i < bufferLength; i++) {
          if (state === "speaking") {
            dataArray[i] = Math.sin(Date.now() / 90 + i * 0.5) * 45 + 55;
          } else if (state === "listening" && !isMuted) {
            dataArray[i] = Math.sin(Date.now() / 180 + i) * 20 + 25;
          } else if (state === "thinking") {
            dataArray[i] = Math.sin(Date.now() / 110 + i * 0.4) * 35 + 40;
          } else {
            dataArray[i] = 10;
          }
        }
      }

      const barWidth = (width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(3, (dataArray[i] / 255) * height * 0.85);

        // Dynamic State Gradients
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        if (state === "speaking") {
          gradient.addColorStop(0, "#06b6d4"); // cyan-500
          gradient.addColorStop(1, "#8b5cf6"); // violet-500
        } else if (state === "listening") {
          gradient.addColorStop(0, "#10b981"); // emerald-500
          gradient.addColorStop(1, "#06b6d4"); // cyan-500
        } else if (state === "thinking") {
          gradient.addColorStop(0, "#f59e0b"); // amber-500
          gradient.addColorStop(1, "#ec4899"); // pink-500
        } else {
          gradient.addColorStop(0, "#475569"); // slate-600
          gradient.addColorStop(1, "#334155"); // slate-700
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (height - barHeight) / 2, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioAnalyser, state, isMuted]);

  const getStateBadge = () => {
    switch (state) {
      case "listening":
        return {
          text: isMuted ? "Microphone Muted" : "Listening to you...",
          bg: "bg-emerald-950/80 border-emerald-700/60 text-emerald-300",
          icon: <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />,
        };
      case "thinking":
        return {
          text: "Analyzing strategic context...",
          bg: "bg-amber-950/80 border-amber-700/60 text-amber-300",
          icon: <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />,
        };
      case "speaking":
        return {
          text: `${persona.name} is speaking`,
          bg: "bg-cyan-950/80 border-cyan-700/60 text-cyan-300",
          icon: <Volume2 className="w-3.5 h-3.5 animate-bounce text-cyan-400" />,
        };
      case "idle":
      default:
        return {
          text: isCallActive ? "Stand-up in Progress" : "Session Paused",
          bg: "bg-slate-800/80 border-slate-700 text-slate-300",
          icon: <Radio className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  const stateBadge = getStateBadge();

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-7 flex flex-col items-center justify-between shadow-2xl overflow-hidden min-h-[390px] text-white">
      {/* Background ambient glow effect */}
      <div
        className={`absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          state === "speaking"
            ? "bg-cyan-500"
            : state === "listening"
            ? "bg-emerald-500"
            : state === "thinking"
            ? "bg-amber-500"
            : "bg-indigo-500"
        }`}
      />
      <div
        className={`absolute -bottom-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          state === "speaking"
            ? "bg-violet-600"
            : state === "listening"
            ? "bg-teal-500"
            : state === "thinking"
            ? "bg-rose-500"
            : "bg-purple-600"
        }`}
      />

      {/* Top: Status Indicator & Persona Tag */}
      <div className="w-full flex items-center justify-between z-10 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPersonaPicker(!showPersonaPicker)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Change persona strictness & role"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>{persona.style}</span>
            <Settings2 className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${stateBadge.bg} transition-all`}
        >
          {stateBadge.icon}
          <span>{stateBadge.text}</span>
        </div>
      </div>

      {/* Persona Selection Dropdown Drawer */}
      {showPersonaPicker && (
        <div className="absolute top-16 left-6 right-6 z-30 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 p-4 shadow-2xl space-y-2 animate-in fade-in zoom-in-95">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Persona Strictness
          </div>
          {SARAH_PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelectPersona?.(p);
                setShowPersonaPicker(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-2.5 ${
                persona.id === p.id
                  ? "bg-blue-600/20 border-blue-500 text-white font-bold"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <UserCheck className={`w-4 h-4 shrink-0 mt-0.5 ${persona.id === p.id ? "text-blue-400" : "text-slate-500"}`} />
              <div>
                <div className="font-semibold text-slate-100">{p.style}</div>
                <div className="text-[11px] text-slate-400 font-normal">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Center: Pulsing Persona Avatar & Soundwave Orb */}
      <div className="relative my-3 flex flex-col items-center justify-center z-10">
        {/* Outer pulsating rings */}
        <div
          className={`absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border transition-all duration-500 ${
            state === "speaking"
              ? "border-cyan-500/40 animate-ping"
              : state === "listening" && !isMuted
              ? "border-emerald-500/40 scale-105"
              : state === "thinking"
              ? "border-amber-500/40 animate-pulse"
              : "border-slate-800"
          }`}
        />
        <div
          className={`absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border transition-all duration-500 ${
            state === "speaking"
              ? "border-violet-500/60 scale-110 shadow-lg shadow-violet-500/20"
              : state === "listening" && !isMuted
              ? "border-emerald-500/60 shadow-lg shadow-emerald-500/20"
              : state === "thinking"
              ? "border-amber-500/60 shadow-lg shadow-amber-500/20"
              : "border-slate-700/50"
          }`}
        />

        {/* Central Persona Avatar Card */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-800 flex items-center justify-center group">
          <img
            src={persona.avatar}
            alt={persona.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
          {state === "speaking" && (
            <div className="absolute inset-0 bg-cyan-900/20 border-2 border-cyan-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Advisor Details */}
        <div className="mt-2.5 text-center">
          <h3 className="text-sm font-bold text-slate-100">{persona.name}</h3>
          <p className="text-[11px] text-slate-400 max-w-xs">{persona.title}</p>
        </div>
      </div>

      {/* Audio Waveform Canvas */}
      <div className="w-full max-w-md h-10 flex items-center justify-center z-10 px-4">
        <canvas
          ref={canvasRef}
          width={280}
          height={40}
          className="w-full h-full max-w-xs rounded-lg"
        />
      </div>

      {/* Live Interim Transcript preview if speaking */}
      {interimTranscript && (
        <div className="w-full max-w-lg mt-1.5 px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 italic text-center animate-in fade-in z-10">
          &ldquo;{interimTranscript}...&rdquo;
        </div>
      )}

      {/* Bottom: Quick Interaction Controls */}
      <div className="w-full pt-4 flex flex-wrap items-center justify-center gap-3 z-10 border-t border-slate-800/80">
        {!isCallActive ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onStartCall}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 transition-all hover:scale-102 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Connect Live Voice Standup</span>
            </button>
            <button
              onClick={onTestVoice}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              title="Test audio output & hear sample speech"
            >
              <Volume1 className="w-4 h-4 text-cyan-400" />
              <span>Test Audio</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-950/60 border-rose-700 text-rose-300 hover:bg-rose-900/60"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? "Mic Muted" : "Mute Mic"}</span>
            </button>

            {state === "speaking" && (
              <button
                onClick={onInterrupt}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-600 text-xs font-semibold text-rose-200 transition-colors cursor-pointer animate-pulse"
                title="Interrupt or stop current voice response"
              >
                <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>Interrupt Sarah</span>
              </button>
            )}

            <button
              onClick={onTestVoice}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              title="Test audio playback"
            >
              <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Audio</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
