"use client";

import { PersistenceClient } from "@/lib/store/persistenceClient";
import { shouldApplyHydration } from "@/lib/store/hydrationGuard";

export interface MemoryFact {
  id: string;
  ventureId: string;
  category: "Customer" | "Market" | "Pricing" | "Problem" | "Product" | "Constraint" | "Decision";
  fact: string;
  source: "interview" | "founder" | "ai_inference" | "experiment" | "decision";
  confidence: "High" | "Medium" | "Low";
  createdAt: string;
}

const MEMORY_STORAGE_KEY = "founderally_venture_memory_v1";

export class MemoryService {
  private static mutationVersions = new Map<string, number>();

  private static bump(ventureId: string): void {
    this.mutationVersions.set(ventureId, (this.mutationVersions.get(ventureId) || 0) + 1);
  }

  static async hydrate(ventureId: string): Promise<boolean> {
    const versionAtStart = this.mutationVersions.get(ventureId) || 0;
    const cached = this.getMemories(ventureId);
    const rows = await PersistenceClient.list("memories", ventureId);
    if (!rows) return false;
    if (rows.length === 0 && cached.length > 0) {
      await Promise.all(cached.map((memory) => PersistenceClient.upsert("memories", {
        id: memory.id,
        venture_id: memory.ventureId,
        category: memory.category,
        fact: memory.fact,
        source: memory.source,
        confidence: memory.confidence,
        created_at: memory.createdAt,
      })));
      return true;
    }
    if (!shouldApplyHydration(versionAtStart, this.mutationVersions.get(ventureId) || 0)) return false;
    const memories: MemoryFact[] = rows.map((row) => ({
      id: String(row.id),
      ventureId: String(row.venture_id),
      category: row.category as MemoryFact["category"],
      fact: String(row.fact),
      source: row.source as MemoryFact["source"],
      confidence: row.confidence as MemoryFact["confidence"],
      createdAt: String(row.created_at),
    }));
    this.saveMemories(ventureId, memories);
    return true;
  }

  static getMemories(ventureId: string): MemoryFact[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PersistenceClient.cacheKey(`${MEMORY_STORAGE_KEY}_${ventureId}`));
      if (!raw) return [];
      const parsed: MemoryFact[] = JSON.parse(raw);
      const cleaned = parsed.filter((memory) => !(
        (memory.id === "m-1" && memory.fact === "Primary ICP: Solo founders and boutique software builders who need structured BA guidance.") ||
        (memory.id === "m-2" && memory.fact === "Target pricing: $29/mo for Founder Pro tier with 20% annual discount.")
      ));
      if (cleaned.length !== parsed.length) this.saveMemories(ventureId, cleaned);
      return cleaned;
    } catch {
      return [];
    }
  }

  static saveMemories(ventureId: string, memories: MemoryFact[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PersistenceClient.cacheKey(`${MEMORY_STORAGE_KEY}_${ventureId}`), JSON.stringify(memories));
    } catch (e) {
      console.error("Failed to save memory facts:", e);
    }
  }

  static addMemory(
    ventureId: string,
    fact: string,
    category: MemoryFact["category"] = "Customer",
    source: MemoryFact["source"] = "founder"
  ): MemoryFact {
    this.bump(ventureId);
    const existing = this.getMemories(ventureId);
    const newMemory: MemoryFact = {
      id: "mem-" + Date.now(),
      ventureId,
      category,
      fact,
      source,
      confidence: "High",
      createdAt: new Date().toISOString(),
    };

    const updated = [newMemory, ...existing];
    this.saveMemories(ventureId, updated);

    void PersistenceClient.upsert("memories", {
      id: newMemory.id,
      venture_id: ventureId,
      category,
      fact,
      source,
      confidence: newMemory.confidence,
      created_at: newMemory.createdAt,
    });

    return newMemory;
  }

  static deleteMemory(ventureId: string, memoryId: string): void {
    this.bump(ventureId);
    const existing = this.getMemories(ventureId);
    const updated = existing.filter((m) => m.id !== memoryId);
    this.saveMemories(ventureId, updated);
    void PersistenceClient.remove("memories", ventureId, memoryId);
  }
}
