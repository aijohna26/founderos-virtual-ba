# FounderAlly — Updated TODO After `Agent close modal 5`

This replaces the older TODO priorities. The LTD concurrency architecture is now sufficiently implemented; **do not keep rebuilding it unless testing exposes a failure**.

## P0 — Finish Before LTD Launch

- [x] **1. Implement subscriber → Lifetime conversion**
  - Detect whether an LTD purchaser currently has an active monthly/annual subscription.
  - Grant Lifetime immediately after successful LTD payment.
  - Safely cancel/schedule cancellation of the recurring subscription.
  - Prevent future recurring charges.
  - Do not create any access gap during conversion.
  - Record previous plan, conversion date and LTD purchase.
  - Make webhook processing idempotent.
  - Surface the resulting Lifetime status in Account/Usage.
  - _Implemented: `lib/billing/subscriptionConversion.ts`, `lib/billing/ltd.ts`
    (`claimLtdConversionSlot`/`recordLtdConversion`), wired into
    `app/api/webhooks/stripe/route.ts`; new columns via
    `supabase/migrations/20260821110000_ltd_subscriber_conversion.sql`; surfaced in
    `app/usage/page.tsx` and `components/admin/AdminLtdDashboard.tsx`. Migration still needs
    to be applied to the live Supabase project (not run automatically here)._

- [x] **2. Run automated LTD concurrency tests**
  - Same Stripe payment intent submitted concurrently → one purchase and `quantity_sold +1`.
  - Different payment intents for same user → one membership only.
  - Two different users competing for final slot → exactly one succeeds.
  - #99 succeeds.
  - #100 succeeds.
  - #101 cannot claim a sold-out offer.
  - Duplicate Stripe webhook → no additional inventory change.
  - Verify Founding Member numbers remain unique.
  - Verify no LTD inventory disappears during failed transactions.
  - _Implemented: `tests/ltd-concurrency.test.ts` (6 scenarios, all passing) against a real
    disposable Postgres container running the actual `supabase/migrations/*.sql` (see
    `tests/db/testDb.ts`) -- not a mock, so it exercises the real advisory-lock/row-lock code.
    Requires Docker; skips (not fails) when Docker isn't available. Run with `npm test`.
    Also fixed the test runner itself, which was previously non-functional (`node --test` on
    `.ts` files threw `ERR_UNKNOWN_FILE_EXTENSION`; no runner was configured) -- added `tsx`
    as the loader and `--conditions react-server` so `import "server-only"` resolves outside
    Next's bundler. Doing so surfaced 2 pre-existing failures in
    `tests/persistence-and-patterns.test.ts` unrelated to LTD/billing (venture invite token
    payload and a spoken-confirmation narrowness check) that were previously never actually
    running -- flagged to the user, not fixed here (out of scope for this item)._

- [x] **3. Run Live concurrency/integrity tests**
  - Two simultaneous Live starts for one user.
  - Refresh during Live.
  - Browser crash.
  - Network loss.
  - Device sleep.
  - Duplicate end-session requests.
  - Stale-session reconciliation.
  - User reaches exactly 300 minutes.
  - User attempts another session at zero remaining.
  - Verify usage and cost ledger remain consistent.
  - _Implemented: `tests/live-concurrency.test.ts` (6 scenarios, all passing), same real-Postgres
    harness as the LTD tests. Refresh/crash/network-loss/device-sleep collapse to the same two
    backend invariants (single-active-session index; stale reconciliation capped at
    MAX_LIVE_SESSION_MINUTES) so they're covered together rather than as four identical tests.
    One test bug found and fixed along the way, not an app bug: seeded 150-minute sessions
    were silently capped to 30 counted minutes each by `reserve_live_session`'s own per-session
    cap (correct behavior -- no real session can exceed MAX_LIVE_SESSION_MINUTES), which
    masked the allowance-boundary check; fixed by seeding realistic ≤30-minute sessions.
    `endLiveUsageSession`/`reconcileStaleLiveSessions` themselves are plain Supabase-JS table
    updates (not Postgres functions), so the tests mirror their exact SQL against raw Postgres
    rather than exercising the TS wrapper directly -- noted in the test file header._

