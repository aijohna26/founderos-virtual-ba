"use client";

export interface FounderCommitment {
  id: string;
  ventureId: string;
  commitment: string;
  deadline?: string;
  status: "pending" | "completed" | "missed";
  relatedTicketId?: string;
  source: "daily_standup" | "retrospective" | "ad_hoc";
  createdAt: string;
  completedAt?: string;
}

export interface LearningPattern {
  id: string;
  ventureId: string;
  pattern: string;
  evidence: string;
  confidence: "High" | "Medium" | "Low";
  suggestedCoachingBehavior: string;
  dateDetected: string;
  relevantSprintId?: number;
}

const COMMITMENTS_KEY = "founderally_commitments_v1";
const LEARNINGS_KEY = "founderally_learnings_v1";

export class CommitmentStore {
  // --- COMMITMENTS ---
  static getCommitments(ventureId: string): FounderCommitment[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(COMMITMENTS_KEY);
      if (!raw) return [];
      const all: FounderCommitment[] = JSON.parse(raw);
      return all.filter((c) => c.ventureId === ventureId);
    } catch (e) {
      return [];
    }
  }

  static getOutstandingCommitments(ventureId: string): FounderCommitment[] {
    return this.getCommitments(ventureId).filter((c) => c.status === "pending");
  }

  static recordCommitment(
    ventureId: string,
    commitmentText: string,
    deadline?: string,
    relatedTicketId?: string
  ): FounderCommitment {
    const newCommitment: FounderCommitment = {
      id: "cm-" + Date.now() + Math.random().toString(36).substr(2, 4),
      ventureId,
      commitment: commitmentText.trim(),
      deadline: deadline || "End of Day",
      status: "pending",
      relatedTicketId,
      source: "daily_standup",
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(COMMITMENTS_KEY);
        const all: FounderCommitment[] = raw ? JSON.parse(raw) : [];
        all.unshift(newCommitment);
        localStorage.setItem(COMMITMENTS_KEY, JSON.stringify(all));
      } catch (e) {}
    }

    return newCommitment;
  }

  static updateCommitmentStatus(
    id: string,
    status: "completed" | "missed"
  ): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(COMMITMENTS_KEY);
      if (!raw) return;
      const all: FounderCommitment[] = JSON.parse(raw);
      const updated = all.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              completedAt: status === "completed" ? new Date().toISOString() : undefined,
            }
          : c
      );
      localStorage.setItem(COMMITMENTS_KEY, JSON.stringify(updated));
    } catch (e) {}
  }

  // --- ADAPTATION & DURABLE LEARNINGS ---
  static getLearnings(ventureId: string): LearningPattern[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LEARNINGS_KEY);
      if (!raw) {
        // Seed initial grounded learning patterns for FounderAlly
        const initial: LearningPattern[] = [
          {
            id: "lp-1",
            ventureId,
            pattern: "Founder tends to focus on polish & secondary settings before completing customer interviews.",
            evidence: "Customer outreach ticket was carried over in previous sprint while UI tickets were moved to done.",
            confidence: "High",
            suggestedCoachingBehavior: "Challenge new feature requests aggressively unless customer validation is complete.",
            dateDetected: new Date().toLocaleDateString(),
          },
        ];
        localStorage.setItem(LEARNINGS_KEY, JSON.stringify(initial));
        return initial;
      }
      const all: LearningPattern[] = JSON.parse(raw);
      return all.filter((l) => l.ventureId === ventureId);
    } catch (e) {
      return [];
    }
  }

  static recordLearning(
    ventureId: string,
    pattern: string,
    evidence: string = "Observed during sprint execution",
    suggestedCoachingBehavior: string = "Prioritize customer de-risking over premature building"
  ): LearningPattern {
    const newLearning: LearningPattern = {
      id: "lp-" + Date.now() + Math.random().toString(36).substr(2, 4),
      ventureId,
      pattern: pattern.trim(),
      evidence: evidence.trim(),
      confidence: "High",
      suggestedCoachingBehavior: suggestedCoachingBehavior.trim(),
      dateDetected: new Date().toLocaleDateString(),
    };

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(LEARNINGS_KEY);
        const all: LearningPattern[] = raw ? JSON.parse(raw) : [];
        all.unshift(newLearning);
        localStorage.setItem(LEARNINGS_KEY, JSON.stringify(all));
      } catch (e) {}
    }

    return newLearning;
  }
}
