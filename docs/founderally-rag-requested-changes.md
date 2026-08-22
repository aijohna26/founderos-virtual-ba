# FounderAlly — Requested RAG & Context Improvements

## Purpose

This file captures the requested changes after reviewing the latest repository state at commit `64594c6` (`intial rag 3`).

The current RAG foundation is strong enough to build on. The goal now is **not to rewrite it**, but to improve reliability, observability, retrieval precision, and end-to-end agent behaviour.

---

# P0 — Apply and Verify RAG Infrastructure

- [ ] **1. Apply all outstanding RAG migrations to the live Supabase environment**
  - Apply document ingestion migration.
  - Apply pgvector / document embedding migration.
  - Verify `document_chunks` exists.
  - Verify embedding column exists with the expected vector dimensions.
  - Verify `match_document_chunks` RPC exists.
  - Verify user + venture scoping is enforced server-side.
  - Verify document ingestion status fields exist.

### Acceptance criteria

- Saving a document in the deployed environment creates document chunks.
- Chunks receive embeddings.
- Semantic retrieval returns relevant chunks.
- Retrieval cannot return chunks from another venture.
- Retrieval cannot return chunks owned by another user.

---

# P0 — Separate Document and Embedding Status

- [x] **2. Split document ingestion state from embedding/indexing state**
  - _Implemented: `embedding_status` (pending/ready/partial/failed) already existed;
    `20260822120000_document_embedding_observability.sql` adds `embedding_indexed_at` (last
    successful run, never cleared by a later failure) and `embedding_error` (short diagnostic,
    safe for admin display). `lib/rag/documentIngestion.ts` populates both on every outcome.
    Not yet done: surfacing this in an actual admin/AI Ops UI -- there's no admin documents
    view today (only Cost Ops and LTD), so that's new UI work, tracked separately, not bundled
    into this schema/backend change._
  - _Follow-up review finding, fixed: `embeddedCount` (and therefore `embedding_status`) was
    computed from how many chunks Gemini returned an embedding *for*, without checking each
    subsequent Postgres UPDATE's own `{ error }` -- so a DB write failure after a successful
    Gemini call was invisible, and a document could read `ready`/fully indexed while some
    chunks were never actually persisted with an embedding. `documentIngestion.ts` now inspects
    every persistence result and only counts genuinely-persisted chunks; `embedding_error` on a
    partial run reflects the true failed-to-persist count. Also stopped stamping
    `embedding_indexed_at`/`embedding_error` on an empty document (0 chunks) -- there's nothing
    to index, so `ready` is vacuously correct, but a timestamp would misrepresent it as a real
    indexing run. Now covered by tests: pulled the counting/status/error-message logic out into
    three pure functions (`countPersistedEmbeddings`, `resolveEmbeddingStatus`,
    `describeEmbeddingError`) so the actual bug -- not inspecting each Postgres result's own
    `{ error }` -- reproduces in `tests/document-embedding-status.test.ts` (10 cases, including
    the review's exact "10 generated, 2 fail to persist" scenario) without needing to mock
    Supabase-JS._

Current behaviour can mark a document as `ready` even if embedding fails.

That makes the system appear healthy while the document may be invisible to semantic retrieval.

Add separate states such as:

```ts
ingestionStatus:
  | "pending"
  | "processing"
  | "ready"
  | "failed"

embeddingStatus:
  | "pending"
  | "processing"
  | "ready"
  | "partial"
  | "failed"
```

Alternative naming is acceptable, but document parsing/chunking and semantic indexing must be independently observable.

- [x] Store the timestamp of the last successful embedding/indexing run.
- [x] Store the last embedding/indexing error where useful.
- [ ] Surface failed or partial indexing in admin/AI Ops.
- [x] Do not tell the user a document is fully searchable when embedding failed.

### Acceptance criteria

A document whose text saves and chunks successfully but whose embedding API call fails must show:

```text
Document saved: yes
Chunking: ready
Semantic indexing: failed
```

rather than simply:

```text
ready
```

---

# P0 — Make Retrieval Failures Observable

- [x] **3. Stop collapsing every RAG failure into an empty result**
  - _Implemented: `lib/rag/retrieval.ts`'s `searchDocumentChunks` now returns
    `RetrievalResult { status, chunks, error? }` with exactly the five statuses named in this
    item, instead of a bare `[]`. `lib/rag/companyKnowledgeContext.ts` maps that down to a
    caller-facing `EvidenceStatus` (`with_evidence`/`no_match`/`retrieval_unavailable`) and,
    critically, never lets the raw `error` string reach the model or founder -- only a generic
    "search wasn't available, evidence may still exist" framing does, on both text
    (`app/api/ai-analyst/route.ts`, new `evidenceStatus` field in the response) and Live
    (`search_company_knowledge`'s tool result `message`, which I found was being silently
    dropped before reaching the model at all -- fixed alongside this). Every retrieval attempt
    (success, no-match, or failure) now logs to `ai_operation_logs` via a new
    `lib/agent/aiOperationsLogServer.ts` (the existing `AIOperationsLogger` is client-only and
    couldn't be called from this server-side code) -- basic health visibility now, full P1 #4
    telemetry (latency breakdowns, rates, dashboards) still to come._

Current retrieval behaviour returns `[]` for:

- no relevant match;
- embedding failure;
- Supabase unavailable;
- vector RPC failure;
- missing Gemini key;
- other retrieval errors.

Keep graceful degradation for Sarah, but internally distinguish the cause.

Use a result structure similar to:

```ts
type RetrievalStatus =
  | "success"
  | "no_match"
  | "embedding_unavailable"
  | "database_unavailable"
  | "retrieval_error";

interface RetrievalResult {
  status: RetrievalStatus;
  chunks: RetrievedChunk[];
  error?: string;
}
```

- [ ] Sarah should still continue if RAG fails.
- [ ] Do not show low-level errors directly to users.
- [ ] Send retrieval health information to AI Ops / telemetry.
- [ ] Record whether the final answer was produced:
  - with company evidence;
  - without matching evidence;
  - after RAG infrastructure failure.

### Why

FounderAlly's value proposition depends on Sarah understanding the venture.

There is a major difference between:

> No relevant company evidence exists.

and:

> Relevant evidence may exist, but semantic retrieval failed.

The application needs to know which happened.

---

# P1 — RAG Telemetry

- [x] **4. Add RAG telemetry to AI Ops**
  - _Implemented: `lib/rag/retrieval.ts` now measures `embeddingLatencyMs`/`dbLatencyMs`
    separately; new `lib/rag/ragTelemetry.ts` (`logRagRetrieval`) records every attempt --
    query (truncated, never chunk content), source (text/live), status, chunk count, top
    similarity, both latencies, and document ids returned -- into the existing
    `ai_operation_logs` table (no new table needed). Both the text path
    (`companyKnowledgeContext.ts`) and Live path (`app/api/rag/search/route.ts`) now go through
    this one shared logger instead of each having its own inline (thinner) log call. Metrics:
    `summarizeRagTelemetry` (pure, unit-tested -- 5 cases including the empty/divide-by-zero
    case) computes success/no-match/retrieval-error/embedding-failure rates, avg latency, and
    avg chunk-count/similarity *on successful attempts only* (a failed attempt's 0 chunks
    shouldn't dilute that number). New `/api/admin/rag-telemetry` route + "RAG Telemetry" admin
    tab (`AdminRagTelemetryDashboard.tsx`) surface it. "Attempts per conversation" from the
    original list isn't implemented as literally specified -- there's no conversation/session
    grouping key in the current data model for text chat, so building a fake one felt worse
    than being explicit: the dashboard reports raw attempt counts split by source (text vs
    Live) instead._

Track at minimum:

```text
userId
ventureId
query
retrievalAttempted
retrievalStatus
embeddingModel
retrievedChunkCount
topSimilarity
retrievalLatencyMs
embeddingLatencyMs
documentIdsReturned
createdAt
```

Do not store unnecessary sensitive document content in telemetry.

Add metrics for:

- retrieval success rate;
- no-match rate;
- retrieval error rate;
- embedding failure rate;
- average retrieval latency;
- average number of chunks returned;
- average similarity score;
- retrieval attempts per text conversation;
- retrieval attempts per Live conversation.

---

# P1 — Improve Retrieval Gating

- [x] **5. Refine `needsDocumentRetrieval` behaviour**
  - _Implemented: `documentRetrieval: "skip" | "optional" | "required"` replaces the old
    boolean in `lib/agent/contextClassifier.ts`. `skip` never searches (and needed a new,
    separate `BOARD_OPERATION_PATTERN` -- the general category taxonomy alone missed "Assign
    this to Priya," this doc's own Skip example, since it reads as `team_member` not
    `board_ticket` with no literal "ticket" wording). `optional` still searches -- cheap,
    doesn't skip it outright per "do not make the classifier aggressively restrictive" -- but
    requires a higher similarity bar (`OPTIONAL_TIER_MIN_SIMILARITY`, 0.65 vs the normal 0.5)
    to actually surface evidence, applied on both text (`companyKnowledgeContext.ts`) and Live
    (`app/api/rag/search/route.ts`, classifying the model's own tool-call query -- Live's
    decision to search stays the model's, only the bar for what counts as relevant changes).
    `required` uses the normal bar. All three of this item's own example sets (Skip/Optional/
    Required) are asserted verbatim in `tests/context-classifier.test.ts`._

The current classifier is intentionally permissive and effectively attempts retrieval for most meaningful messages that are not pure board operations.

That is safe from an answer-quality perspective but may generate unnecessary:

- embedding API calls;
- vector searches;
- latency;
- AI cost.

Do not make the classifier aggressively restrictive.

Instead, introduce clearer retrieval intent levels:

```ts
documentRetrieval:
  | "skip"
  | "optional"
  | "required"
```

Examples:

### Skip

```text
Move ticket 43 to Done.
Close the ticket.
Assign this to Priya.
What cards are blocked?
```

### Optional

```text
What should I work on today?
Are we on track?
What is the biggest risk this week?
```

Use structured venture state first and retrieve documents only if the question cannot be answered confidently from current business state.

### Required

```text
What did customers say about onboarding?
Should we target agencies or accountants?
What does our PRD say about team permissions?
Why did we decide not to build this?
```

---

# P1 — Turn the Classifier Into a Real Context Router

- [ ] **6. Make context categories influence actual context assembly**

The current classifier detects categories, but most structured context is still always included.

Use the classifier to progressively control context assembly where doing so is safe.

Supported categories already include:

```text
board_ticket
current_sprint
commitments
team_member
recent_activity
learnings
documents
previous_decisions
customer_research
full_business_synthesis
```

Implement context selection such as:

```text
User message
    ↓
Context classifier
    ↓
Structured context requirements
    ↓
Optional/required RAG
    ↓
Prompt assembly
```

Do this cautiously.

Do not remove useful context solely to save a small number of tokens if it noticeably reduces BA quality.

---

# P1 — Structured Provenance

- [ ] **7. Expand provenance beyond document title**

For each recommendation, allow FounderAlly to retain supporting evidence from:

- document chunk;
- board ticket;
- sprint goal;
- commitment;
- blocker;
- previous decision;
- customer research;
- learning/pattern.

Suggested internal format:

```ts
interface EvidenceReference {
  type:
    | "document"
    | "ticket"
    | "sprint"
    | "commitment"
    | "decision"
    | "learning"
    | "customer_research";

  id?: string;
  title?: string;
  section?: string;
  summary?: string;
  confidence?: number;
}
```

Sarah does not need to show every source on every answer.

The goal is for FounderAlly to know **why** it made a recommendation.

---

# P1 — Recommendation Grounding

- [ ] **8. Add post-response grounding checks for important recommendations**

Prompt instructions alone cannot guarantee Sarah follows evidence requirements.

For higher-value recommendation types, check whether the answer is supported by available context.

Apply this particularly to:

- customer targeting;
- pricing;
- roadmap prioritisation;
- pivot decisions;
- major scope changes;
- product strategy.

Possible lightweight rule:

```text
venture-specific recommendation
+
venture evidence available
+
no evidence reference in generated response
=
flag for grounding review / retry
```

Do not overcomplicate simple conversations.

---

# P1 — End-to-End RAG Tests

- [ ] **9. Add text-agent RAG integration tests**

Test the full path rather than only the retrieval primitive.

Scenarios:

### Relevant document retrieval

Document:

```text
Customer interviews show agencies will pay £99/month.
```

User:

```text
Which customer segment currently has stronger willingness-to-pay evidence?
```

Expected:

- RAG attempted;
- relevant chunk retrieved;
- answer references the document;
- Sarah distinguishes evidence from inference.

### Irrelevant document exclusion

Store unrelated documents.

Expected:

- irrelevant chunks are not injected simply because they exist.

### Cross-venture isolation

User asks from Venture A.

Expected:

- Venture B chunks never appear.

### Pure board command

```text
Move ticket 43 to Done.
```

Expected:

- no embedding query;
- no vector search;
- ticket action continues normally.

### Multiple-document ranking

Provide several related documents.

Expected:

- highest-relevance evidence ranks first;
- results respect the configured match count.

### Retrieval infrastructure failure

Simulate retrieval failure.

Expected:

- Sarah still answers where possible;
- answer does not falsely claim company evidence;
- telemetry records retrieval failure.

---

# P1 — Live Voice RAG Verification

- [ ] **10. Verify the `search_company_knowledge` Live tool end-to-end**

The Live architecture now exposes retrieval through a tool instead of injecting evidence on every turn.

Test:

```text
Founder:
"What did our customer interviews say about pricing?"
```

Expected flow:

```text
Gemini Live
    ↓
search_company_knowledge
    ↓
venture/user-scoped retrieval
    ↓
tool result returned into SAME Live session
    ↓
Sarah answers using retrieved evidence
```

Verify:

- correct venture;
- correct user;
- relevant chunks;
- source titles;
- no invented documents;
- no accidental tool call for ordinary board operations.

---

# P2 — Improve Indexing Durability

- [ ] **11. Consider asynchronous document indexing**

Current synchronous indexing is acceptable at present scale.

Do not introduce infrastructure complexity prematurely.

But prepare for a future flow:

```text
Save document
    ↓
return success quickly
    ↓
queue/background job
    ↓
chunk
    ↓
embed
    ↓
indexed
```

Trigger this change when document size or embedding latency starts materially affecting user save performance.

---

# P2 — Stable Chunk Identity

- [ ] **12. Improve chunk identity before persistent citation features depend on it**

Current chunk IDs use:

```text
documentId + chunkIndex
```

This is sufficient for replace-in-full ingestion.

However, inserting content near the beginning of a document changes later chunk indices.

Before building long-lived citation/history relationships to chunks, consider IDs based on:

```text
documentId
+
section
+
contentHash
+
ordinal
```

Do not change this immediately unless another feature requires stable chunk identity.

---

# P2 — Retrieval Quality Evaluation

- [ ] **13. Build a small FounderAlly RAG evaluation set**

Create representative company questions and expected source documents.

Examples:

- target customer;
- willingness to pay;
- product scope;
- known customer objections;
- pricing assumptions;
- previous decisions;
- launch requirements;
- technical constraints.

For each test case record:

```text
query
expected document
expected section/chunk
irrelevant documents
minimum acceptable similarity/rank
```

Use this to tune:

- chunk size;
- overlap;
- similarity threshold;
- match count;
- embedding model.

Do not tune these values only by intuition.

---

# Current Status After `intial rag 3`

## Green

- [x] Document chunking
- [x] Document ingestion
- [x] Embedding generation
- [x] pgvector storage
- [x] User + venture scoped retrieval
- [x] Text-path RAG integration
- [x] Structured document provenance
- [x] Live company-knowledge tool
- [x] Context classifier exists
- [x] Pure board commands can avoid RAG
- [x] Recommendation grounding instructions added
- [x] Separate embedding/index status (schema + backend; no admin UI yet)
- [x] Retrieval failures observable (RetrievalStatus/EvidenceStatus + basic AI Ops logging)

## Still Needs Improvement

- [ ] Production migrations verified (blocked on DB access -- see below)
- [ ] Full RAG telemetry (latency breakdowns, rates, dashboards -- basic logging now exists)
- [ ] More precise retrieval gating
- [ ] Context categories controlling actual prompt assembly
- [ ] Broader structured provenance
- [ ] Important recommendation grounding checks
- [ ] Full text-agent RAG integration tests
- [ ] Live RAG integration tests
- [ ] RAG quality evaluation set

---

# Recommended Immediate Order

Implement these next:

1. **Apply and verify RAG migrations in production**
2. **Separate embedding/indexing status**
3. **Make retrieval failures observable**
4. **Add RAG telemetry**
5. **Add end-to-end text + Live RAG tests**
6. **Refine context routing**
7. **Then move into the task-based model router**

The RAG foundation should now be treated as an existing architecture to strengthen, not something to replace.
