"use client";

import { Venture, KanbanCard } from "@/lib/store/ventureStore";
import { CommitmentStore, FounderCommitment, LearningPattern } from "@/lib/store/commitmentStore";
import { summarizeStandupHistory } from "@/lib/agent/ticketActivity";
import type { TicketActivityEvent } from "@/lib/store/ventureStore";
import { formatAssigneesForAdvisor } from "@/lib/venture/members";

export interface StandupAgenda {
  greeting: string;
  sprintGoal: string;
  completedYesterday: KanbanCard[];
  carriedOverWork: KanbanCard[];
  activeBlockers: KanbanCard[];
  agingInProgress: Array<{ card: KanbanCard; days: number; approximate: boolean }>;
  historySince: string;
  recentActivity: TicketActivityEvent[];
  completedSinceLastStandup: TicketActivityEvent[];
  startedSinceLastStandup: TicketActivityEvent[];
  outstandingCommitments: FounderCommitment[];
  relevantLearnings: LearningPattern[];
  strategicConflictDetected: boolean;
  conflictDescription?: string;
  suggestedOpeningQuestion: string;
}

export class StandupPrepEngine {
  static prepareAgenda(venture: Venture): StandupAgenda {
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
    const history = summarizeStandupHistory(venture);
    const agingInProgress = history.agingTickets;

    const commitments = CommitmentStore.getOutstandingCommitments(venture.id);
    const learnings = CommitmentStore.getLearnings(venture.id);

    const sprintGoal = venture.problemStatement || "Validate primary customer demand";

    // Detect if work in progress contradicts the sprint goal
    let strategicConflictDetected = false;
    let conflictDescription = "";

    const activeWorkTitles = [...inProgressCards, ...todayCards].map((c) => c.title.toLowerCase());
    const hasDistractionWork = activeWorkTitles.some(
      (t) => t.includes("animation") || t.includes("settings") || t.includes("redesign") || t.includes("color")
    );
    const hasValidationGoal = sprintGoal.toLowerCase().includes("validat") || sprintGoal.toLowerCase().includes("customer") || sprintGoal.toLowerCase().includes("interview");

    if (hasDistractionWork && hasValidationGoal) {
      strategicConflictDetected = true;
      conflictDescription =
        "Active work on secondary UI/settings does not directly support the primary sprint goal of customer validation.";
    }

    // Formulate a sharp, proactive greeting
    let greeting = "";
    if (commitments.length > 0) {
      const topCommitment = commitments[0].commitment;
      greeting = `Good morning Founder. Yesterday you committed to: "${topCommitment}". Let's check where that stands against our sprint goal: "${sprintGoal}".`;
    } else if (blockedCards.length > 0) {
      greeting = `Morning! I've reviewed our sprint board. We have ${blockedCards.length} active blocker: "${blockedCards[0].title}". Let's get that unblocked first.`;
    } else if (agingInProgress.length > 0) {
      const oldest = agingInProgress[0];
      const assignees = formatAssigneesForAdvisor(venture, oldest.card);
      greeting = `Morning! "${oldest.card.title}" is assigned to ${assignees} and has been in progress for ${oldest.approximate ? "about " : ""}${oldest.days} days. Is it blocked, too large, or ready to finish?`;
    } else if (history.completed.length > 0) {
      const completedTitles = history.completed.slice(-2).map((event) => `"${event.ticketTitle}"`).join(" and ");
      greeting = `Morning! Since our last stand-up, you completed ${completedTitles}. Looking at the remaining sprint work, let's choose the next outcome that removes the most uncertainty.`;
    } else if (strategicConflictDetected) {
      greeting = `Morning Founder. I noticed our active tasks might be drifting from our sprint goal of "${sprintGoal}". Let's align on what matters today.`;
    } else {
      greeting = `Good morning! I've reviewed our sprint for ${venture.name}. We have ${inProgressCards.length + todayCards.length} active tasks and ${doneCards.length} completed. What's our main move today?`;
    }

    const suggestedOpeningQuestion = commitments.length > 0
      ? `Did you complete "${commitments[0].commitment}" yesterday?`
      : agingInProgress.length > 0
        ? `What is keeping "${agingInProgress[0].card.title}" in progress after ${agingInProgress[0].days} days?`
      : history.completed.length > 0
        ? `You moved ${history.completed.length} ${history.completed.length === 1 ? "ticket" : "tickets"} to Done. Which remaining ticket now removes the most uncertainty?`
      : `What did you finish yesterday, and what are you committing to today?`;

    return {
      greeting,
      sprintGoal,
      completedYesterday: doneCards,
      carriedOverWork: [...inProgressCards, ...todayCards],
      activeBlockers: blockedCards,
      agingInProgress,
      historySince: history.since,
      recentActivity: history.events,
      completedSinceLastStandup: history.completed,
      startedSinceLastStandup: history.started,
      outstandingCommitments: commitments,
      relevantLearnings: learnings,
      strategicConflictDetected,
      conflictDescription,
      suggestedOpeningQuestion,
    };
  }
}
