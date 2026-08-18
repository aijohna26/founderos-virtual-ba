import type {
  KanbanCard,
  Venture,
  VentureMember,
  VentureMemberRole,
} from "../store/ventureStore";

export const AI_ASSIGNEE_ID = "ai";

export interface MemberPermissions {
  canJoinStandup: boolean;
  canEditBoard: boolean;
  canAssignCards: boolean;
}

export function defaultPermissionsForRole(role: VentureMemberRole): MemberPermissions {
  if (role === "external" || role === "advisor") {
    return { canJoinStandup: true, canEditBoard: false, canAssignCards: false };
  }
  return { canJoinStandup: true, canEditBoard: true, canAssignCards: true };
}

export function activeVentureMembers(venture: Venture): VentureMember[] {
  return (venture.members || []).filter((member) => member.status === "active");
}

export function assignableVentureMembers(venture: Venture): VentureMember[] {
  return (venture.members || []).filter((member) =>
    member.status !== "removed" && (member.status === "active" || member.canAssignCards)
  );
}

export function memberDisplayName(member: VentureMember): string {
  return member.name?.trim() || member.email.split("@")[0] || "Team member";
}

export function memberInitials(member: VentureMember): string {
  const label = memberDisplayName(member);
  const parts = label.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : label.slice(0, 2)).toUpperCase();
}

export function cardAssignees(venture: Venture, card: KanbanCard): Array<{
  id: string;
  name: string;
  initials: string;
  isAI: boolean;
  status: VentureMember["status"] | "virtual";
}> {
  const legacyOwnerId = (venture.members || []).find((member) => member.role === "owner")?.id;
  const ids = card.assigneeIds && card.assigneeIds.length > 0
    ? card.assigneeIds
    : card.owner === "AI"
      ? [AI_ASSIGNEE_ID]
      : legacyOwnerId
        ? [legacyOwnerId]
        : [];
  return ids.map((id) => {
    if (id === AI_ASSIGNEE_ID) {
      return { id, name: "AI BA", initials: "AI", isAI: true, status: "virtual" as const };
    }
    const member = (venture.members || []).find((candidate) => candidate.id === id);
    return member
      ? {
          id,
          name: memberDisplayName(member),
          initials: memberInitials(member),
          isAI: false,
          status: member.status,
        }
      : { id, name: "Former member", initials: "?", isAI: false, status: "removed" as const };
  });
}

export function formatAssigneesForAdvisor(venture: Venture, card: KanbanCard): string {
  const assignees = cardAssignees(venture, card);
  return assignees.length > 0 ? assignees.map((assignee) => assignee.name).join(", ") : "Unassigned";
}

export function upsertVentureMember(venture: Venture, member: VentureMember): Venture {
  const existing = venture.members || [];
  const index = existing.findIndex((candidate) =>
    candidate.id === member.id ||
    (candidate.email && candidate.email.toLowerCase() === member.email.toLowerCase())
  );
  return {
    ...venture,
    members: index >= 0
      ? existing.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, ...member } : candidate)
      : [...existing, member],
  };
}

export function claimVentureOwner(
  venture: Venture,
  identity: { userId: string; email?: string; name?: string },
): Venture {
  const members = venture.members || [];
  const ownerIndex = members.findIndex((member) => member.role === "owner");
  if (venture.ownerUserId && ownerIndex >= 0 && members[ownerIndex].userId) return venture;
  const owner: VentureMember = ownerIndex >= 0
    ? {
        ...members[ownerIndex],
        userId: identity.userId,
        email: identity.email || members[ownerIndex].email,
        name: identity.name || members[ownerIndex].name || "You",
      }
    : {
        id: `${venture.id}:owner`,
        ventureId: venture.id,
        userId: identity.userId,
        email: identity.email || "",
        name: identity.name || "You",
        role: "owner",
        status: "active",
        canJoinStandup: true,
        canEditBoard: true,
        canAssignCards: true,
        joinedAt: new Date().toISOString(),
      };
  return {
    ...venture,
    ownerUserId: identity.userId,
    members: ownerIndex >= 0
      ? members.map((member, index) => index === ownerIndex ? owner : member)
      : [owner, ...members],
  };
}
