export interface TicketCriterion {
  id: string;
  text: string;
  done: boolean;
}

export interface TicketCriterionUpdate {
  id?: string;
  text?: string;
  done?: boolean;
}

export function mergeTicketCriteria(
  existing: TicketCriterion[],
  incoming: unknown,
  mode: "append" | "replace" = "append",
  updates: unknown = [],
  createId: (index: number) => string = (index) => `criterion-${Date.now()}-${index}`,
): TicketCriterion[] {
  const additions = Array.isArray(incoming)
    ? incoming
        .filter((criterion): criterion is string => typeof criterion === "string" && criterion.trim().length > 0)
        .map((criterion, index) => ({ id: createId(index), text: criterion.trim(), done: false }))
    : [];

  let merged = additions.length > 0 && mode === "replace"
    ? additions
    : [
        ...existing,
        ...additions.filter((addition) =>
          !existing.some((criterion) => criterion.text.toLowerCase() === addition.text.toLowerCase())
        ),
      ];

  if (Array.isArray(updates)) {
    merged = merged.map((criterion) => {
      const change = (updates as TicketCriterionUpdate[]).find((update) =>
        update.id === criterion.id ||
        (!update.id && typeof update.text === "string" && update.text.toLowerCase() === criterion.text.toLowerCase())
      );
      if (!change) return criterion;
      return {
        ...criterion,
        text: typeof change.text === "string" && change.text.trim() ? change.text.trim() : criterion.text,
        done: typeof change.done === "boolean" ? change.done : criterion.done,
      };
    });
  }

  return merged;
}
