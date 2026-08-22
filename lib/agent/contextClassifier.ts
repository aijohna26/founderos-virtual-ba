/**
 * P1 #11/#12 (docs/founderally-updated-todo.md): the real context classifier/router, replacing
 * the placeholder gate lib/rag/retrievalGate.ts shipped with #8 ("should be replaced outright
 * once built" -- see its own comment). Determines which categories of context a message
 * actually needs before the AI context gets assembled, per #12's list.
 *
 * Scope note: most of #12's categories (board_ticket, current_sprint, commitments,
 * team_member, recent_activity, learnings, previous_decisions) are already cheap, in-memory
 * data this app has loaded regardless -- assembling them is string formatting, not a network
 * call, and they stay unconditionally included in both app/api/ai-analyst/route.ts and
 * lib/agent/geminiLiveConfig.ts. This classifier's actual behavioral effect today is narrower
 * and deliberate: it only gates `documents`/`customer_research`, since that's the one category
 * with a real marginal cost (an embedding API call plus a DB round trip, via
 * lib/rag/companyKnowledgeContext.ts). Categorizing the rest is still worth doing --
 * documented intent for #12, and a foundation for actually trimming prompt sections later if
 * token cost or answer focus ever justifies that risk -- but this file does not attempt that
 * trim yet. Trimming the cheap categories is a real quality-regression risk (an under-included
 * section can make Sarah lose track of context she needed) for an uncertain token-cost payoff,
 * so it's left for a deliberate follow-up, not bundled in here silently.
 */

export type ContextCategory =
  | "board_ticket"
  | "current_sprint"
  | "commitments"
  | "team_member"
  | "recent_activity"
  | "learnings"
  | "documents"
  | "previous_decisions"
  | "customer_research"
  | "full_business_synthesis";

export interface ContextClassification {
  categories: ReadonlySet<ContextCategory>;
  /** True when `documents` or `customer_research` applies -- the one category actually gated. */
  needsDocumentRetrieval: boolean;
}

interface CategoryRule {
  category: ContextCategory;
  pattern: RegExp;
}

// Deliberately conservative in one direction only, same principle as retrievalGate.ts before
// it: false positives (classifying a category as needed when it turns out not to matter) are
// cheap for every category that's just formatting already-loaded data, and even for
// documents/customer_research the downstream similarity threshold still filters out
// irrelevant matches. False negatives (missing a category the question actually needed) are
// the real risk, so each rule is written broad -- a keyword match, not a strict grammar.
const CATEGORY_RULES: CategoryRule[] = [
  {
    // Includes modal/detail view/"close it" phrasing -- close_ticket_view's own trigger
    // phrases ("close the ticket, the modal, the card, or the detail view") -- so that UI
    // operation classifies as board_ticket too, not as an unclassified message.
    category: "board_ticket",
    pattern: /\b(ticket|card|board|backlog|kanban|block(ed|er|ing)?|modal|detail view)\b|\bclose it\b/i,
  },
  { category: "current_sprint", pattern: /\b(sprint|this week'?s? goal|sprint goal|on track|off track)\b/i },
  { category: "commitments", pattern: /\b(commit(ment|ted)?|promise[ds]?|follow(ed)? up|accountab)/i },
  { category: "team_member", pattern: /\b(team|who('s| is)|assign(ed|ee)?|@\w+)\b/i },
  { category: "recent_activity", pattern: /\b(since (yesterday|last|the last)|recent(ly)?|what('s| has) changed|progress)\b/i },
  { category: "learnings", pattern: /\b(pattern|learn(ed|ing)?|behavio(u)?r|coach(ing)?|habit)\b/i },
  {
    category: "documents",
    pattern: /\b(document|doc|prd|spec(ification)?|meeting notes?|market research)\b/i,
  },
  { category: "previous_decisions", pattern: /\b(decide[ds]?|decision|why did we|agreed to)\b/i },
  {
    category: "customer_research",
    pattern: /\b(customer|user)s?\b.{0,30}\b(said|told|feedback|interview|research|want|need)|\b(target (customer|segment|market)|which (customers?|segment))\b/i,
  },
  {
    category: "full_business_synthesis",
    pattern: /\b(strategy|overall|holistic|business model|pivot|should we (target|focus|build|pursue)|prioriti[sz]e)\b/i,
  },
];

/** Categorizes a founder's message per #12's list. Pure and synchronous -- no model call. */
export function classifyContextNeeds(message: string): ContextClassification {
  const trimmed = message.trim();
  const categories = new Set<ContextCategory>();

  if (trimmed.length > 0) {
    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(trimmed)) categories.add(rule.category);
    }
  }

  // needsDocumentRetrieval is intentionally *not* "only when the documents/customer_research
  // category matched" -- that would be exactly the narrow-positive-match design this file's
  // header warns against (it would, for example, miss #13's own "Should we target agencies or
  // accountants?" example, which reads as full_business_synthesis, not customer_research, but
  // clearly still benefits from retrieval). Instead: attempt retrieval for anything that isn't
  // long-enough-to-be-real AND clearly reads as *only* a board/ticket operation with no other
  // signal present -- i.e. the same permissive exclusion lib/rag/retrievalGate.ts used, now
  // expressed through the fuller category taxonomy instead of its own separate pattern list.
  const isPureBoardCommand = categories.has("board_ticket") && categories.size === 1;
  const needsDocumentRetrieval = trimmed.length >= 12 && !isPureBoardCommand;

  return { categories, needsDocumentRetrieval };
}
