import assert from "node:assert/strict";
import test from "node:test";
import { isClosingCue } from "../lib/agent/conversationClosing";

test("recognizes common conversational sign-offs", () => {
  assert.equal(isClosingCue("Sounds good. Talk to you tomorrow, John. Have a productive day!"), true);
  assert.equal(isClosingCue("Great stand-up today. Talk soon!"), true);
  assert.equal(isClosingCue("Okay, that's it for today. Goodbye!"), true);
  assert.equal(isClosingCue("Bye for now."), true);
  assert.equal(isClosingCue("We're all done for today -- nice work."), true);
  assert.equal(isClosingCue("I'll let you go, talk to you later."), true);
  assert.equal(isClosingCue("See you tomorrow at stand-up."), true);
});

test("does not treat ordinary mid-conversation replies as a sign-off", () => {
  assert.equal(isClosingCue("Let's move that ticket to today."), false);
  assert.equal(isClosingCue("What's blocking the onboarding flow?"), false);
  assert.equal(isClosingCue("Sure, I've updated the acceptance criteria."), false);
  assert.equal(isClosingCue("Are you still working on the login bug?"), false);
});

test("empty or whitespace-only text is never a closing cue", () => {
  assert.equal(isClosingCue(""), false);
  assert.equal(isClosingCue("   "), false);
});
