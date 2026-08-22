/**
 * Detects a natural conversational sign-off in a completed Live turn, so the session can end
 * itself instead of sitting in "Listening..." indefinitely after Sarah has already said
 * goodbye. Deliberately narrow and phrase-based (not a semantic/model judgment) -- this only
 * ever *arms* an auto-disconnect (see geminiLiveService.ts's scheduleClosingDisconnect), it
 * never disconnects immediately, and any further founder speech before the grace period
 * elapses cancels it. That asymmetry is what makes a loose pattern list safe here: a false
 * positive costs nothing (the founder just keeps talking and the call carries on), a false
 * negative is the actual bug being fixed (a finished call left running until idle-timeout or
 * a manual hang-up).
 */
const CLOSING_CUE_PATTERNS: RegExp[] = [
  /\btalk (to you |to ya )?(again )?(tomorrow|later|soon|next time|next week)\b/i,
  /\b(have|hope you have) an? (great|good|nice|productive) (day|one|rest of your day|week)\b/i,
  /\bgoodbye\b/i,
  /\bbye( for now| now)?\b/i,
  /\bsee you (tomorrow|at|next|soon|later)\b/i,
  /\bthat'?s (it|all|everything) for (today|now)\b/i,
  /\bwe'?re (all )?(done|wrapped up|good|set) for (today|now)\b/i,
  /\b(catch|talk to) you (later|tomorrow|soon)\b/i,
  /\bi'?ll (let you go|talk to you (later|soon))\b/i,
  /\bsigning off\b/i,
  /\b(great|good) (stand-?up|call|chat)[.!]? (talk|see you)/i,
];

/** True when `text` reads as a conversational sign-off/farewell. */
export function isClosingCue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return CLOSING_CUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
