// P1 #6 (docs/founderally-updated-todo.md): deterministic, dependency-free chunking. No LLM
// call here -- "chunk intelligently" means respecting paragraph/sentence boundaries and
// producing chunks of a workable, consistent size, not literally an AI chunking step. Kept
// pure (no DB, no network) so it's unit-testable on its own; lib/rag/documentIngestion.ts
// wraps this with the actual persistence side-effects.

export interface DocumentChunk {
  /** Position of this chunk within the document, starting at 0. */
  index: number;
  /** The nearest preceding heading-like line, if one was detected; null for freeform text. */
  section: string | null;
  content: string;
}

// Sized in characters, not tokens -- close enough for chunk-packing purposes, and avoids
// pulling in a tokenizer just to decide where to split. ~1500 chars is comfortably under any
// embedding model's per-input limit (item #7) while still giving retrieval (item #8) chunks
// substantial enough to be useful evidence on their own.
const MAX_CHUNK_CHARS = 1500;
const OVERLAP_CHARS = 150;
// A trailing chunk this small reads as a fragment on its own -- worth merging back into its
// predecessor rather than standing as "evidence" by itself, as long as the merge doesn't blow
// past the max.
const MIN_STANDALONE_CHUNK_CHARS = 200;

/** Normalizes line endings/whitespace so identical content always chunks identically. */
export function normalizeDocumentContent(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * A short, standalone line with no terminal punctuation reads as a heading rather than prose
 * (e.g. "Customer Segments", "## Pricing", "PROBLEM STATEMENT"). Deliberately conservative --
 * false negatives (missing a real heading) just mean `section` stays null for that stretch,
 * which is harmless; false positives would mislabel real prose as a section title.
 */
function isHeadingLike(paragraph: string): boolean {
  if (paragraph.includes("\n")) return false; // multi-line paragraphs are prose, not headings
  const trimmed = paragraph.replace(/^#+\s*/, "").trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  return true;
}

function splitIntoParagraphs(content: string): string[] {
  return content.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Splits a single over-long paragraph on sentence boundaries so no chunk exceeds the max. */
function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHUNK_CHARS) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) ?? [paragraph];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current.length > 0 && current.length + sentence.length > MAX_CHUNK_CHARS) {
      pieces.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim().length > 0) pieces.push(current.trim());
  // A single sentence longer than MAX_CHUNK_CHARS on its own still can't be split further
  // without cutting mid-word -- rather than risk an unbounded chunk, hard-wrap it.
  return pieces.flatMap((piece) => {
    if (piece.length <= MAX_CHUNK_CHARS) return [piece];
    const wrapped: string[] = [];
    for (let i = 0; i < piece.length; i += MAX_CHUNK_CHARS) wrapped.push(piece.slice(i, i + MAX_CHUNK_CHARS));
    return wrapped;
  });
}

/**
 * Greedily packs paragraphs into ~MAX_CHUNK_CHARS chunks, carrying a small tail of the
 * previous chunk forward as overlap so retrieval (item #8) doesn't lose context that fell
 * right on a chunk boundary. Tracks the nearest preceding heading-like paragraph as each
 * chunk's `section`.
 */
export function chunkDocumentContent(rawContent: string): DocumentChunk[] {
  const normalized = normalizeDocumentContent(rawContent);
  if (normalized.length === 0) return [];

  const paragraphs = splitIntoParagraphs(normalized);
  const chunks: DocumentChunk[] = [];
  let currentSection: string | null = null;
  let buffer = "";
  let bufferSection: string | null = null;

  const flush = () => {
    const content = buffer.trim();
    if (content.length === 0) return;
    chunks.push({ index: chunks.length, section: bufferSection, content });
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (isHeadingLike(paragraph)) {
      currentSection = paragraph.replace(/^#+\s*/, "").trim();
      // A heading starts a fresh chunk rather than gluing onto whatever came before it, so a
      // chunk never straddles two different sections.
      flush();
      bufferSection = currentSection;
      continue;
    }

    for (const piece of splitLongParagraph(paragraph)) {
      const candidateLength = buffer.length + (buffer.length > 0 ? 2 : 0) + piece.length;
      if (buffer.length > 0 && candidateLength > MAX_CHUNK_CHARS) {
        // Only include as much overlap as still leaves room for the full next piece --
        // without this, a piece that's already at (or near) MAX_CHUNK_CHARS on its own (e.g.
        // one slice of a hard-wrapped run-on paragraph) would push the new chunk over budget
        // by however much overlap got tacked on.
        const availableForOverlap = Math.max(0, MAX_CHUNK_CHARS - piece.length - 2);
        const overlapChars = Math.min(OVERLAP_CHARS, availableForOverlap);
        // buffer.slice(-0) returns the *whole* string (-0 === 0 in JS), not "" -- guard the
        // zero case explicitly rather than let that silently defeat the cap above.
        const overlap = overlapChars > 0 ? buffer.slice(-overlapChars).trim() : "";
        flush();
        bufferSection = currentSection;
        buffer = overlap.length > 0 ? `${overlap}\n\n${piece}` : piece;
      } else {
        buffer = buffer.length > 0 ? `${buffer}\n\n${piece}` : piece;
        if (bufferSection === null) bufferSection = currentSection;
      }
    }
  }
  flush();

  // Merge a too-small trailing chunk into its predecessor rather than let it stand alone as
  // evidence, as long as the two still fit within the size budget together.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    const prev = chunks[chunks.length - 2];
    // Never merge across a section boundary -- doing so would misattribute the trailing
    // chunk's content to whatever section preceded it.
    if (
      last.section === prev.section &&
      last.content.length < MIN_STANDALONE_CHUNK_CHARS &&
      prev.content.length + last.content.length <= MAX_CHUNK_CHARS
    ) {
      chunks.pop();
      chunks.pop();
      chunks.push({ index: prev.index, section: prev.section, content: `${prev.content}\n\n${last.content}` });
    }
  }

  return chunks.map((chunk, index) => ({ ...chunk, index }));
}
