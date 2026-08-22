import assert from "node:assert/strict";
import test from "node:test";
import { chunkDocumentContent, normalizeDocumentContent } from "../lib/rag/documentChunker";

test("normalizeDocumentContent collapses CRLF, trailing whitespace, and excess blank lines", () => {
  const raw = "Line one.  \r\nLine two.\r\n\r\n\r\n\r\nLine three.   ";
  assert.equal(normalizeDocumentContent(raw), "Line one.\nLine two.\n\nLine three.");
});

test("empty content produces no chunks", () => {
  assert.deepEqual(chunkDocumentContent(""), []);
  assert.deepEqual(chunkDocumentContent("   \n\n  "), []);
});

test("short content fits in a single chunk with no section", () => {
  const chunks = chunkDocumentContent("Just one short paragraph of notes from the customer call.");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].index, 0);
  assert.equal(chunks[0].section, null);
  assert.equal(chunks[0].content, "Just one short paragraph of notes from the customer call.");
});

test("a heading-like line becomes the section for paragraphs that follow it", () => {
  const content = [
    "Customer Segments",
    "Agencies and freelance accountants are our two candidate segments.",
    "Both were mentioned repeatedly across interviews.",
  ].join("\n\n");
  const chunks = chunkDocumentContent(content);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].section, "Customer Segments");
});

test("a markdown-style heading has its leading hashes stripped from the section label", () => {
  const content = ["## Pricing", "We are testing $49/month against $79/month."].join("\n\n");
  const chunks = chunkDocumentContent(content);
  assert.equal(chunks[0].section, "Pricing");
});

test("a new heading starts a fresh chunk and updates the section for what follows", () => {
  const content = [
    "Problem Statement",
    "Founders lose track of commitments between stand-ups.",
    "Proposed Solution",
    "An AI business analyst that remembers and follows up.",
  ].join("\n\n");
  const chunks = chunkDocumentContent(content);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].section, "Problem Statement");
  assert.equal(chunks[1].section, "Proposed Solution");
});

test("long content is split into multiple chunks, each within the size budget", () => {
  const paragraph = "This paragraph describes one customer interview finding in reasonable detail. ".repeat(6).trim();
  const content = Array.from({ length: 10 }, (_, i) => `${paragraph} (interview ${i + 1})`).join("\n\n");
  const chunks = chunkDocumentContent(content);
  assert.ok(chunks.length > 1, "expected content this long to need more than one chunk");
  for (const chunk of chunks) {
    assert.ok(chunk.content.length <= 1500 + 200, `chunk ${chunk.index} was ${chunk.content.length} chars, expected roughly <=1500`);
  }
  // Chunk indices are sequential starting at 0.
  assert.deepEqual(chunks.map((c) => c.index), chunks.map((_, i) => i));
});

test("consecutive chunks overlap so context isn't lost at a boundary", () => {
  const paragraph = "Sentence about the venture's roadmap and priorities for this quarter. ".repeat(8).trim();
  const content = Array.from({ length: 6 }, (_, i) => `${paragraph} Marker-${i}.`).join("\n\n");
  const chunks = chunkDocumentContent(content);
  assert.ok(chunks.length >= 2, "expected at least two chunks for this test to be meaningful");
  for (let i = 1; i < chunks.length; i++) {
    const tailOfPrevious = chunks[i - 1].content.slice(-50);
    assert.ok(
      chunks[i].content.includes(tailOfPrevious.slice(-30)),
      `expected chunk ${i} to carry some overlap from the end of chunk ${i - 1}`,
    );
  }
});

test("a single paragraph far longer than the chunk budget is split on sentence boundaries", () => {
  const longParagraph = Array.from({ length: 60 }, (_, i) => `This is sentence number ${i}.`).join(" ");
  const chunks = chunkDocumentContent(longParagraph);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    // Splitting on sentence boundaries means each chunk (before the shared overlap) should
    // read as whole sentences, not a mid-sentence cut -- spot check it ends on punctuation.
    assert.match(chunk.content.trim(), /[.!?]$/);
  }
});

test("a single run-on 'sentence' with no punctuation is hard-wrapped rather than left unbounded", () => {
  const noPunctuation = "word ".repeat(2000).trim(); // ~10,000 chars, no '.', '!', or '?' anywhere
  const chunks = chunkDocumentContent(noPunctuation);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.content.length <= 1500, `chunk ${chunk.index} was ${chunk.content.length} chars, expected <=1500`);
  }
});

test("a too-small trailing chunk is merged into its predecessor instead of standing alone", () => {
  const bigParagraph = "Substantial content about the venture's customer research. ".repeat(30).trim();
  const content = `${bigParagraph}\n\n${bigParagraph}\n\nOne short trailing note.`;
  const chunks = chunkDocumentContent(content);
  const last = chunks[chunks.length - 1];
  assert.ok(last.content.includes("One short trailing note."), "the short trailing note must not be dropped");
  assert.notEqual(last.content.trim(), "One short trailing note.", "it should have been merged into the previous chunk, not left standing alone");
});

test("chunking the same content twice is deterministic", () => {
  const content = [
    "Overview",
    "This venture serves solo founders who need an accountable co-founder.",
    "Market Research",
    "Interviews with 12 founders confirmed the core pain point.",
  ].join("\n\n");
  assert.deepEqual(chunkDocumentContent(content), chunkDocumentContent(content));
});
