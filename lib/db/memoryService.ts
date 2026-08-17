"use client";

import { supabase } from "@/lib/supabase/client";

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
  static getMemories(ventureId: string): MemoryFact[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(`${MEMORY_STORAGE_KEY}_${ventureId}`);
      if (!raw) {
        // Seed default initial memories for FounderAlly or new ventures
        const defaults: MemoryFact[] = [
          {
            id: "m-1",
            ventureId,
            category: "Customer",
            fact: "Primary ICP: Solo founders and boutique software builders who need structured BA guidance.",
            source: "founder",
            confidence: "High",
            createdAt: new Date().toISOString(),
          },
          {
            id: "m-2",
            ventureId,
            category: "Pricing",
            fact: "Target pricing: $29/mo for Founder Pro tier with 20% annual discount.",
            source: "decision",
            confidence: "High",
            createdAt: new Date().toISOString(),
          },
        ];
        this.saveMemories(ventureId, defaults);
        return defaults;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static saveMemories(ventureId: string, memories: MemoryFact[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(`${MEMORY_STORAGE_KEY}_${ventureId}`, JSON.stringify(memories));
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

    // Asynchronously sync with Supabase if table exists
    try {
      supabase
        .from("venture_memories")
        .insert([{
          id: newMemory.id,
          venture_id: ventureId,
          category,
          fact,
          source,
          confidence: "High",
          created_at: newMemory.createdAt,
        }])
        .then(() => {});
    } catch {
      // Offline / table not migrated yet
    }

    return newMemory;
  }

  static deleteMemory(ventureId: string, memoryId: string): void {
    const existing = this.getMemories(ventureId);
    const updated = existing.filter((m) => m.id !== memoryId);
    this.saveMemories(ventureId, updated);
  }
}
