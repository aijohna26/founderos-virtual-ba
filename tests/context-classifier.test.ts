import assert from "node:assert/strict";
import test from "node:test";
import { classifyContextNeeds } from "../lib/agent/contextClassifier";

// P1 #11/#13's own three named examples, tested directly against the real classifier.
test("#13 example: 'Move ticket 43 to Done' does not need document retrieval", () => {
  const result = classifyContextNeeds("Move ticket 43 to Done");
  assert.equal(result.categories.has("board_ticket"), true);
  assert.equal(result.needsDocumentRetrieval, false);
});

test("#13 example: 'What is blocking us?' primarily reads as a board question", () => {
  const result = classifyContextNeeds("What is blocking us?");
  assert.equal(result.categories.has("board_ticket"), true);
});

test("#13 example: 'Should we target agencies or accountants?' needs company/customer evidence", () => {
  const result = classifyContextNeeds("Should we target agencies or accountants?");
  assert.equal(result.needsDocumentRetrieval, true);
});

test("classifies board/ticket operations", () => {
  assert.equal(classifyContextNeeds("Close the blocked ticket").categories.has("board_ticket"), true);
  assert.equal(classifyContextNeeds("Add this to the backlog").categories.has("board_ticket"), true);
});

test("classifies sprint, commitment, team, activity, and learning questions", () => {
  assert.equal(classifyContextNeeds("Are we on track for the sprint goal?").categories.has("current_sprint"), true);
  assert.equal(classifyContextNeeds("What did I commit to yesterday?").categories.has("commitments"), true);
  assert.equal(classifyContextNeeds("Who's assigned to the onboarding flow?").categories.has("team_member"), true);
  assert.equal(classifyContextNeeds("What has changed since the last stand-up?").categories.has("recent_activity"), true);
  assert.equal(classifyContextNeeds("Have we seen this pattern of behavior before?").categories.has("learnings"), true);
});

test("classifies document, decision, customer-research, and business-synthesis questions", () => {
  assert.equal(classifyContextNeeds("What does the PRD say about onboarding?").categories.has("documents"), true);
  assert.equal(classifyContextNeeds("Why did we decide to drop the enterprise tier?").categories.has("previous_decisions"), true);
  assert.equal(classifyContextNeeds("What did customers say about pricing in the interviews?").categories.has("customer_research"), true);
  assert.equal(classifyContextNeeds("Should we pivot the overall strategy?").categories.has("full_business_synthesis"), true);
});

test("a pure board command (no other signal) skips document retrieval; anything else attempts it", () => {
  assert.equal(classifyContextNeeds("Move ticket 12 to backlog").needsDocumentRetrieval, false);
  assert.equal(classifyContextNeeds("Close the modal").needsDocumentRetrieval, false);
  // Board_ticket *plus* another signal is no longer a "pure" board command.
  assert.equal(classifyContextNeeds("Does the PRD mention this ticket's requirements?").needsDocumentRetrieval, true);
});

test("skips retrieval for messages too short to be a real question", () => {
  assert.equal(classifyContextNeeds("yes").needsDocumentRetrieval, false);
  assert.equal(classifyContextNeeds("").needsDocumentRetrieval, false);
  assert.equal(classifyContextNeeds("   ").needsDocumentRetrieval, false);
});

test("an unclassified but substantial message still attempts retrieval (permissive by design)", () => {
  const result = classifyContextNeeds("How does this compare to what similar companies have done?");
  assert.equal(result.needsDocumentRetrieval, true);
});