- [x] **4. Fix Live idle detection to measure human presence**
  - Introduce `lastUserActivityAt`.
  - Keep `lastSessionActivityAt` separately.
  - Sarah speaking must not reset human-presence timer.
  - Tool execution must not reset it.
  - Background noise must not reset it.
  - Meaningful final user speech should reset it.
  - Preserve “Are you still there?” → grace period → save → disconnect flow.
  - _Implemented in `lib/agent/geminiLiveService.ts`: the previous `resetIdleTimer()` was
    called from three places -- final user transcript, Sarah's audio output, and tool calls --
    so it was actually measuring session activity, not founder presence, exactly the bug this
    item names. Split into `resetIdleTimer()` (now only called on a final user transcript;
    drives `lastUserActivityAt` and the actual warning/disconnect timers) and a new
    `markSessionActivity()` (called from the Sarah-speaking and tool-call paths; only updates
    `lastSessionActivityAt`, never touches the timers). The "Are you still there?" → grace →
    disconnect flow itself (the two chained `setTimeout`s, the system-prompt check-in message,
    `onIdleDisconnect`) was untouched. No automated test added -- this class drives
    WebAudio/MediaStream/a live WebSocket-like Session directly in its constructor path, and
    this repo has no browser/jsdom test harness to isolate the timer logic from that; verify
    by exercising a real Live session (Sarah talking through a long answer, or a slow tool
    call, must not reset the "quiet for ~60s" warning)._

- [x] **5. Verify Cost Ops against real usage**
  - Verify Live cost entries.
  - Verify text cost entries.
  - Verify LTD cohort attribution.
  - Verify paid subscription plan resolution.
  - Verify expensive-user rankings.
  - Verify Live-cap warnings.
  - Verify stale sessions cannot create missing/double cost records.
  - Replace any placeholder Gemini pricing before making commercial margin decisions.
  - _Verified by code review (`lib/billing/costOps.ts`, `lib/billing/aiCostLedger.ts`) plus two
    new automated tests in `tests/live-concurrency.test.ts`. Two real bugs found and fixed:_
    - _**Gemini pricing was placeholder and materially wrong.** Replaced with rates checked
      against https://ai.google.dev/gemini-api/docs/pricing on 2026-08-21 (`PRICING_VERIFIED`
      flipped to `true`) -- Live audio was overpriced ~4x (input $0.02→$0.005/min, output
      $0.08→$0.018/min, both stated directly on the pricing page), text and TTS rates also
      corrected. See `lib/config/aiPricingConfig.ts` for sourcing/derivation notes and the
      2027-01-01 gemini-3.7-flash price increase to watch for._
    - _**LTD cohort margin mixed all-time revenue against a date-filtered cost figure.** Any
      admin narrowing the Cost Ops date range would see cohort cost artificially shrink while
      revenue (a one-time payment, correctly never filtered) stayed constant -- silently
      inflating displayed margin. Fixed: LTD cohort cost is now its own always-unfiltered
      query, matching revenue's time basis._
    - _Also broadened `activePlanByUserId`'s status filter to include `past_due` (previously
      only `active`), which was misclassifying past-due-but-still-entitled subscribers as
      free_user for the "approaching cap" admin warning._
    - _Live/text/TTS cost-entry wiring, expensive-user ranking, and stale-session
      double-counting protection were all reviewed and found correct as-is (the last one now
      has two dedicated tests: concurrent reconcile-vs-reconcile, and normal-end-vs-reconcile)._

---

## P1 — Company Knowledge / RAG

