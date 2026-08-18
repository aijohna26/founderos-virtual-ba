export type TicketBoardColumn = "backlog" | "today" | "in_progress" | "done" | "blocked";

export interface TicketAgingFields {
  createdAt?: string;
  statusChangedAt?: string;
  inProgressSince?: string;
  inProgressSinceInferred?: boolean;
  lastInProgressDurationDays?: number;
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
): T {
  if (fromColumn === toColumn) return ticket;

  if (toColumn === "in_progress") {
    return {
      ...ticket,
      statusChangedAt: nowIso,
      inProgressSince: nowIso,
      inProgressSinceInferred: false,
    };
  }

  if (fromColumn === "in_progress") {
    const durationDays = getInProgressAgeDays(ticket, new Date(nowIso));
    return {
      ...ticket,
      statusChangedAt: nowIso,
      inProgressSince: undefined,
      inProgressSinceInferred: undefined,
      lastInProgressDurationDays: durationDays ?? ticket.lastInProgressDurationDays,
    };
  }

  return { ...ticket, statusChangedAt: nowIso };
}

