"use client";

import { Venture, VentureStore, KanbanCard } from "@/lib/store/ventureStore";
import { CommitmentStore, FounderCommitment, LearningPattern } from "@/lib/store/commitmentStore";
import { AIOperationsLogger } from "@/lib/agent/aiOperationsLog";

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
              inProgress: inProgress.map((c) => ({ id: c.id, title: c.title, priority: c.priority })),
              done: done.map((c) => ({ id: c.id, title: c.title })),
              blocked: blocked.map((c) => ({ id: c.id, title: c.title, priority: c.priority })),
              outstandingCommitments: commitments.map((c) => c.commitment),
              learnings: learnings.map((l) => l.pattern),
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

          for (const colKey of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            const items = getColItems(currentColumns[colKey]);
            const match = items.find(
              (c) =>
                (ticketId && c.id === ticketId) ||
                (cardTitle && c.title.toLowerCase().includes(cardTitle.toLowerCase()))
            );
            if (match) {
              foundCard = match;
              columnFound = colKey;
              break;
            }
          }

          if (foundCard) {
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
                column: columnFound,
                description: foundCard.description || "No extended description",
              },
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

          const newCard: KanbanCard = {
            id: "t-" + Date.now() + Math.random().toString(36).substr(2, 4),
            title: title.trim(),
            description: args.description || args.reason || "",
            category: args.category || "Feature",
            priority: args.priority || "High",
            owner: args.owner || "YOU",
          };

          const existing = getColItems(currentColumns[validCol]);
          currentColumns = {
            ...currentColumns,
            [validCol]: {
              name: validCol.toUpperCase().replace("_", " "),
              items: [...existing, newCard],
            },
          };

          updatedVenture = { ...venture, columns: currentColumns };
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
          let updated = false;

          for (const colKey of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            const items = getColItems(currentColumns[colKey]);
            const nextItems = items.map((c) => {
              if (
                (ticketId && c.id === ticketId) ||
                (cardTitle && c.title.toLowerCase().includes(cardTitle.toLowerCase()))
              ) {
                updated = true;
                return {
                  ...c,
                  title: args.newTitle || c.title,
                  description: args.description !== undefined ? args.description : c.description,
                  priority: args.priority || c.priority,
                  category: args.category || c.category,
                };
              }
              return c;
            });

            if (updated) {
              currentColumns = {
                ...currentColumns,
                [colKey]: { ...currentColumns[colKey], items: nextItems },
              };
              break;
            }
          }

          if (updated) {
            updatedVenture = { ...venture, columns: currentColumns };
            VentureStore.updateVenture(updatedVenture);
            result = {
              toolName,
              success: true,
              message: `Updated ticket "${cardTitle || ticketId}"`,
              updatedVenture,
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
          const cardTitle = args.cardTitle || args.title || args.ticketId;
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

          let foundCard: KanbanCard | null = null;
          let fromCol: keyof Venture["columns"] | null = null;

          for (const colName of Object.keys(currentColumns) as (keyof Venture["columns"])[]) {
            const items = getColItems(currentColumns[colName]);
            const match = items.find((c) =>
              c.title.toLowerCase().includes((cardTitle || "").toLowerCase().slice(0, 10))
            );
            if (match) {
              foundCard = match;
              fromCol = colName;
              break;
            }
          }

          if (foundCard && fromCol && fromCol !== toCol) {
            const updatedFrom = getColItems(currentColumns[fromCol]).filter(
              (c) => c.id !== foundCard!.id
            );
            const updatedTo = [
              ...getColItems(currentColumns[toCol]),
              { ...foundCard, completed: toCol === "done" },
            ];

            currentColumns = {
              ...currentColumns,
              [fromCol]: { ...currentColumns[fromCol], items: updatedFrom },
              [toCol]: { ...currentColumns[toCol], items: updatedTo },
            };

            updatedVenture = { ...venture, columns: currentColumns };
            VentureStore.updateVenture(updatedVenture);

            result = {
              toolName,
              success: true,
              message: `Moved ticket "${foundCard.title}" from ${fromCol.toUpperCase()} to ${toCol.toUpperCase()}`,
              data: {
                ticketId: foundCard.id,
                cardTitle: foundCard.title,
                fromColumn: fromCol,
                toColumn: toCol,
              },
              updatedVenture,
            };
          } else if (foundCard && fromCol === toCol) {
            result = {
              toolName,
              success: true,
              message: `Ticket "${foundCard.title}" is already in ${toCol.toUpperCase()}`,
            };
          } else {
            result = {
              toolName,
              success: false,
              message: `Could not find ticket matching "${cardTitle}" to move to ${toCol.toUpperCase()}`,
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

          result = {
            toolName,
            success: true,
            message: `Recorded daily commitment: "${commitment.commitment}"`,
            data: { id: commitment.id, commitment: commitment.commitment, deadline: commitment.deadline },
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

    const latencyMs = Date.now() - startTime;

    // Log operation for auditable verification
    AIOperationsLogger.logOperation({
      ventureId: venture.id,
      ceremony,
      geminiModel: "gemini-2.5-flash",
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