- [x] **6. Build proper document ingestion**
  - Extract document content.
  - Normalise it.
  - Chunk intelligently.
  - Preserve document ID, title, section/page and venture ID.
  - Store ingestion status.
  - Re-index when a document changes.
  - _Implemented: `lib/rag/documentChunker.ts` (pure, deterministic paragraph/sentence-aware
    chunking with heading detection and boundary overlap -- 12 unit tests in
    `tests/document-chunker.test.ts`, all passing; two real bugs found and fixed during
    testing: a section boundary was being ignored by the small-trailing-chunk merge, and
    `str.slice(-0)` returning the whole string instead of empty, which let overlap silently
    double a hard-wrapped chunk's size) and `lib/rag/documentIngestion.ts` (persistence
    orchestration: replace-in-full re-chunk, `ingestion_status` tracked through
    pending→processing→ready/failed). Wired into `app/api/persistence/route.ts` so every
    document save re-ingests synchronously. New `document_chunks` table + status/hash columns
    + a DB trigger flagging re-ingestion need, via
    `supabase/migrations/20260822090000_document_ingestion.sql` -- not yet applied to your
    live Supabase project. "Extract" is a no-op today: documents are pasted/typed text, not
    uploaded files, so there's nothing to extract from a file format yet -- if file upload
    (PDF/DOCX) is wanted later, extraction becomes a real step ahead of chunking.
    No embeddings yet -- that's item #7, next.

- [x] **7. Add embeddings/vector retrieval**
  - Create embeddings for chunks.
  - Store them in the existing data architecture where appropriate.
  - Restrict retrieval by `ventureId`.
  - Never allow cross-venture document leakage.
  - _Implemented: `lib/rag/embeddings.ts` (batched `gemini-embedding-2` calls, 1536 dims --
    chosen over the model's 3072 default because pgvector's ANN index types cap at 2000 dims,
    see `lib/config/ragConfig.ts` -- cost recorded via a new `recordDocumentProcessingCost`,
    which had been scaffolded in the cost ledger since P0 #6 but never actually used until
    now). Wired into `ingestDocument` so every save embeds its new chunks. New
    `match_document_chunks` SQL function (venture *and* user scoped, both required, not just
    ventureId -- see its own comment) via
    `supabase/migrations/20260822100000_document_chunk_embeddings.sql` -- not yet applied to
    your live Supabase project. `lib/rag/retrieval.ts` wraps it as `searchDocumentChunks()`
    for item #8 to call. Real Postgres+pgvector integration tests in
    `tests/document-retrieval.test.ts` (4 scenarios) explicitly prove the no-cross-venture-leak
    property, not just review it; had to switch the test harness's Postgres image to
    `pgvector/pgvector:pg16` (see `tests/db/testDb.ts`) since this migration needs the
    extension. No ANN index yet (exact scan is fine, and more accurate, at current data scale
    -- comment in the migration says when to add one).
  - _Review follow-ups applied: embedding failure no longer silently reads as fully "ready"
    (new `embedding_status` column, tracked separately from `ingestion_status` -- see
    `20260822110000_document_embedding_status.sql`); ingestion is now scheduled via Next's
    `after()` instead of awaited inline, so embedding latency never delays a document save
    (`app/api/persistence/route.ts`); chunk-ID stability under future citation persistence is
    flagged with a deferral comment in `documentIngestion.ts`, not fixed (nothing depends on
    it yet)._

