"use client";

import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";
import { CommitmentStore, FounderCommitment, LearningPattern } from "@/lib/store/commitmentStore";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import { mergeTicketCriteria } from "@/lib/agent/ticketCriteria";
import { formatInProgressAge, getInProgressAgeDays, transitionTicketStatus } from "@/lib/agent/ticketAging";
import { appendTicketActivity, describeTicketChanges, getTicketActivity, summarizeStandupHistory } from "@/lib/agent/ticketActivity";
import { formatAssigneesForAdvisor, memberDisplayName } from "@/lib/venture/members";

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  message: string;
  data?: Record<string, any>;
  updatedVenture?: Venture;
}

export class BAAgentService {
  // Execute any of the 7 formal MVP tools authoritatively
  static executeTool(
    toolName: string,
    args: Record<string, any>,
    venture: Venture,
    ceremony: "daily_standup" | "sprint_planning" | "retrospective" | "ad_hoc_decision" = "daily_standup"
  ): ToolExecutionResult {
    const startTime = Date.now();
    let result: ToolExecutionResult = {
      toolName,
      success: false,
      message: "Unknown tool",
    };

    let updatedVenture: Venture = { ...venture };
    let currentColumns = { ...venture.columns };

    const getColItems = (col: any): KanbanCard[] => {
      if (!col) return [];
      if (Array.isArray(col)) return col;
      if (Array.isArray(col.items)) return col.items;
      return [];
    };

    const makeCriterionId = (index: number) =>
      `chk-ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 5)}`;

    try {
      switch (toolName) {
        // 1. get_sprint_context
        case "get_sprint_context": {
          const backlog = getColItems(currentColumns.backlog);
          const today = getColItems(currentColumns.today);
          const inProgress = getColItems(currentColumns.in_progress);
          const done = getColItems(currentColumns.done);
          const blocked = getColItems(currentColumns.blocked);
          const commitments = CommitmentStore.getOutstandingCommitments(venture.id);
          const learnings = CommitmentStore.getLearnings(venture.id);
          const recentHistory = summarizeStandupHistory(venture);

          result = {
            toolName,
            success: true,
            message: "Sprint context retrieved successfully",
            data: {
              ventureName: venture.name,
              sprintNumber: venture.currentSprint || 1,
              sprintGoal: venture.problemStatement || "Customer validation",
              stage: venture.stage,
              backlog: backlog.map((c) => ({ id: c.id, title: c.title, priority: c.priority })),
              today: today.map((c) => ({ id: c.id, title: c.title, priority: c.priority })),
              inProgress: inProgress.map((c) => {
                const ageDays = getInProgressAgeDays(c);
                return {
                  id: c.id,
                  title: c.title,
                  priority: c.priority,
                  inProgressSince: c.inProgressSince,
                  inProgressDays: ageDays,
                  inProgressAgeLabel: formatInProgressAge(ageDays),
                  ageIsApproximate: Boolean(c.inProgressSinceInferred),
                };
              }),
              done: done.map((c) => ({ id: c.id, title: c.title })),
              blocked: blocked.map((c) => ({ id: c.id, title: c.title, priority: c.priority })),
              outstandingCommitments: commitments.map((c) => c.commitment),
              learnings: learnings.map((l) => l.pattern),
              historySince: recentHistory.since,
              recentTicketActivity: recentHistory.events.slice(-20),
              completedSinceLastStandup: recentHistory.completed.map((event) => event.ticketTitle),
              startedSinceLastStandup: recentHistory.started.map((event) => event.ticketTitle),
              ventureMembers: (venture.members || []).filter((member) => member.status !== "removed").map((member) => ({
                id: member.id,
                name: memberDisplayName(member),
                role: member.role,
                status: member.status,
                canJoinStandup: member.canJoinStandup,
              })),
            },
          };
          break;
        }

        // 2. get_ticket
        case "get_ticket": {
          const ticketId = args.ticketId || args.id;
          const cardTitle = args.cardTitle || args.title;
          let foundCard: KanbanCard | null = null;
          let columnFound: string = "";

          const matches: Array<{ card: KanbanCard; column: keyof Venture["columns"] }> = [];
          for (const colKey of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            const items = getColItems(currentColumns[colKey]);
            for (const card of items) {
              if ((ticketId && card.id === ticketId) || (cardTitle && card.title.toLowerCase().includes(cardTitle.toLowerCase()))) {
                matches.push({ card, column: colKey });
              }
            }
          }
          if (matches.length === 1) {
            foundCard = matches[0].card;
            columnFound = matches[0].column;
          }

          if (foundCard) {
            const acceptanceCriteria = foundCard.checklists || [];
            const completedCriteria = acceptanceCriteria.filter((criterion) => criterion.done).length;
            const inProgressDays = columnFound === "in_progress" ? getInProgressAgeDays(foundCard) : null;
            result = {
              toolName,
              success: true,
              message: `Ticket found in column ${columnFound}`,
              data: {
                id: foundCard.id,
                title: foundCard.title,
                category: foundCard.category,
                priority: foundCard.priority,
                owner: foundCard.owner,
                assigneeIds: foundCard.assigneeIds || [],
                assignees: formatAssigneesForAdvisor(venture, foundCard),
                column: columnFound,
                description: foundCard.description || "No extended description",
                acceptanceCriteria: acceptanceCriteria.map((criterion) => ({
                  id: criterion.id,
                  text: criterion.text,
                  done: criterion.done,
                })),
                acceptanceCriteriaProgress: {
                  completed: completedCriteria,
                  total: acceptanceCriteria.length,
                  percent: acceptanceCriteria.length > 0
                    ? Math.round((completedCriteria / acceptanceCriteria.length) * 100)
                    : 0,
                },
                dueDate: foundCard.dueDate || null,
                linkedAssumptionId: foundCard.linkedAssumptionId || null,
                inProgressSince: foundCard.inProgressSince || null,
                inProgressDays,
                inProgressAgeLabel: formatInProgressAge(inProgressDays),
                ageIsApproximate: Boolean(foundCard.inProgressSinceInferred),
                lastInProgressDurationDays: foundCard.lastInProgressDurationDays ?? null,
                recentActivity: getTicketActivity(venture, foundCard.id).slice(0, 12),
              },
            };
          } else if (matches.length > 1) {
            result = {
              toolName,
              success: false,
              message: `Ticket reference "${ticketId || cardTitle}" is ambiguous; use a stable ticket ID.`,
              data: { matches: matches.map(({ card, column }) => ({ id: card.id, title: card.title, column })) },
            };
          } else {
            result = {
              toolName,
              success: false,
              message: `Ticket "${ticketId || cardTitle}" not found on board`,
            };
          }
          break;
        }

        // UI-only: closes the ticket detail modal the founder was just looking at. Doesn't
        // touch the venture at all -- distinct from move_ticket, which is the tool that
        // actually changes a ticket's status/column. Named deliberately unlike anything a
        // founder would mean by "close the ticket" (mark it done/closed), which stays
        // move_ticket's job; this only closes the on-screen detail view.
        case "close_ticket_view": {
          result = {
            toolName,
            success: true,
            message: "Closed the ticket detail view.",
          };
          break;
        }

        // 3. create_ticket
        case "create_ticket":
        case "create_card": {
          const title = args.title;
          if (!title || typeof title !== "string") {
            result = { toolName, success: false, message: "Ticket title is required" };
            break;
          }

          const targetCol = (args.column || args.status || "today") as keyof Venture["columns"];
          const validCol: keyof Venture["columns"] = [
            "backlog",
            "today",
            "in_progress",
            "done",
            "blocked",
          ].includes(targetCol)
            ? targetCol
            : "today";

          const now = new Date().toISOString();
          const baseCard: KanbanCard = {
            id: "t-" + Date.now() + Math.random().toString(36).substr(2, 4),
            title: title.trim(),
            description: args.description || args.reason || "",
            category: args.category || "Feature",
            priority: args.priority || "High",
            owner: args.owner || "YOU",
            assigneeIds: Array.isArray(args.assigneeIds)
              ? args.assigneeIds
              : [venture.members?.find((member) => member.role === "owner")?.id || `${venture.id}:owner`],
            checklists: mergeTicketCriteria([], args.acceptanceCriteria, "replace", [], makeCriterionId),
            createdAt: now,
            statusChangedAt: now,
            blockedReason: validCol === "blocked" && typeof args.blockedReason === "string"
              ? args.blockedReason.trim() || undefined
              : undefined,
          };
          const newCard = validCol === "in_progress"
            ? transitionTicketStatus(baseCard, "today", "in_progress", now)
            : baseCard;

          const existing = getColItems(currentColumns[validCol]);
          currentColumns = {
            ...currentColumns,
            [validCol]: {
              name: validCol.toUpperCase().replace("_", " "),
              items: [...existing, newCard],
            },
          };

          updatedVenture = appendTicketActivity({ ...venture, columns: currentColumns }, {
            ticketId: newCard.id,
            ticketTitle: newCard.title,
            type: "created",
            actor: "advisor",
            source: "ba_tool",
            summary: `Created "${newCard.title}" in ${currentColumns[validCol].name}`,
            toColumn: validCol,
          });
          VentureStore.updateVenture(updatedVenture);

          result = {
            toolName,
            success: true,
            message: `Created ticket "${newCard.title}" in column ${validCol.toUpperCase()}`,
            data: { ticketId: newCard.id, title: newCard.title, column: validCol },
            updatedVenture,
          };
          break;
        }

        // 4. update_ticket
        case "update_ticket": {
          const ticketId = args.ticketId || args.id;
          const cardTitle = args.cardTitle || args.title;
          const matches: Array<{ card: KanbanCard; column: keyof Venture["columns"] }> = [];
          for (const colKey of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            for (const candidate of getColItems(currentColumns[colKey])) {
              const exactId = ticketId && candidate.id === ticketId;
              const titleMatch = cardTitle && candidate.title.toLowerCase().includes(String(cardTitle).toLowerCase());
              if (exactId || titleMatch) matches.push({ card: candidate, column: colKey });
            }
          }

          if (matches.length === 1) {
            const { card: matchedCard, column } = matches[0];
            const nextCriteria = mergeTicketCriteria(
              matchedCard.checklists || [],
              args.acceptanceCriteria,
              args.acceptanceCriteriaMode === "replace" ? "replace" : "append",
              args.checklistUpdates,
              makeCriterionId,
            );
            const completedCriteria = nextCriteria.filter((criterion) => criterion.done).length;
            const updatedCard: KanbanCard = {
              ...matchedCard,
              title: args.newTitle || matchedCard.title,
              description: args.description !== undefined ? args.description : matchedCard.description,
              priority: args.priority || matchedCard.priority,
              category: args.category || matchedCard.category,
              assigneeIds: Array.isArray(args.assigneeIds) ? args.assigneeIds : matchedCard.assigneeIds,
              dueDate: args.dueDate !== undefined ? (args.dueDate || undefined) : matchedCard.dueDate,
              linkedAssumptionId: args.linkedAssumptionId !== undefined
                ? (args.linkedAssumptionId || undefined)
                : matchedCard.linkedAssumptionId,
              blockedReason: column === "blocked"
                ? (args.blockedReason !== undefined ? (args.blockedReason || undefined) : matchedCard.blockedReason)
                : matchedCard.blockedReason,
              checklists: nextCriteria,
              progress: nextCriteria.length > 0 ? Math.round((completedCriteria / nextCriteria.length) * 100) : matchedCard.progress,
            };
            const changes = describeTicketChanges(matchedCard, updatedCard);
            currentColumns = {
              ...currentColumns,
              [column]: {
                ...currentColumns[column],
                items: getColItems(currentColumns[column]).map((candidate) =>
                  candidate.id === matchedCard.id ? updatedCard : candidate
                ),
              },
            };
            updatedVenture = changes.length > 0
              ? appendTicketActivity({ ...venture, columns: currentColumns }, {
                  ticketId: updatedCard.id,
                  ticketTitle: updatedCard.title,
                  type: changes.includes("acceptance criteria") ? "criteria_updated" : "updated",
                  actor: "advisor",
                  source: "ba_tool",
                  summary: `Updated ${changes.join(", ")} on "${updatedCard.title}"`,
                  changes,
                })
              : { ...venture, columns: currentColumns };
            VentureStore.updateVenture(updatedVenture);
            result = {
              toolName,
              success: true,
              message: changes.length > 0
                ? `Updated ${changes.join(", ")} on "${updatedCard.title}"`
                : `No changes were needed on "${updatedCard.title}"`,
              data: {
                ticketId: updatedCard.id,
                title: updatedCard.title,
                description: updatedCard.description || "",
                acceptanceCriteria: nextCriteria,
                assigneeIds: updatedCard.assigneeIds || [],
                dueDate: updatedCard.dueDate || null,
                linkedAssumptionId: updatedCard.linkedAssumptionId || null,
                column,
              },
              updatedVenture,
            };
          } else if (matches.length > 1) {
            result = {
              toolName,
              success: false,
              message: `Ticket reference "${ticketId || cardTitle}" is ambiguous; use a stable ticket ID.`,
              data: { matches: matches.map(({ card, column }) => ({ id: card.id, title: card.title, column })) },
            };
          } else {
            result = {
              toolName,
              success: false,
              message: `Could not find ticket "${cardTitle || ticketId}" to update`,
            };
          }
          break;
        }

        // 5. move_ticket
        case "move_ticket":
        case "move_card": {
          const ticketId = args.ticketId || args.id;
          const cardTitle = args.cardTitle || args.title;
          const toColRaw = (args.toColumn || args.column || "done") as keyof Venture["columns"];
          const toCol: keyof Venture["columns"] = [
            "backlog",
            "today",
            "in_progress",
            "done",
            "blocked",
          ].includes(toColRaw)
            ? toColRaw
            : "done";

          const matches: Array<{ card: KanbanCard; column: keyof Venture["columns"] }> = [];

          for (const colName of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            const items = getColItems(currentColumns[colName]);
            for (const card of items) {
              const exactId = ticketId && card.id === ticketId;
              const titleMatch = cardTitle && card.title.toLowerCase().includes(cardTitle.toLowerCase());
              if (exactId || titleMatch) matches.push({ card, column: colName });
            }
          }

          const uniqueMatch = matches.length === 1 ? matches[0] : null;
          const foundCard = uniqueMatch?.card || null;
          const fromCol = uniqueMatch?.column || null;

          if (foundCard && fromCol && fromCol !== toCol) {
            const updatedFrom = getColItems(currentColumns[fromCol]).filter(
              (c) => c.id !== foundCard!.id
            );
            const transitionedCard = transitionTicketStatus(foundCard, fromCol, toCol, undefined, {
              blockedReason: typeof args.blockedReason === "string" ? args.blockedReason : undefined,
            });
            const updatedTo = [
              ...getColItems(currentColumns[toCol]),
              { ...transitionedCard, completed: toCol === "done" },
            ];

            currentColumns = {
              ...currentColumns,
              [fromCol]: { ...currentColumns[fromCol], items: updatedFrom },
              [toCol]: { ...currentColumns[toCol], items: updatedTo },
            };

            updatedVenture = appendTicketActivity({ ...venture, columns: currentColumns }, {
              ticketId: transitionedCard.id,
              ticketTitle: transitionedCard.title,
              type: "moved",
              actor: "advisor",
              source: "ba_tool",
              summary: toCol === "blocked" && transitionedCard.blockedReason
                ? `Moved "${transitionedCard.title}" from ${currentColumns[fromCol].name} to ${currentColumns[toCol].name}: ${transitionedCard.blockedReason}`
                : `Moved "${transitionedCard.title}" from ${currentColumns[fromCol].name} to ${currentColumns[toCol].name}`,
              fromColumn: fromCol,
              toColumn: toCol,
            });
            VentureStore.updateVenture(updatedVenture);

            result = {
              toolName,
              success: true,
              message: toCol === "blocked" && !transitionedCard.blockedReason
                ? `Moved ticket "${foundCard.title}" from ${fromCol.toUpperCase()} to ${toCol.toUpperCase()}. Ask why it's blocked and call this tool again with blockedReason so it's recorded.`
                : `Moved ticket "${foundCard.title}" from ${fromCol.toUpperCase()} to ${toCol.toUpperCase()}`,
              data: {
                ticketId: foundCard.id,
                cardTitle: foundCard.title,
                fromColumn: fromCol,
                toColumn: toCol,
                blockedReason: transitionedCard.blockedReason || null,
                inProgressSince: transitionedCard.inProgressSince || null,
                inProgressDays: toCol === "in_progress" ? getInProgressAgeDays(transitionedCard) : null,
              },
              updatedVenture,
            };
          } else if (foundCard && fromCol === toCol) {
            result = {
              toolName,
              success: true,
              message: `Ticket "${foundCard.title}" is already in ${toCol.toUpperCase()}`,
            };
          } else if (matches.length > 1) {
            result = {
              toolName,
              success: false,
              message: `Ticket reference "${ticketId || cardTitle}" is ambiguous; use a stable ticket ID.`,
              data: { matches: matches.map(({ card, column }) => ({ id: card.id, title: card.title, column })) },
            };
          } else {
            result = {
              toolName,
              success: false,
              message: `Could not find ticket matching "${ticketId || cardTitle}" to move to ${toCol.toUpperCase()}`,
            };
          }
          break;
        }

        // 6. record_commitment
        case "record_commitment": {
          const commitmentText = args.commitment || args.text;
          if (!commitmentText) {
            result = { toolName, success: false, message: "Commitment text is required" };
            break;
          }

          const commitment = CommitmentStore.recordCommitment(
            venture.id,
            commitmentText,
            args.deadline,
            args.relatedTicketId
          );

          updatedVenture = {
            ...venture,
            standupSessions: (venture.standupSessions || []).map((session) =>
              session.status === "active"
                ? { ...session, commitmentIds: [...new Set([...session.commitmentIds, commitment.id])] }
                : session
            ),
          };
          VentureStore.updateVenture(updatedVenture);

          result = {
            toolName,
            success: true,
            message: `Recorded daily commitment: "${commitment.commitment}"`,
            data: { id: commitment.id, commitment: commitment.commitment, deadline: commitment.deadline },
            updatedVenture,
          };
          break;
        }

        // 7. record_learning
        case "record_learning": {
          const pattern = args.pattern || args.learning || args.insight;
          if (!pattern) {
            result = { toolName, success: false, message: "Learning pattern text is required" };
            break;
          }

          const learning = CommitmentStore.recordLearning(
            venture.id,
            pattern,
            args.evidence || "Observed during sprint execution",
            args.suggestedCoachingBehavior || "Prioritize validation"
          );

          result = {
            toolName,
            success: true,
            message: `Stored retrospective learning: "${learning.pattern}"`,
            data: { id: learning.id, pattern: learning.pattern },
          };
          break;
        }

        default:
          result = { toolName, success: false, message: `Tool ${toolName} not supported` };
      }
    } catch (err: any) {
      result = {
        toolName,
        success: false,
        message: err.message || "Failed executing tool",
      };
    }

    const latencyMs = Math.max(1, Date.now() - startTime);

    // Log operation for auditable verification
    AIOperationsLogger.logOperation({
      ventureId: venture.id,
      ceremony,
      geminiModel: GEMINI_CONFIG.TEXT_MODEL,
      toolRequested: toolName,
      toolArguments: args,
      toolResult: result,
      reasoningCategory:
        toolName === "record_commitment"
          ? "accountability"
          : toolName === "record_learning"
          ? "de_risking"
          : "board_mutation",
      latencyMs,
      success: result.success,
    });

    return result;
  }
}
