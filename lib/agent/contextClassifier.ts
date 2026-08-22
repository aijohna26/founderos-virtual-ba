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

// Review follow-up (docs/founderally-rag-requested-changes.md P1 #5 "Improve Retrieval
// Gating"): a bare boolean collapsed "definitely don't bother" and "might help, might not"
// into the same "attempt retrieval" bucket, always searching at the same similarity bar
// either way. Three tiers let those two cases behave differently without becoming
// aggressively restrictive (the doc's own instruction): `skip` never searches at all;
// `optional` still searches (cheap -- one embedding call + one DB query, nowhere near the
// cost of a second full model call) but only injects evidence that clears a *higher*
// similarity bar, so a marginal/coincidental match doesn't bloat the prompt for a question
// that's really about board/sprint state anyway; `required` searches at the normal, more
// generous bar since the question clearly reads as needing company evidence.
export type DocumentRetrievalTier = "skip" | "optional" | "required";

export interface ContextClassification {
  categories: ReadonlySet<ContextCategory>;
  documentRetrieval: DocumentRetrievalTier;
}

interface CategoryRule {
  category: ContextCategory;
  pattern: RegExp;
}

// Kept separate from CATEGORY_RULES on purpose: "is this purely a board/ticket operation"
// (the skip boundary) is a different question from "which context categories does this
// message touch" (the general taxonomy), and conflating them made real gaps easy to miss --
// e.g. "Assign this to Priya" reads as team_member in the taxonomy, not board_ticket, so a
// tier derived from categories alone would have searched for it even though it's exactly the
// skip case #5's own examples name. Anchored on the actual operation (move/close/assign/...),
// not just the presence of the word "ticket", so it catches assignment commands too.
const BOARD_OPERATION_PATTERN =
  /\b(move|close|open|create|update|delete|mark)\b.{0,60}\b(ticket|card|to (done|today|backlog|in progress|blocked))\b|\bclose (the )?(modal|card|ticket|view|it)\b|\bassign\b.{0,40}\bto\b|\bwhat (cards?|tickets?)\b.{0,20}\bblock/i;

// Categories whose presence signals a genuine research/strategy/evidence question -- #5's
// "required" tier. Deliberately includes full_business_synthesis alongside the more obviously
// document-flavored categories: #5's own "Should we target agencies or accountants?" example
// only matches full_business_synthesis (no literal "customer"/"document" wording), and it's
// listed as Required, not Optional.
const REQUIRED_EVIDENCE_CATEGORIES = new Set<ContextCategory>([
  "documents",
  "customer_research",
  "previous_decisions",
  "full_business_synthesis",
]);

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
    pattern: /\b(customer|user)s?\b.{0,30}\b(sa(id|ys?|ying)|told|feedback|interview(s|ed)?|research|wants?|needs?)|\b(target (customer|segment|market)|which (customers?|segment))\b/i,
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

  const documentRetrieval: DocumentRetrievalTier =
    trimmed.length < 12 || BOARD_OPERATION_PATTERN.test(trimmed)
      ? "skip"
      : [...categories].some((category) => REQUIRED_EVIDENCE_CATEGORIES.has(category))
        ? "required"
        : "optional";

  return { categories, documentRetrieval };
}
