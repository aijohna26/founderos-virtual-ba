import assert from "node:assert/strict";
import test from "node:test";
import { shouldAttemptCompanyKnowledgeRetrieval } from "../lib/rag/retrievalGate";

test("skips retrieval for plain board/ticket commands", () => {
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Move ticket 43 to done"), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Close the modal"), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Create a ticket for the login bug"), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Move the onboarding ticket to blocked"), false);
});

test("skips retrieval for messages too short to be a real question", () => {
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("yes"), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("ok do it"), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval(""), false);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("   "), false);
});

test("attempts retrieval for research/strategy/customer-evidence questions", () => {
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Should we target agencies or accountants?"), true);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("What did customers say about our pricing in the interviews?"), true);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("What's blocking us from shipping the onboarding flow?"), true);
  assert.equal(shouldAttemptCompanyKnowledgeRetrieval("Summarize what the PRD says about the referral program."), true);
});
