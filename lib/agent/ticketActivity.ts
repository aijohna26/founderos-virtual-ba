import type { KanbanCard, TicketActivityEvent, Venture, VentureBoardSnapshot } from "../store/ventureStore";
import { getInProgressAgeDays } from "./ticketAging";

export type TicketActivityInput = Omit<TicketActivityEvent, "id" | "occurredAt"> & {
  id?: string;
  occurredAt?: string;
};

const MAX_ACTIVITY_EVENTS = 750;
const MAX_BOARD_SNAPSHOTS = 90;

export function appendTicketActivity(venture: Venture, input: TicketActivityInput): Venture {
  const occurredAt = input.occurredAt || new Date().toISOString();
  const event: TicketActivityEvent = {
    ...input,
    id: input.id || `activity-${Date.parse(occurredAt) || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt,
  };
  return {
    ...venture,
    ticketActivity: [...(venture.ticketActivity || []), event].slice(-MAX_ACTIVITY_EVENTS),
    standupSessions: (venture.standupSessions || []).map((session) =>
      session.status === "active"
        ? { ...session, activityEventIds: [...new Set([...session.activityEventIds, event.id])] }
        : session
    ),
  };
}

export function appendTicketActivities(venture: Venture, inputs: TicketActivityInput[]): Venture {
  return inputs.reduce((current, input) => appendTicketActivity(current, input), venture);
}

export function getTicketActivity(venture: Venture, ticketId: string): TicketActivityEvent[] {
  return (venture.ticketActivity || [])
    .filter((event) => event.ticketId === ticketId)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export function describeTicketChanges(before: KanbanCard, after: KanbanCard): string[] {
  const changes: string[] = [];
  if (before.title !== after.title) changes.push("title");
  if ((before.description || "") !== (after.description || "")) changes.push("description");
  if (before.priority !== after.priority) changes.push("priority");
  if (before.category !== after.category) changes.push("category");
  if (before.owner !== after.owner) changes.push("owner");
  if (JSON.stringify(before.assigneeIds || []) !== JSON.stringify(after.assigneeIds || [])) changes.push("assignees");
  if ((before.dueDate || "") !== (after.dueDate || "")) changes.push("due date");
  if ((before.linkedAssumptionId || "") !== (after.linkedAssumptionId || "")) changes.push("linked assumption");
  if ((before.blockedReason || "") !== (after.blockedReason || "")) changes.push("blocked reason");
  if (JSON.stringify(before.checklists || []) !== JSON.stringify(after.checklists || [])) changes.push("acceptance criteria");
  return changes;
}

export function captureStandupSnapshot(
  venture: Venture,
  occurredAt: string = new Date().toISOString(),
  participantIds?: string[],
): Venture {
  const previousStandupAt = venture.lastStandupAt;
  const ticketStates: VentureBoardSnapshot["ticketStates"] = [];
  for (const [column, value] of Object.entries(venture.columns) as Array<[
    keyof Venture["columns"],
    Venture["columns"][keyof Venture["columns"]],
  ]>) {
    for (const card of value.items || []) {
      ticketStates.push({
        ticketId: card.id,
        title: card.title,
        column,
        priority: card.priority,
        assigneeIds: card.assigneeIds,
        acceptanceCriteriaCompleted: (card.checklists || []).filter((item) => item.done).length,
        acceptanceCriteriaTotal: (card.checklists || []).length,
      });
    }
  }
  const snapshot: VentureBoardSnapshot = {
    id: `standup-${Date.parse(occurredAt) || Date.now()}`,
    capturedAt: occurredAt,
    ticketStates,
  };
  const defaultParticipantIds = (venture.members || [])
    .filter((member) => member.status === "active" && member.role === "owner" && member.canJoinStandup)
    .map((member) => member.id);
  const priorSessions = (venture.standupSessions || []).map((session) =>
    session.status === "active" ? { ...session, status: "completed" as const, endedAt: occurredAt } : session
  );
  const sessionId = `standup-session-${Date.parse(occurredAt) || Date.now()}`;
  return {
    ...venture,
    lastStandupAt: occurredAt,
    standupComparisonSince: previousStandupAt || new Date(Date.parse(occurredAt) - 24 * 60 * 60 * 1000).toISOString(),
    boardSnapshots: [...(venture.boardSnapshots || []), snapshot].slice(-MAX_BOARD_SNAPSHOTS),
    standupSessions: [...priorSessions, {
      id: sessionId,
      ventureId: venture.id,
      startedAt: occurredAt,
      status: "active",
      participantIds: participantIds || defaultParticipantIds,
      activityEventIds: [],
      decisions: [],
      commitmentIds: [],
    }],
  };
}

export function finishActiveStandupSession(venture: Venture, endedAt: string = new Date().toISOString()): Venture {
  return {
    ...venture,
    standupSessions: (venture.standupSessions || []).map((session) =>
      session.status === "active" ? { ...session, status: "completed", endedAt } : session
    ),
  };
}

export interface StandupHistorySummary {
  since: string;
  events: TicketActivityEvent[];
  completed: TicketActivityEvent[];
  started: TicketActivityEvent[];
  created: TicketActivityEvent[];
  updated: TicketActivityEvent[];
  moved: TicketActivityEvent[];
  deleted: TicketActivityEvent[];
  agingTickets: Array<{ card: KanbanCard; days: number; approximate: boolean }>;
}

export function summarizeStandupHistory(venture: Venture, now: Date = new Date()): StandupHistorySummary {
  const since = venture.standupComparisonSince
    || venture.lastStandupAt
    || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const sinceTime = Date.parse(since);
  const events = (venture.ticketActivity || [])
    .filter((event) => Date.parse(event.occurredAt) >= sinceTime)
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
  const inProgress = venture.columns.in_progress?.items || [];
  const agingTickets = inProgress
    .map((card) => ({
      card,
      days: getInProgressAgeDays(card, now) ?? 0,
      approximate: Boolean(card.inProgressSinceInferred),
    }))
    .filter((item) => item.days >= 3)
    .sort((a, b) => b.days - a.days);

  return {
    since,
    events,
    completed: events.filter((event) => event.type === "moved" && event.toColumn === "done"),
    started: events.filter((event) => event.type === "moved" && event.toColumn === "in_progress"),
    created: events.filter((event) => event.type === "created"),
    updated: events.filter((event) => event.type === "updated" || event.type === "criteria_updated"),
    moved: events.filter((event) => event.type === "moved"),
    deleted: events.filter((event) => event.type === "deleted"),
    agingTickets,
  };
}

export function formatActivityForAdvisor(venture: Venture, maxEvents = 12): string {
  const summary = summarizeStandupHistory(venture);
  if (summary.events.length === 0) {
    return `No recorded ticket changes since ${new Date(summary.since).toLocaleString()}.`;
  }
  return summary.events.slice(-maxEvents).map((event) => {
    const movement = event.fromColumn && event.toColumn
      ? ` (${event.fromColumn.replaceAll("_", " ")} → ${event.toColumn.replaceAll("_", " ")})`
      : "";
    return `- ${event.occurredAt}: ${event.summary}${movement} [${event.actor}/${event.source}]`;
  }).join("\n");
}
