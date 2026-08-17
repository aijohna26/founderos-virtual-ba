"use client";

import type { SprintRecord } from "@/lib/store/ventureStore";
import { PersistenceClient } from "@/lib/store/persistenceClient";

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
  private static notify(): void {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("founderally:persistence"));
  }

  private static replaceVentureRecords<T extends { ventureId: string }>(
    key: string,
    ventureId: string,
    records: T[],
  ): void {
    if (typeof window === "undefined") return;
    const scopedKey = PersistenceClient.cacheKey(key);
    const raw = localStorage.getItem(scopedKey);
    const all: T[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(scopedKey, JSON.stringify([...records, ...all.filter((item) => item.ventureId !== ventureId)]));
  }

  static async hydrate(ventureId: string): Promise<boolean> {
    const cachedCommitments = this.getCommitments(ventureId);
    const cachedLearnings = this.getLearnings(ventureId);
    const [commitmentRows, learningRows] = await Promise.all([
      PersistenceClient.list("commitments", ventureId),
      PersistenceClient.list("learnings", ventureId),
    ]);
    let hydrated = false;
    if (commitmentRows && commitmentRows.length === 0 && cachedCommitments.length > 0) {
      await Promise.all(cachedCommitments.map((commitment) => PersistenceClient.upsert("commitments", {
        id: commitment.id,
        venture_id: commitment.ventureId,
        commitment: commitment.commitment,
        deadline: commitment.deadline,
        status: commitment.status,
        related_ticket_id: commitment.relatedTicketId,
        source: commitment.source,
        created_at: commitment.createdAt,
        completed_at: commitment.completedAt,
      })));
      hydrated = true;
    } else if (commitmentRows) {
      const commitments: FounderCommitment[] = commitmentRows.map((row) => ({
        id: String(row.id),
        ventureId: String(row.venture_id),
        commitment: String(row.commitment),
        deadline: row.deadline ? String(row.deadline) : undefined,
        status: row.status as FounderCommitment["status"],
        relatedTicketId: row.related_ticket_id ? String(row.related_ticket_id) : undefined,
        source: row.source as FounderCommitment["source"],
        createdAt: String(row.created_at),
        completedAt: row.completed_at ? String(row.completed_at) : undefined,
      }));
      this.replaceVentureRecords(COMMITMENTS_KEY, ventureId, commitments);
      hydrated = true;
    }
    if (learningRows && learningRows.length === 0 && cachedLearnings.length > 0) {
      await Promise.all(cachedLearnings.map((learning) => PersistenceClient.upsert("learnings", {
        id: learning.id,
        venture_id: learning.ventureId,
        pattern: learning.pattern,
        evidence: learning.evidence,
        confidence: learning.confidence,
        suggested_coaching_behavior: learning.suggestedCoachingBehavior,
        date_detected: learning.dateDetected,
        relevant_sprint_id: learning.relevantSprintId,
      })));
      hydrated = true;
    } else if (learningRows) {
      const learnings: LearningPattern[] = learningRows.map((row) => ({
        id: String(row.id),
        ventureId: String(row.venture_id),
        pattern: String(row.pattern),
        evidence: String(row.evidence),
        confidence: row.confidence as LearningPattern["confidence"],
        suggestedCoachingBehavior: String(row.suggested_coaching_behavior),
        dateDetected: String(row.date_detected),
        relevantSprintId: typeof row.relevant_sprint_id === "number" ? row.relevant_sprint_id : undefined,
      }));
      this.replaceVentureRecords(LEARNINGS_KEY, ventureId, learnings);
      hydrated = true;
    }
    if (hydrated) this.notify();
    return hydrated;
  }

  // --- COMMITMENTS ---
  static getCommitments(ventureId: string): FounderCommitment[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(PersistenceClient.cacheKey(COMMITMENTS_KEY));
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
        const cacheKey = PersistenceClient.cacheKey(COMMITMENTS_KEY);
        const raw = localStorage.getItem(cacheKey);
        const all: FounderCommitment[] = raw ? JSON.parse(raw) : [];
        all.unshift(newCommitment);
        localStorage.setItem(cacheKey, JSON.stringify(all));
      } catch (e) {}
    }

    void PersistenceClient.upsert("commitments", {
      id: newCommitment.id,
      venture_id: ventureId,
      commitment: newCommitment.commitment,
      deadline: newCommitment.deadline,
      status: newCommitment.status,
      related_ticket_id: newCommitment.relatedTicketId,
      source: newCommitment.source,
      created_at: newCommitment.createdAt,
    });
    this.notify();

    return newCommitment;
  }

  static updateCommitmentStatus(
    id: string,
    status: "completed" | "missed"
  ): void {
    if (typeof window === "undefined") return;
    try {
      const cacheKey = PersistenceClient.cacheKey(COMMITMENTS_KEY);
      const raw = localStorage.getItem(cacheKey);
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
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      const changed = updated.find((commitment) => commitment.id === id);
      if (changed) {
        void PersistenceClient.upsert("commitments", {
          id: changed.id,
          venture_id: changed.ventureId,
          commitment: changed.commitment,
          deadline: changed.deadline,
          status: changed.status,
          related_ticket_id: changed.relatedTicketId,
          source: changed.source,
          created_at: changed.createdAt,
          completed_at: changed.completedAt,
        });
      }
      this.notify();
    } catch (e) {}
  }

  // --- ADAPTATION & DURABLE LEARNINGS ---
  static getLearnings(ventureId: string): LearningPattern[] {
    if (typeof window === "undefined") return [];
    try {
      const cacheKey = PersistenceClient.cacheKey(LEARNINGS_KEY);
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return [];
      const all: LearningPattern[] = JSON.parse(raw);
      const cleaned = all.filter((learning) => !(
        learning.id === "lp-1" &&
        learning.pattern === "Founder tends to focus on polish & secondary settings before completing customer interviews."
      ));
      if (cleaned.length !== all.length) localStorage.setItem(cacheKey, JSON.stringify(cleaned));
      return cleaned.filter((l) => l.ventureId === ventureId);
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
      dateDetected: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        const cacheKey = PersistenceClient.cacheKey(LEARNINGS_KEY);
        const raw = localStorage.getItem(cacheKey);
        const all: LearningPattern[] = raw ? JSON.parse(raw) : [];
        all.unshift(newLearning);
        localStorage.setItem(cacheKey, JSON.stringify(all));
      } catch (e) {}
    }

    void PersistenceClient.upsert("learnings", {
      id: newLearning.id,
      venture_id: ventureId,
      pattern: newLearning.pattern,
      evidence: newLearning.evidence,
      confidence: newLearning.confidence,
      suggested_coaching_behavior: newLearning.suggestedCoachingBehavior,
      date_detected: newLearning.dateDetected,
      relevant_sprint_id: newLearning.relevantSprintId,
    });
    this.notify();

    return newLearning;
  }

  static detectFromSprintHistory(ventureId: string, sprintHistory: SprintRecord[] = []): LearningPattern[] {
    if (sprintHistory.length < 2) return [];
    const sorted = [...sprintHistory].sort((a, b) => a.sprintNumber - b.sprintNumber);
    const existing = this.getLearnings(ventureId);
    const detected: Array<Omit<LearningPattern, "dateDetected">> = [];
    const highCarryOver = sorted.filter((sprint) => sprint.totalTaken > 0 && sprint.outstanding / sprint.totalTaken >= 0.3);
    if (highCarryOver.length >= 2) {
      detected.push({
        id: `lp-observed-carry-over-${ventureId}`,
        ventureId,
        pattern: "At least 30% of planned work was carried over in multiple completed sprints.",
        evidence: highCarryOver.map((s) => `Sprint ${s.sprintNumber}: ${s.outstanding}/${s.totalTaken} outstanding`).join("; "),
        confidence: highCarryOver.length >= 3 ? "High" : "Medium",
        suggestedCoachingBehavior: "Reduce the next sprint commitment and ask which work can be removed before adding more.",
        relevantSprintId: highCarryOver.at(-1)?.sprintNumber,
      });
    }
    const blockedSprints = sorted.filter((sprint) => sprint.blocked > 0);
    if (blockedSprints.length >= 2) {
      detected.push({
        id: `lp-observed-blockers-${ventureId}`,
        ventureId,
        pattern: "Blockers have recurred across multiple completed sprints.",
        evidence: blockedSprints.map((s) => `Sprint ${s.sprintNumber}: ${s.blocked} blocked`).join("; "),
        confidence: blockedSprints.length >= 3 ? "High" : "Medium",
        suggestedCoachingBehavior: "Start stand-ups by resolving the oldest blocker and assigning a concrete owner.",
        relevantSprintId: blockedSprints.at(-1)?.sprintNumber,
      });
    }
    const recent = sorted.slice(-3);
    if (recent.length === 3 && recent[0].completionRate > recent[1].completionRate && recent[1].completionRate > recent[2].completionRate) {
      detected.push({
        id: `lp-observed-declining-completion-${ventureId}`,
        ventureId,
        pattern: "Sprint completion rate has declined for three consecutive completed sprints.",
        evidence: recent.map((s) => `Sprint ${s.sprintNumber}: ${s.completionRate}%`).join("; "),
        confidence: "High",
        suggestedCoachingBehavior: "Challenge scope growth and agree one measurable outcome before the next sprint begins.",
        relevantSprintId: recent.at(-1)?.sprintNumber,
      });
    }

    const newPatterns = detected.filter((candidate) => !existing.some((item) => item.id === candidate.id));
    return newPatterns.map((candidate) => {
      const learning: LearningPattern = { ...candidate, dateDetected: new Date().toISOString() };
      if (typeof window !== "undefined") {
        const cacheKey = PersistenceClient.cacheKey(LEARNINGS_KEY);
        const raw = localStorage.getItem(cacheKey);
        const all: LearningPattern[] = raw ? JSON.parse(raw) : [];
        localStorage.setItem(cacheKey, JSON.stringify([learning, ...all]));
      }
      void PersistenceClient.upsert("learnings", {
        id: learning.id,
        venture_id: learning.ventureId,
        pattern: learning.pattern,
        evidence: learning.evidence,
        confidence: learning.confidence,
        suggested_coaching_behavior: learning.suggestedCoachingBehavior,
        date_detected: learning.dateDetected,
        relevant_sprint_id: learning.relevantSprintId,
      });
      return learning;
    });
  }
}
