/**
 * Minimal heuristic gate deciding whether a founder's message is worth attempting
 * company-knowledge retrieval for at all -- P1 #8's "avoid unnecessary RAG" in its narrowest,
 * cheapest form. This is deliberately NOT the real context classifier/router (P1 #11-13,
 * "Determine what information a request actually requires before assembling the AI context")
 * -- it exists only so an obvious board command ("move ticket 43 to done") doesn't spend an
 * embedding call and a DB round trip on retrieval that could never be relevant. #11 should
 * replace this outright once built, not extend it.
 *
 * Deliberately conservative in one direction only: false positives (attempting retrieval when
 * it turns out nothing relevant exists) are cheap -- match_document_chunks' own similarity
 * threshold already returns zero results for genuinely irrelevant queries. False negatives
 * (skipping retrieval when company evidence actually would have helped) are the real risk, so
 * this only excludes messages that clearly don't need it, rather than trying to positively
 * identify which ones do.
 */
export function shouldAttemptCompanyKnowledgeRetrieval(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 12) return false; // too short to be a real research/strategy question

  // Board/ticket operations have their own authoritative tools (get_ticket, create_ticket,
  // move_ticket, close_ticket_view, ...) and gain nothing from company-document evidence --
  // skip retrieval for those even though they're long enough to otherwise pass.
  const boardCommandPattern =
    /\b(move|close|open|create|update|assign|delete)\b.{0,40}\bticket\b|\bticket\b.{0,40}\b(done|blocked|backlog|today|in progress)\b|\bclose (the )?(modal|card|ticket|view)\b/i;
  if (boardCommandPattern.test(trimmed)) return false;

  return true;
}
