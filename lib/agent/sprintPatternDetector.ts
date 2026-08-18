export interface SprintPatternInput {
  sprintNumber: number;
  totalTaken: number;
  outstanding: number;
  blocked: number;
  completionRate: number;
}

export interface DetectedSprintPattern {
  id: string;
  ventureId: string;
  pattern: string;
  evidence: string;
  confidence: "High" | "Medium" | "Low";
  suggestedCoachingBehavior: string;
  relevantSprintId?: number;
}

export function detectSprintPatterns(
  ventureId: string,
  sprintHistory: SprintPatternInput[] = [],
): DetectedSprintPattern[] {
  if (sprintHistory.length < 3) return [];
  const sorted = [...sprintHistory].sort((a, b) => a.sprintNumber - b.sprintNumber);
  const recentWindow = sorted.slice(-4);
  const detected: DetectedSprintPattern[] = [];

  const highCarryOver = recentWindow.filter((sprint) =>
    sprint.totalTaken >= 4 && sprint.outstanding >= 2 && sprint.outstanding / sprint.totalTaken >= 0.3
  );
  if (highCarryOver.length >= 3) {
    detected.push({
      id: `lp-observed-carry-over-${ventureId}`,
      ventureId,
      pattern: "At least 30% of planned work was carried over in three or more recent sprints.",
      evidence: highCarryOver.map((s) => `Sprint ${s.sprintNumber}: ${s.outstanding}/${s.totalTaken} outstanding`).join("; "),
      confidence: highCarryOver.length === 4 ? "High" : "Medium",
      suggestedCoachingBehavior: "Reduce the next sprint commitment and ask which work can be removed before adding more.",
      relevantSprintId: highCarryOver.at(-1)?.sprintNumber,
    });
  }

  const blockedSprints = recentWindow.filter((sprint) => sprint.totalTaken >= 4 && sprint.blocked > 0);
  if (blockedSprints.length >= 3) {
    detected.push({
      id: `lp-observed-blockers-${ventureId}`,
      ventureId,
      pattern: "Blockers have recurred in three or more recent completed sprints.",
      evidence: blockedSprints.map((s) => `Sprint ${s.sprintNumber}: ${s.blocked} blocked`).join("; "),
      confidence: blockedSprints.length === 4 ? "High" : "Medium",
      suggestedCoachingBehavior: "Start stand-ups by resolving the oldest blocker and assigning a concrete owner.",
      relevantSprintId: blockedSprints.at(-1)?.sprintNumber,
    });
  }

  const recent = sorted.slice(-3);
  if (
    recent.length === 3 &&
    recent.every((sprint) => sprint.totalTaken >= 4) &&
    recent[0].completionRate - recent[1].completionRate >= 5 &&
    recent[1].completionRate - recent[2].completionRate >= 5
  ) {
    detected.push({
      id: `lp-observed-declining-completion-${ventureId}`,
      ventureId,
      pattern: "Sprint completion rate declined materially for three consecutive completed sprints.",
      evidence: recent.map((s) => `Sprint ${s.sprintNumber}: ${s.completionRate}%`).join("; "),
      confidence: "High",
      suggestedCoachingBehavior: "Challenge scope growth and agree one measurable outcome before the next sprint begins.",
      relevantSprintId: recent.at(-1)?.sprintNumber,
    });
  }

  return detected;
}