- [x] **8. Build semantic company-knowledge retrieval**
  - Retrieve only relevant chunks for a question.
  - Do not inject every company document into every prompt.
  - Rank results.
  - Apply sensible relevance thresholds.
  - Keep token usage controlled.
  - _Implemented per the reviewed roadmap: the old "dump every saved document into every
    prompt" pattern is gone from both surfaces. **Text** (`app/api/ai-analyst/route.ts`):
    `lib/rag/companyKnowledgeContext.ts` gates on a minimal heuristic
    (`lib/rag/retrievalGate.ts` -- explicitly *not* the real classifier, P1 #11 replaces it
    outright once built), retrieves only matching chunks, injects those in place of the old
    document dump, and returns structured `sources` in the response. **Live**
    (`lib/agent/geminiLiveConfig.ts`/`geminiLiveService.ts`): documents are no longer preloaded
    into the connect-time system prompt at all -- added `search_company_knowledge` as an
    eighth agent tool the model calls on its own judgment (consistent with how it already
    decides when to call `get_ticket` etc.), executed client-side via new
    `app/api/rag/search/route.ts` (venture-membership checked, reusing the access logic
    extracted to `lib/venture/access.ts`). This one mechanism naturally satisfies "avoid
    unnecessary RAG" for Live -- the model just doesn't call the tool for board commands.
    Client payload cleanup: `documents` is no longer sent to either route;
    `AiAnalystPanel.tsx` now sends `venture.id` (previously missing entirely, which had also
    left `recordTextChatCost`'s `ventureId` silently null). New tests:
    `tests/retrieval-gate.test.ts` (board commands / short messages excluded, real questions
    pass); `tests/document-retrieval.test.ts` from #7 already covers ranking, threshold
    exclusion, and cross-venture isolation with multiple documents.

- [ ] **9. Add source provenance**
  - Sarah should internally know which evidence supports an answer:
    - document
    - ticket
    - sprint
    - commitment
    - decision
    - assumption
    - learning
    - customer research
  - Never invent sources.
  - _Partial: the "document" evidence type has real structured provenance now (title, section,
    similarity -- returned as `sources` alongside every text reply and passed to Live's
    `search_company_knowledge` tool result), and the system prompt on both surfaces
    explicitly requires citing it and never inventing contents beyond what was retrieved. The
    other seven evidence types (ticket/sprint/commitment/decision/assumption/learning/customer
    research) have no equivalent structured-citation trail yet -- still genuinely open._

- [x] **10. Make Sarah genuinely company-aware**
  - Relevant company knowledge should automatically influence answers.
  - Founder should not repeatedly need to say “look at my documents.”
  - Sarah should distinguish known company facts from her own recommendation.
  - _A direct consequence of #8, not separate work: retrieval is now automatic (gated on the
    question itself, not a manual trigger) on both text and Live, and both system prompts
    require separating retrieved evidence from inference. Marked done on that basis, but it's
    only as good as the minimal gate/similarity threshold behind it -- P1 #11's real
    classifier should meaningfully improve recall over time, not just replace scaffolding._

---

## P1 — Context Intelligence

- [x] **11. Build a context classifier/router**
  - Determine what information a request actually requires before assembling the AI context.
  - _Implemented: `lib/agent/contextClassifier.ts`, a pure/synchronous heuristic classifier
    (no model call) replacing `lib/rag/retrievalGate.ts`'s placeholder from #8 outright, as
    planned. Scope decision, made explicit in the file's own header: most of #12's categories
    (board_ticket, current_sprint, commitments, team_member, recent_activity, learnings,
    previous_decisions) are already cheap, always-loaded local data with no separate fetch
    cost, so this classifier's actual gating effect today is still narrow -- it only decides
    `needsDocumentRetrieval` (documents/customer_research), the one category with a real
    marginal cost (an embedding call + DB round trip). Trimming the cheap categories from the
    prompt is a real answer-quality regression risk for an uncertain token-cost payoff, so it's
    named as a deliberate non-goal here, not silently skipped. 9 unit tests in
    `tests/context-classifier.test.ts`, including #13's three examples verified directly
    against the real function.

