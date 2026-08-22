import assert from "node:assert/strict";
import test from "node:test";
import { detectSprintPatterns, type SprintPatternInput } from "../lib/agent/sprintPatternDetector";
import { shouldApplyHydration } from "../lib/store/hydrationGuard";
import { PersistenceClient } from "../lib/store/persistenceClient";
import { mergeTicketCriteria } from "../lib/agent/ticketCriteria";
import { formatInProgressAge, getInProgressAgeDays, transitionTicketStatus, type TicketAgingFields } from "../lib/agent/ticketAging";
import {
  appendTicketActivity,
  captureStandupSnapshot,
  describeTicketChanges,
  summarizeStandupHistory,
} from "../lib/agent/ticketActivity";
import type { Venture } from "../lib/store/ventureStore";
import {
  cardAssignees,
  defaultPermissionsForRole,
  formatAssigneesForAdvisor,
} from "../lib/venture/members";
import {
  createVentureInviteToken,
  verifyVentureInviteToken,
} from "../lib/collaboration/inviteTokens";
import {
  bindActionsToFocusedTicket,
  createPendingTicketProposal,
  isProposalCancellation,
  isProposalConfirmation,
} from "../lib/agent/ticketProposal";
import { BAAgentService } from "../lib/agent/baAgentService";

const activityVenture = (): Venture => ({
  id: "v1",
  name: "Test Venture",
  ticketActivity: [],
  boardSnapshots: [],
  columns: {
    backlog: { name: "BACKLOG", items: [] },
    today: { name: "TODAY", items: [] },
    in_progress: { name: "IN PROGRESS", items: [] },
    done: { name: "DONE", items: [] },
    blocked: { name: "BLOCKED", items: [] },
  },
} as unknown as Venture);

const sprint = (sprintNumber: number, overrides: Partial<SprintPatternInput> = {}): SprintPatternInput => ({
  sprintNumber,
  totalTaken: 10,
  outstanding: 0,
  blocked: 0,
  completionRate: 90,
  ...overrides,
});

test("does not infer behavior from fewer than three sprints", () => {
  assert.deepEqual(detectSprintPatterns("v1", [sprint(1, { outstanding: 5 }), sprint(2, { outstanding: 5 })]), []);
});

test("ignores small-sprint carry-over noise and isolated blockers", () => {
  const result = detectSprintPatterns("v1", [
    sprint(1, { totalTaken: 2, outstanding: 1, blocked: 1 }),
    sprint(2, { totalTaken: 3, outstanding: 1 }),
    sprint(3, { totalTaken: 2, outstanding: 1 }),
  ]);
  assert.deepEqual(result, []);
});

test("detects repeated material carry-over in recent adequately-sized sprints", () => {
  const result = detectSprintPatterns("v1", [
    sprint(1, { outstanding: 4 }),
    sprint(2, { outstanding: 3 }),
    sprint(3, { outstanding: 4 }),
  ]);
  assert.equal(result.some((pattern) => pattern.id.includes("carry-over")), true);
});

test("requires meaningful five-point completion declines", () => {
  assert.equal(detectSprintPatterns("v1", [
    sprint(1, { completionRate: 90 }),
    sprint(2, { completionRate: 89 }),
    sprint(3, { completionRate: 88 }),
  ]).some((pattern) => pattern.id.includes("declining-completion")), false);

  assert.equal(detectSprintPatterns("v1", [
    sprint(1, { completionRate: 90 }),
    sprint(2, { completionRate: 82 }),
    sprint(3, { completionRate: 74 }),
  ]).some((pattern) => pattern.id.includes("declining-completion")), true);
});

test("late hydration is rejected after a local mutation", () => {
  assert.equal(shouldApplyHydration(4, 4), true);
  assert.equal(shouldApplyHydration(4, 5), false);
});

