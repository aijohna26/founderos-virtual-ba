"use client";

import React, { useEffect, useState } from "react";
import { X, Activity, CheckCircle2, AlertCircle, Clock, Cpu, Layers, Terminal, Sparkles } from "lucide-react";
import { AIOperationsLogger, AIOperationEntry } from "@/lib/agent/aiOperationsLog";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

interface AIOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ventureId?: string;
}

export const AIOperationsModal: React.FC<AIOperationsModalProps> = ({
  isOpen,
  onClose,
  ventureId,
}) => {
  const [logs, setLogs] = useState<AIOperationEntry[]>([]);
  const [stats, setStats] = useState<any>({
    totalCalls: 0,
    successfulCalls: 0,
    successRate: 100,
    avgLatency: 0,
    toolUsageCounts: {},
  });

  useEffect(() => {
    if (isOpen) {
      const recentLogs = AIOperationsLogger.getLogs(ventureId);
      const summary = AIOperationsLogger.getSummaryStats(ventureId);
      setLogs(recentLogs);
      setStats(summary);
    }
  }, [isOpen, ventureId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>AI Agent Operations & Audit Telemetry</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                  Live Telemetry
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditable tool execution, latency benchmarks, and Gemini model telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/50">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Live Model</span>
            </div>
            <div className="text-sm font-bold text-slate-100 truncate">{GEMINI_CONFIG.LIVE_MODEL.replace("models/", "")}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tool Calls</span>
            </div>
            <div className="text-sm font-bold text-slate-100">{stats.totalCalls} executed</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Success Rate</span>
            </div>
            <div className="text-sm font-bold text-emerald-400">{stats.successRate}%</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Avg Latency</span>
            </div>
            <div className="text-sm font-bold text-slate-100">{stats.avgLatency}ms</div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Recent Agent Executions ({logs.length})</span>
            <span className="text-[11px] font-normal text-slate-500">Auto-refreshed</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs italic">
              No recent tool operations logged. Start a live standup to record operations.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.success ? "bg-emerald-400" : "bg-rose-500"
                      }`}
                    />
                    <strong className="text-slate-200 font-mono">{log.toolRequested}</strong>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-semibold">
                      {log.ceremony}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>{log.latencyMs}ms</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60 text-slate-300 overflow-x-auto">
                    <span className="text-slate-500 block text-[10px]">ARGS:</span>
                    {JSON.stringify(log.toolArguments)}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/60 text-slate-300 overflow-x-auto">
                    <span className="text-slate-500 block text-[10px]">RESULT:</span>
                    {JSON.stringify(log.toolResult)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
