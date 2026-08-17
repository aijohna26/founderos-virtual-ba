"use client";

import { Venture, KanbanCard } from "@/lib/store/ventureStore";
import { CommitmentStore, FounderCommitment, LearningPattern } from "@/lib/store/commitmentStore";

export interface StandupAgenda {
  greeting: string;
  sprintGoal: string;
  completedYesterday: KanbanCard[];
  carriedOverWork: KanbanCard[];
  activeBlockers: KanbanCard[];
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
    const backlogCards = getColItems(venture?.columns?.backlog);

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
    } else if (strategicConflictDetected) {
      greeting = `Morning Founder. I noticed our active tasks might be drifting from our sprint goal of "${sprintGoal}". Let's align on what matters today.`;
    } else {
      greeting = `Good morning! I've reviewed our sprint for ${venture.name}. We have ${inProgressCards.length + todayCards.length} active tasks and ${doneCards.length} completed. What's our main move today?`;
    }

    const suggestedOpeningQuestion = commitments.length > 0
      ? `Did you complete "${commitments[0].commitment}" yesterday?`
      : `What did you finish yesterday, and what are you committing to today?`;

    return {
      greeting,
      sprintGoal,
      completedYesterday: doneCards,
      carriedOverWork: [...inProgressCards, ...todayCards],
      activeBlockers: blockedCards,
      outstandingCommitments: commitments,
      relevantLearnings: learnings,
      strategicConflictDetected,
      conflictDescription,
      suggestedOpeningQuestion,
    };
  }
}
