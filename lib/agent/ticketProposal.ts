import type { KanbanCard, Venture } from "../store/ventureStore";
import { memberDisplayName } from "../venture/members";

export interface TicketMutationAction {
  type: "update_ticket" | "move_ticket" | "move_card";
  ticketId?: string;
  cardTitle?: string;
  newTitle?: string;
  description?: string;
  priority?: KanbanCard["priority"];
  category?: KanbanCard["category"];
  acceptanceCriteria?: string[];
  acceptanceCriteriaMode?: "append" | "replace";
  checklistUpdates?: Array<{ id?: string; text?: string; done?: boolean }>;
  assigneeIds?: string[];
  dueDate?: string;
  linkedAssumptionId?: string;
  toColumn?: keyof Venture["columns"];
}

export interface PendingTicketProposal {
  id: string;
  ticketId: string;
  ticketTitle: string;
  actions: TicketMutationAction[];
  changes: string[];
  createdAt: string;
}

export function isTicketMutationAction(value: unknown): value is TicketMutationAction {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "update_ticket" || type === "move_ticket" || type === "move_card";
}

export function bindActionsToFocusedTicket(
  actions: TicketMutationAction[],
  ticket: { id: string; title: string },
): TicketMutationAction[] {
  return actions.map((action) => ({
    ...action,
    ticketId: ticket.id,
    cardTitle: ticket.title,
  }));
}

export function describeTicketMutation(action: TicketMutationAction, venture: Venture): string[] {
  const changes: string[] = [];
  if (action.newTitle) changes.push(`Rename to “${action.newTitle}”`);
  if (action.description !== undefined) changes.push("Rewrite description and context");
  if (action.priority) changes.push(`Set priority to ${action.priority}`);
  if (action.category) changes.push(`Set category to ${action.category}`);
  if (action.dueDate !== undefined) changes.push(action.dueDate ? `Set due date to ${action.dueDate}` : "Clear due date");
  if (action.linkedAssumptionId !== undefined) {
    const assumption = venture.assumptions?.find((item) => item.id === action.linkedAssumptionId);
    changes.push(action.linkedAssumptionId
      ? `Link assumption: ${assumption?.statement || action.linkedAssumptionId}`
      : "Remove linked assumption");
  }
  if (Array.isArray(action.assigneeIds)) {
    const names = action.assigneeIds.map((id) => {
      if (id === "ai") return "AI BA";
      const member = venture.members?.find((candidate) => candidate.id === id);
      return member ? memberDisplayName(member) : id;
    });
    changes.push(names.length > 0 ? `Assign to ${names.join(", ")}` : "Remove all assignees");
  }
  if (Array.isArray(action.acceptanceCriteria) && action.acceptanceCriteria.length > 0) {
    changes.push(`${action.acceptanceCriteriaMode === "replace" ? "Replace with" : "Add"} ${action.acceptanceCriteria.length} acceptance ${action.acceptanceCriteria.length === 1 ? "criterion" : "criteria"}`);
  }
  if (Array.isArray(action.checklistUpdates) && action.checklistUpdates.length > 0) {
    changes.push(`Update ${action.checklistUpdates.length} acceptance ${action.checklistUpdates.length === 1 ? "criterion" : "criteria"}`);
  }
  if (action.toColumn) changes.push(`Move to ${venture.columns[action.toColumn]?.name || action.toColumn.replaceAll("_", " ")}`);
  return changes;
}

export function createPendingTicketProposal(
  actions: TicketMutationAction[],
  ticket: { id: string; title: string },
  venture: Venture,
): PendingTicketProposal {
  const boundActions = bindActionsToFocusedTicket(actions, ticket);
  return {
    id: `ticket-proposal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ticketId: ticket.id,
    ticketTitle: ticket.title,
    actions: boundActions,
    changes: boundActions.flatMap((action) => describeTicketMutation(action, venture)),
    createdAt: new Date().toISOString(),
  };
}

export function isProposalConfirmation(message: string): boolean {
  return /^(yes|yep|yeah|confirm|confirmed|approve|approved|apply|apply it|do it|go ahead|make (the|those) changes|save (it|those changes))\b[.!]?$/i.test(message.trim());
}

export function isProposalCancellation(message: string): boolean {
  return /^(no|cancel|discard|stop|don'?t|do not|leave it|never mind|nevermind)\b[.!]?$/i.test(message.trim());
}
