export type TicketBoardColumn = "backlog" | "today" | "in_progress" | "done" | "blocked";

export interface TicketAgingFields {
  createdAt?: string;
  statusChangedAt?: string;
  inProgressSince?: string;
  inProgressSinceInferred?: boolean;
  lastInProgressDurationDays?: number;
  blockedReason?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getInProgressAgeDays(
  ticket: Pick<TicketAgingFields, "inProgressSince">,
  now: Date = new Date(),
): number | null {
  if (!ticket.inProgressSince) return null;
  const startedAt = Date.parse(ticket.inProgressSince);
  if (!Number.isFinite(startedAt)) return null;
  return Math.max(0, Math.floor((now.getTime() - startedAt) / DAY_MS));
}

export function formatInProgressAge(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "Started today";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function transitionTicketStatus<T extends TicketAgingFields>(
  ticket: T,
  fromColumn: TicketBoardColumn,
  toColumn: TicketBoardColumn,
  nowIso: string = new Date().toISOString(),
  options?: { blockedReason?: string },
): T {
  if (fromColumn === toColumn) {
    // No column change, but a reason can still be recorded/edited on an already-blocked
    // ticket (e.g. the founder fills it in a moment after the drag-and-drop that blocked it).
    if (toColumn === "blocked" && options?.blockedReason !== undefined) {
      return { ...ticket, blockedReason: options.blockedReason.trim() || undefined };
    }
    return ticket;
  }

  let next: T = { ...ticket, statusChangedAt: nowIso };

  if (toColumn === "in_progress") {
    next = { ...next, inProgressSince: nowIso, inProgressSinceInferred: false };
  } else if (fromColumn === "in_progress") {
    const durationDays = getInProgressAgeDays(ticket, new Date(nowIso));
    next = {
      ...next,
      inProgressSince: undefined,
      inProgressSinceInferred: undefined,
      lastInProgressDurationDays: durationDays ?? ticket.lastInProgressDurationDays,
    };
  }

  if (toColumn === "blocked") {
    next = { ...next, blockedReason: options?.blockedReason?.trim() || ticket.blockedReason };
  } else if (fromColumn === "blocked") {
    // Leaving Blocked clears the reason -- it described why the ticket was stuck there
    // specifically, and would be stale/misleading attached to whatever column it moves to.
    next = { ...next, blockedReason: undefined };
  }

  return next;
}