test("persistence client keeps the cache path alive on Supabase outage or auth mismatch", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Unavailable" }), { status: 503 });
    assert.equal(await PersistenceClient.list("commitments", "v1"), null);
    assert.equal(await PersistenceClient.upsert("commitments", { id: "c1" }), false);

    globalThis.fetch = async () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    assert.equal(await PersistenceClient.list("commitments", "v1"), null);

    globalThis.fetch = async () => { throw new Error("network down"); };
    assert.equal(await PersistenceClient.list("commitments", "v1"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ticket criteria append without duplicating existing wording", () => {
  const existing = [{ id: "a", text: "User can save the form", done: false }];
  const merged = mergeTicketCriteria(
    existing,
    ["User can save the form", "Validation errors identify the field"],
    "append",
    [],
    (index) => `new-${index}`,
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[1].text, "Validation errors identify the field");
});

test("ticket criteria replace only when explicitly requested", () => {
  const existing = [{ id: "a", text: "Old criterion", done: true }];
  const replaced = mergeTicketCriteria(existing, ["New measurable criterion"], "replace", [], () => "new");
  assert.deepEqual(replaced, [{ id: "new", text: "New measurable criterion", done: false }]);
});

test("ticket criterion completion updates use stable IDs", () => {
  const existing = [{ id: "criterion-1", text: "API returns 200", done: false }];
  const updated = mergeTicketCriteria(existing, [], "append", [{ id: "criterion-1", done: true }]);
  assert.equal(updated[0].done, true);
});

test("moving a ticket into progress starts a new uninterrupted age clock", () => {
  const card: TicketAgingFields = {};
  const moved = transitionTicketStatus(
    card,
    "today",
    "in_progress",
    "2026-08-15T09:00:00.000Z",
  );
  assert.equal(moved.inProgressSince, "2026-08-15T09:00:00.000Z");
  assert.equal(moved.inProgressSinceInferred, false);
});

test("an in-progress no-op does not reset the ticket age", () => {
  const card = { inProgressSince: "2026-08-10T09:00:00.000Z" };
  const unchanged = transitionTicketStatus(card, "in_progress", "in_progress", "2026-08-18T09:00:00.000Z");
  assert.equal(unchanged, card);
  assert.equal(unchanged.inProgressSince, "2026-08-10T09:00:00.000Z");
});

test("leaving progress stops the active clock and retains the completed duration", () => {
  const card: TicketAgingFields = {
    inProgressSince: "2026-08-15T09:00:00.000Z",
  };
  const moved = transitionTicketStatus(
    card,
    "in_progress",
    "done",
    "2026-08-18T09:00:00.000Z",
  );
  assert.equal(moved.inProgressSince, undefined);
  assert.equal(moved.lastInProgressDurationDays, 3);
});

test("ticket age uses complete elapsed days with a stand-up friendly label", () => {
  const age = getInProgressAgeDays(
    { inProgressSince: "2026-08-15T12:00:00.000Z" },
    new Date("2026-08-18T13:00:00.000Z"),
  );
  assert.equal(age, 3);
  assert.equal(formatInProgressAge(age), "3 days");
  assert.equal(formatInProgressAge(0), "Started today");
});

test("ticket activity is append-only and remains venture scoped", () => {
  const venture = appendTicketActivity(activityVenture(), {
    id: "event-1",
    occurredAt: "2026-08-18T09:00:00.000Z",
    ticketId: "t1",
    ticketTitle: "Interview customers",
    type: "created",
    actor: "advisor",
    source: "ba_tool",
    summary: "Created customer interview ticket",
  });
  assert.equal(venture.ticketActivity?.length, 1);
  assert.equal(venture.ticketActivity?.[0].ticketId, "t1");
  assert.equal(activityVenture().ticketActivity?.length, 0);
});

test("stand-up snapshots preserve the previous comparison boundary", () => {
  const first = captureStandupSnapshot(activityVenture(), "2026-08-17T09:00:00.000Z");
  const second = captureStandupSnapshot(first, "2026-08-18T09:00:00.000Z");
  assert.equal(second.lastStandupAt, "2026-08-18T09:00:00.000Z");
  assert.equal(second.standupComparisonSince, "2026-08-17T09:00:00.000Z");
  assert.equal(second.boardSnapshots?.length, 2);
});

test("stand-up sessions preserve attendance and link ticket activity", () => {
  const started = captureStandupSnapshot(
    activityVenture(),
    "2026-08-18T09:00:00.000Z",
    ["member-alex", "member-priya"],
  );
  const changed = appendTicketActivity(started, {
    id: "event-during-call",
    occurredAt: "2026-08-18T09:05:00.000Z",
    ticketId: "t1",
    ticketTitle: "Pricing interview",
    type: "moved",
    actor: "advisor",
    source: "ba_tool",
    summary: "Moved pricing interview to done",
  });
  assert.deepEqual(changed.standupSessions?.[0].participantIds, ["member-alex", "member-priya"]);
  assert.deepEqual(changed.standupSessions?.[0].activityEventIds, ["event-during-call"]);
});

test("external collaborators default to read-only stand-up access", () => {
  assert.deepEqual(defaultPermissionsForRole("external"), {
    canJoinStandup: true,
    canEditBoard: false,
    canAssignCards: false,
  });
  assert.equal(defaultPermissionsForRole("cofounder").canEditBoard, true);
});

test("legacy owner fields resolve to venture members while multi-assignment is preserved", () => {
  const venture = {
    ...activityVenture(),
    members: [
      { id: "owner", ventureId: "v1", email: "alex@example.com", name: "Alex", role: "owner", status: "active", canJoinStandup: true, canEditBoard: true, canAssignCards: true },
      { id: "priya", ventureId: "v1", email: "priya@example.com", name: "Priya", role: "member", status: "active", canJoinStandup: true, canEditBoard: true, canAssignCards: true },
    ],
  } as Venture;
  assert.equal(formatAssigneesForAdvisor(venture, { id: "one", title: "Legacy", category: "Feature", owner: "YOU" }), "Alex");
  assert.deepEqual(
    cardAssignees(venture, { id: "two", title: "Shared", category: "Feature", assigneeIds: ["owner", "priya"] }).map((item) => item.name),
    ["Alex", "Priya"],
  );
});

test("venture invitation tokens reject tampering and expiry", () => {
  const secret = "test-secret-that-is-at-least-thirty-two-characters";
  const payload = {
    invitationId: "invite-1",
    ventureId: "venture-1",
    ownerUserId: "owner-1",
    email: "priya@example.com",
    expiresAt: "2026-08-19T09:00:00.000Z",
  };
  const token = createVentureInviteToken(payload, secret);
  assert.equal(verifyVentureInviteToken(token, secret)?.email, payload.email);
  assert.equal(verifyVentureInviteToken(`${token}x`, secret), null);
  const expiredToken = createVentureInviteToken({ ...payload, expiresAt: "2000-01-01T00:00:00.000Z" }, secret);
  assert.equal(verifyVentureInviteToken(expiredToken, secret), null);
});

test("ticket proposals bind every mutation to the focused stable ticket ID", () => {
  const actions = bindActionsToFocusedTicket([
    { type: "update_ticket", cardTitle: "Ambiguous", priority: "High" },
    { type: "move_card", cardTitle: "Wrong title", toColumn: "today" },
  ], { id: "ticket-stable-1", title: "Correct ticket" });
  assert.deepEqual(actions.map((action) => [action.ticketId, action.cardTitle]), [
    ["ticket-stable-1", "Correct ticket"],
    ["ticket-stable-1", "Correct ticket"],
  ]);
});

test("ticket proposal summaries cover editable ticket details without executing them", () => {
  const venture = {
    ...activityVenture(),
    assumptions: [{ id: "a1", statement: "Teams need shared stand-ups", category: "Product", importance: "High", status: "Testing", dateAdded: "2026-08-18" }],
  } as Venture;
  const proposal = createPendingTicketProposal([{
    type: "update_ticket",
    priority: "High",
    dueDate: "2026-08-25",
    linkedAssumptionId: "a1",
    acceptanceCriteria: ["Invitee can join"],
  }], { id: "t1", title: "Team invitations" }, venture);
  assert.equal(proposal.ticketId, "t1");
  assert.equal(proposal.changes.some((change) => change.includes("priority")), true);
  assert.equal(proposal.changes.some((change) => change.includes("due date")), true);
  assert.equal(proposal.changes.some((change) => change.includes("Link assumption")), true);
  assert.equal(proposal.changes.some((change) => change.includes("acceptance")), true);
});

test("ticket proposal summaries cover blocked-reason edits, not just the other fields", () => {
  const venture = activityVenture();
  const settingReason = createPendingTicketProposal(
    [{ type: "update_ticket", blockedReason: "Waiting on API keys from the payment provider" }],
    { id: "t1", title: "Payment webhook" },
    venture,
  );
  assert.equal(
    settingReason.changes.some((change) => change.includes("blocked reason") && change.includes("payment provider")),
    true,
  );

  const clearingReason = createPendingTicketProposal(
    [{ type: "update_ticket", blockedReason: "" }],
    { id: "t1", title: "Payment webhook" },
    venture,
  );
  assert.equal(clearingReason.changes.some((change) => change.includes("Clear blocked reason")), true);
});

test("spoken confirmations and cancellations are intentionally narrow", () => {
  assert.equal(isProposalConfirmation("yes"), true);
  assert.equal(isProposalConfirmation("go ahead"), true);
  assert.equal(isProposalConfirmation("yes but change the title"), false);
  assert.equal(isProposalCancellation("leave it"), true);
  assert.equal(isProposalCancellation("no, use tomorrow instead"), false);
});

test("confirmed ticket updates write every collaborative field and append history", () => {
  const venture = {
    ...activityVenture(),
    assumptions: [{ id: "a1", statement: "Teams need shared stand-ups", category: "Product", importance: "High", status: "Testing", dateAdded: "2026-08-18" }],
    members: [{ id: "member-1", ventureId: "v1", email: "alex@example.com", name: "Alex", role: "owner", status: "active", canJoinStandup: true, canEditBoard: true, canAssignCards: true }],
    columns: {
      ...activityVenture().columns,
      in_progress: {
        name: "IN PROGRESS",
        items: [{ id: "t1", title: "Team invitations", description: "Old context", category: "Feature", priority: "Medium", owner: "YOU", checklists: [] }],
      },
    },
  } as Venture;
  const result = BAAgentService.executeTool("update_ticket", {
    ticketId: "t1",
    newTitle: "Invite venture collaborators",
    description: "Send and accept a secure venture invitation.",
    priority: "High",
    category: "Technical",
    assigneeIds: ["member-1"],
    dueDate: "2026-08-25",
    linkedAssumptionId: "a1",
    acceptanceCriteria: ["Invitee can accept a valid link"],
  }, venture, "ad_hoc_decision");
  assert.equal(result.success, true);
  const updated = result.updatedVenture?.columns.in_progress.items[0];
  assert.equal(updated?.title, "Invite venture collaborators");
  assert.equal(updated?.description, "Send and accept a secure venture invitation.");
  assert.equal(updated?.priority, "High");
  assert.equal(updated?.category, "Technical");
  assert.deepEqual(updated?.assigneeIds, ["member-1"]);
  assert.equal(updated?.dueDate, "2026-08-25");
  assert.equal(updated?.linkedAssumptionId, "a1");
  assert.equal(updated?.checklists?.[0].text, "Invitee can accept a valid link");
  assert.equal(result.updatedVenture?.ticketActivity?.at(-1)?.source, "ba_tool");
});

test("stand-up history classifies work completed since the previous stand-up", () => {
  const base = {
    ...activityVenture(),
    standupComparisonSince: "2026-08-17T09:00:00.000Z",
  };
  const withOldEvent = appendTicketActivity(base, {
    id: "old",
    occurredAt: "2026-08-17T08:00:00.000Z",
    ticketId: "t0",
    ticketTitle: "Old work",
    type: "updated",
    actor: "founder",
    source: "board",
    summary: "Updated old work",
  });
  const completed = appendTicketActivity(withOldEvent, {
    id: "done",
    occurredAt: "2026-08-17T12:00:00.000Z",
    ticketId: "t1",
    ticketTitle: "Customer interviews",
    type: "moved",
    actor: "founder",
    source: "board",
    summary: "Moved customer interviews to Done",
    fromColumn: "in_progress",
    toColumn: "done",
  });
  const summary = summarizeStandupHistory(completed, new Date("2026-08-18T09:00:00.000Z"));
  assert.equal(summary.events.length, 1);
  assert.equal(summary.completed[0].ticketId, "t1");
});

test("ticket change descriptions identify acceptance-criteria edits", () => {
  const changes = describeTicketChanges(
    { id: "t1", title: "Test", category: "Feature", checklists: [] },
    { id: "t1", title: "Test", category: "Feature", checklists: [{ id: "c1", text: "Returns 200", done: false }] },
  );
  assert.deepEqual(changes, ["acceptance criteria"]);
});
