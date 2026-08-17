"use client";

import { PersistenceClient } from "@/lib/store/persistenceClient";

export interface AIOperationEntry {
  id: string;
  timestamp: string;
  ventureId: string;
  ceremony: "daily_standup" | "sprint_planning" | "retrospective" | "ad_hoc_decision";
  geminiModel: string;
  toolRequested: string;
  toolArguments: Record<string, unknown>;
  toolResult: object;
  reasoningCategory: "sprint_alignment" | "de_risking" | "accountability" | "board_mutation";
  latencyMs: number;
  success: boolean;
}

const OPS_LOG_KEY = "founderally_ai_ops_log_v1";

export class AIOperationsLogger {
  static async hydrate(ventureId: string): Promise<boolean> {
    const cached = this.getLogs(ventureId);
    const rows = await PersistenceClient.list("operations", ventureId);
    if (!rows || typeof window === "undefined") return false;
    if (rows.length === 0 && cached.length > 0) {
      await Promise.all(cached.map((entry) => PersistenceClient.upsert("operations", {
        id: entry.id,
        venture_id: entry.ventureId,
        ceremony: entry.ceremony,
        gemini_model: entry.geminiModel,
        tool_requested: entry.toolRequested,
        tool_arguments: entry.toolArguments,
        tool_result: entry.toolResult,
        reasoning_category: entry.reasoningCategory,
        latency_ms: entry.latencyMs,
        success: entry.success,
        created_at: entry.timestamp,
      })));
      return true;
    }
    const remote: AIOperationEntry[] = rows.map((row) => ({
      id: String(row.id),
      timestamp: String(row.created_at),
      ventureId: String(row.venture_id),
      ceremony: row.ceremony as AIOperationEntry["ceremony"],
      geminiModel: String(row.gemini_model),
      toolRequested: String(row.tool_requested),
      toolArguments: (row.tool_arguments ?? {}) as Record<string, unknown>,
      toolResult: (row.tool_result ?? {}) as object,
      reasoningCategory: row.reasoning_category as AIOperationEntry["reasoningCategory"],
      latencyMs: Number(row.latency_ms),
      success: Boolean(row.success),
    }));
    const local = this.getLogs().filter((entry) => entry.ventureId !== ventureId);
    localStorage.setItem(PersistenceClient.cacheKey(OPS_LOG_KEY), JSON.stringify([...remote, ...local].slice(0, 100)));
    return true;
  }

  static getLogs(ventureId?: string): AIOperationEntry[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PersistenceClient.cacheKey(OPS_LOG_KEY));
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
        const cacheKey = PersistenceClient.cacheKey(OPS_LOG_KEY);
        const raw = localStorage.getItem(cacheKey);
        const all: AIOperationEntry[] = raw ? JSON.parse(raw) : [];
        all.unshift(newEntry);
        // Keep up to 100 recent entries
        localStorage.setItem(cacheKey, JSON.stringify(all.slice(0, 100)));
      } catch (e) {}
    }

    void PersistenceClient.upsert("operations", {
      id: newEntry.id,
      venture_id: newEntry.ventureId,
      ceremony: newEntry.ceremony,
      gemini_model: newEntry.geminiModel,
      tool_requested: newEntry.toolRequested,
      tool_arguments: newEntry.toolArguments,
      tool_result: newEntry.toolResult,
      reasoning_category: newEntry.reasoningCategory,
      latency_ms: newEntry.latencyMs,
      success: newEntry.success,
      created_at: newEntry.timestamp,
    });

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