- [x] **12. Support context categories**
  - Board/ticket only.
  - Current sprint.
  - Commitments.
  - Team/member context.
  - Recent activity.
  - Learnings.
  - Documents.
  - Previous decisions.
  - Customer research.
  - Full business synthesis.
  - _All ten are real `ContextCategory` values in `lib/agent/contextClassifier.ts`'s taxonomy
    (built alongside #11, same file) with their own detection rule and test coverage. Only
    documents/customer_research currently drive different behavior (see #11's note); the rest
    are classified but not yet used to change what gets assembled._

- [x] **13. Avoid unnecessary RAG**
  - `"Move ticket 43 to Done"` should not retrieve business documents.
  - `"What is blocking us?"` should primarily inspect board/blockers/dependencies.
  - `"Should we target agencies or accountants?"` should retrieve relevant company/customer evidence.
  - _All three are this item's own examples, and all three are now asserted directly against
    `classifyContextNeeds()` in `tests/context-classifier.test.ts` -- not just reasoned about,
    checked. Board/ticket data was already always available locally (no separate "inspect"
    step needed); what #11/#13 actually added is that document retrieval no longer fires for
    the first case and does fire for the third._

- [x] **14. Improve recommendation evidence**
  - Sarah should be able to explain why she recommends something.
  - Prefer venture evidence over generic startup advice.
  - Explicitly identify uncertainty when evidence is insufficient.
  - _System-prompt instruction added to both `app/api/ai-analyst/route.ts` and
    `lib/agent/geminiLiveConfig.ts`: state the reasoning behind a recommendation, prefer this
    venture's own evidence over generic advice and say explicitly when falling back to
    generic advice instead, and say plainly when evidence is thin/conflicting rather than
    recommending with false confidence. Prompt-only change -- there's no way to automatically
    verify a model actually follows this, so treat it as directional, not guaranteed; worth
    spot-checking against real conversations._

---

## P1 — Model Routing & Cost Optimisation

- [ ] **15. Build central task-based model router**
  - Select model based on task, complexity, latency, cost and entitlement.

- [ ] **16. Use deterministic code whenever AI is unnecessary**
  - Entitlements.
  - Counters.
  - Usage.
  - Permissions.
  - Board-state calculations.
  - Ticket ageing.
  - Commitment status.

- [ ] **17. Route routine text through cheaper models**
  - Simple BA chat.
  - Summaries.
  - Classification.
  - Extraction.
  - Straightforward ticket operations.

- [ ] **18. Reserve stronger Gemini reasoning for difficult work**
  - Strategy.
  - Conflicting evidence.
  - Prioritisation.
  - Multi-document synthesis.
  - Complex business analysis.

- [ ] **19. Keep Gemini Live focused on voice**
  - Stand-ups.
  - Short business conversations.
  - Interactive voice coaching.
  - Do not use Live unnecessarily for ordinary text workloads.

- [ ] **20. Evaluate Gemma for background workloads**
  - Document preprocessing.
  - Classification.
  - Summaries.
  - Sprint analysis.
  - Candidate learning detection.
  - Only move workloads when quality/cost testing supports it.

---

## P1 — Plan & Usage Guardrails

- [ ] **21. Add text AI fair-use controls**
  - Configurable monthly limits.
  - Cost thresholds.
  - Soft warnings.
  - Cheaper-model fallback where appropriate.
  - Rate/throttle abusive patterns.
  - Server-side enforcement.

- [ ] **22. Add collaborator limits by plan**
  - Keep allowance configurable.
  - Check entitlement server-side before adding another member.
  - Support future paid additional seats.

- [ ] **23. Add active venture limits by plan**
  - Lifetime proposal: 3 active ventures.
  - Keep configurable.
  - Enforce server-side.

- [ ] **24. Add document/storage limits by plan**
  - Finite included allowance.
  - Track usage.
  - Display usage.
  - Prevent silent unlimited storage/processing.

- [ ] **25. Add anomaly detection**
  - Excessive Live reconnects.
  - Abnormal text consumption.
  - Unusual document processing.
  - Rapid storage growth.
  - Suspicious repeated sessions.
  - Unexpected cost spikes.

---

## P2 — Live Voice Top-Ups

- [ ] **26. Design Live minute top-up product**
  - Define minute bundles and prices.
  - Keep pricing configurable.

- [ ] **27. Build top-up checkout**
  - Separate from core subscription/LTD purchase.
  - Lifetime users remain Lifetime after purchasing top-ups.

- [ ] **28. Store top-up balance separately**
  - Included monthly allowance and purchased minutes must remain distinguishable.

- [ ] **29. Define consumption order**
  - Consume included monthly allowance first.
  - Then consume purchased top-up balance.

- [ ] **30. Display top-up balance in Usage & Plan**
  - Included remaining.
  - Purchased remaining.
  - Clear purchase CTA when appropriate.

---

## P2 — Collaboration Intelligence

- [ ] **31. Complete cross-person dependency model**
  - Who is waiting?
  - Who/what are they waiting on?
  - Since when?
  - Which ticket is affected?
  - What action will unblock it?

- [ ] **32. Improve Sarah's team-aware questioning**
  - Address the correct person.
  - Reference their assigned work.
  - Reference their previous commitments.
  - Challenge unresolved dependencies.

- [ ] **33. Complete commitment lifecycle**
  - Pending.
  - Completed.
  - Missed.
  - Carried over.
  - Link to member.
  - Link to ticket when appropriate.
  - Link to originating stand-up.

---

## P2 — Multi-Person Live Stand-Ups

- [ ] **34. Design shared Live room architecture**
  - One shared stand-up.
  - Multiple human participants.
  - Sarah as AI participant.
  - Shared venture/board context.

- [ ] **35. Add participant presence**
  - Joined.
  - Left.
  - Currently present.
  - Attendance history.

- [ ] **36. Add reliable speaker identity**
  - Associate speech with the correct venture member.
  - Sarah must know who said what.

- [ ] **37. Build shared transcript**
  - Speaker-labelled.
  - Venture-scoped.
  - Linked to stand-up session.

- [ ] **38. Persist attendance**
  - `participantId`
  - `joinedAt`
  - `leftAt`
  - `presentAtEnd`

- [ ] **39. Build per-person stand-up commitments**
  - Sarah should know exactly who committed to what.

- [ ] **40. Produce structured stand-up result**
  - Participants.
  - Progress.
  - Blockers.
  - Decisions.
  - Commitments.
  - Dependencies.
  - Risks.
  - Board changes.
  - Follow-ups.

---

## P2 — Retrospective & Learning

- [ ] **41. Improve retrospective intelligence**
  - Planned vs actual.
  - Commitment completion.
  - Carry-over.
  - Unplanned work.
  - Blocker duration.
  - Priority changes.
  - Customer-facing vs internal work.

- [ ] **42. Deepen learning → coaching feedback loop**
  - Repeated behaviours should influence future questioning.
  - High-confidence patterns should influence prioritisation challenges.
  - Avoid treating one-off incidents as permanent founder traits.

---

## P3 — Commercial Analytics

- [ ] **43. Complete LTD cohort analytics**
  - Revenue.
  - AI cost.
  - Live usage.
  - Average variable cost/member.
  - Retention.
  - Support burden.
  - Top-up revenue.
  - Seat/add-on revenue.
  - Gross margin.

- [ ] **44. Keep manual cohort launch gate**
  - Review $400 cohort economics before $500.
  - Review $500 before $600.
  - Review $600 before $700.
  - Never automatically release the next 100.

- [ ] **45. Build launch-readiness test suite**
  - One command/CI job should exercise the critical commercial invariants before a release.

---

# Already Implemented — Do Not Rebuild

Treat these as complete unless testing proves otherwise:

- [x] Server-side Live usage metering
- [x] 300-minute Lifetime Live allowance
- [x] Live entitlement check before session creation
- [x] One active Live session per user
- [x] 30-minute Live session cap
- [x] Live pre-cutoff warning
- [x] Basic idle warning/disconnect
- [x] Stale Live-session reconciliation
- [x] AI cost ledger foundation
- [x] Admin Cost Ops dashboard
- [x] User Usage & Plan screen
- [x] LTD + subscriptions can coexist
- [x] Configurable LTD releases
- [x] Configurable LTD price and quantity
- [x] LTD sold-out handling
- [x] One Lifetime membership per user
- [x] Checkout duplicate-LTD guard
- [x] Unique LTD user constraint
- [x] Atomic LTD inventory claim
- [x] Advisory locking by payment intent
- [x] Advisory locking by user
- [x] Stripe webhook idempotency
- [x] Concurrent duplicate-webhook inventory protection
- [x] Final LTD slot protection
- [x] Global Founding Member numbering
- [x] LTD admin controls
- [x] Manual cohort activation
- [x] Ticket refinement
- [x] Acceptance criteria editing
- [x] Ticket assignment awareness
- [x] Blocked reasons
- [x] Ticket ageing/history
- [x] Agent ticket open/close UI control
- [x] Human confirmation before material ticket mutations
- [x] Stand-up historical reasoning foundation
- [x] Repeated-evidence behavioural learning
- [x] Learning confidence levels

---

# Immediate Implementation Order

Give the coding agent these **first five jobs only** before allowing it to move into later features:

1. **Subscriber → Lifetime conversion**
2. **Automated LTD + Live concurrency/integrity test suite**
3. **Human-presence idle correction**
4. **Proper document RAG**
5. **Context classifier + model router**

Once those are done, FounderAlly moves from primarily being **commercially protected** to improving the thing that will really differentiate it:

> **Sarah knowing the venture, understanding what is happening, and making useful BA decisions from evidence.**
