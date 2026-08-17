"use client";

export interface AIOperationEntry {
  id: string;
  timestamp: string;
  ventureId: string;
  ceremony: "daily_standup" | "sprint_planning" | "retrospective" | "ad_hoc_decision";
  geminiModel: string;
  toolRequested: string;
  toolArguments: Record<string, any>;
  toolResult: Record<string, any>;
  reasoningCategory: "sprint_alignment" | "de_risking" | "accountability" | "board_mutation";
  latencyMs: number;
  success: boolean;
}

const OPS_LOG_KEY = "founderally_ai_ops_log_v1";

export class AIOperationsLogger {
  static getLogs(ventureId?: string): AIOperationEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(OPS_LOG_KEY);
      if (!raw) return [];
      const all: AIOperationEntry[] = JSON.parse(raw);
      if (ventureId) {
        return all.filter((entry) => entry.ventureId === ventureId);
      }
      return all;
    } catch (e) {
      return [];
    }
  }

  static logOperation(entry: Omit<AIOperationEntry, "id" | "timestamp">): AIOperationEntry {
    const newEntry: AIOperationEntry = {
      id: "op-" + Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(OPS_LOG_KEY);
        const all: AIOperationEntry[] = raw ? JSON.parse(raw) : [];
        all.unshift(newEntry);
        // Keep up to 100 recent entries
        localStorage.setItem(OPS_LOG_KEY, JSON.stringify(all.slice(0, 100)));
      } catch (e) {}
    }

    return newEntry;
  }

  static getSummaryStats(ventureId?: string) {
    const logs = this.getLogs(ventureId);
    const totalCalls = logs.length;
    const successfulCalls = logs.filter((l) => l.success).length;
    const avgLatency =
      totalCalls > 0
        ? Math.round(logs.reduce((acc, curr) => acc + curr.latencyMs, 0) / totalCalls)
        : 0;

    const toolUsageCounts = logs.reduce((acc, curr) => {
      acc[curr.toolRequested] = (acc[curr.toolRequested] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      successfulCalls,
      successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 100,
      avgLatency,
      toolUsageCounts,
    };
  }
}
