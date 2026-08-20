# FounderAlly — Next Implementation TODO

## Goal

Move FounderAlly from “working product with pricing/LTD shell” to “commercially safe product ready to sell the first Lifetime Deal”.

The biggest remaining risk is no longer checkout.

The biggest remaining risk is **usage control and unit economics**.

Do not add unrelated product features until the P0 tasks below are complete.

---

# P0 — MUST COMPLETE BEFORE SELLING LTD

## 1. Build server-side Live Voice usage metering

- Create a persistent usage ledger in Supabase.
- Track usage by:
  - userId
  - ventureId
  - sessionId
  - planId
  - model
  - Live input minutes
  - Live output minutes
  - total session duration
  - createdAt
- Server must be authoritative.
- Never trust a frontend minute counter.
- Every Live session must have a server-generated session record.
- Usage must survive refresh/device changes.

### Acceptance criteria

- User starts Live session.
- Server creates usage session.
- Usage is incremented while session runs.
- User refreshes browser.
- Remaining allowance is unchanged and correct.
- User logs in on another device.
- Same remaining allowance is shown.

---

## 2. Implement Lifetime 300-minute monthly Live allowance

- Founding Lifetime plan should default to:
  - 300 Live minutes/month
  - no rollover
- Keep allowance configurable in plan data.
- Do not hard-code this throughout the app.
- Add monthly usage period tracking.
- Automatically reset allowance at the start of a new usage period.

### Acceptance criteria

Given:
- Lifetime allowance = 300 minutes
- user has used 42 minutes

Then:
- remaining = 258 minutes
- next session must be blocked once remaining reaches 0

---

## 3. Enforce entitlement before issuing Gemini Live session

Before `/api/live-session` returns a usable Live token:

1. Authenticate user.
2. Resolve active plan.
3. Resolve Live allowance.
4. Resolve minutes already used.
5. Reject if exhausted.
6. Start/attach usage session.
7. Only then provision Gemini Live token.

Return a clear response such as:

```json
{
  "error": "Live Voice allowance exhausted",
  "code": "LIVE_ALLOWANCE_EXHAUSTED"
}
```

Text chat and the rest of FounderAlly must remain available.

---

## 4. Add 30-minute maximum Live session

- Default Lifetime session max = 30 minutes.
- Keep configurable by plan.
- Track elapsed session time.
- Warn user before hard cutoff.

Suggested behaviour:

At ~27 minutes:

> “We’re nearly at the end of this session. I’ve captured the key decisions and commitments. Is there anything important we need to resolve before we finish?”

At 30 minutes:

- save summary
- save commitments
- close Live session cleanly
- update usage
- disconnect

---

## 5. Implement idle timeout

Detect meaningful inactivity.

Do not reset idle timer from random background noise.

Suggested flow:

### After ~60 seconds of no meaningful user interaction

Sarah says:

> “Are you still there?”

### If no meaningful response after another 30–60 seconds

Sarah says:

> “I’ll end the call here. I’ve saved where we got to.”

Then:

- save relevant state
- finalize usage
- disconnect Live

Also terminate stale sessions caused by:
- sleeping laptop
- browser tab left open
- broken network
- abandoned connection

---

## 6. Build AI cost ledger

Track enough information to calculate actual cost per customer.

Persist:

```ts
{
  userId,
  ventureId,
  planId,
  sessionId,
  model,
  interactionType,
  inputTokens,
  outputTokens,
  liveInputMinutes,
  liveOutputMinutes,
  sessionDuration,
  documentProcessingUsage,
  estimatedCostUsd,
  createdAt
}
```

Do this for:
- Live Voice
- text AI
- document processing
- background intelligence jobs

---

## 7. Build internal Cost Ops dashboard

Admin-only.

Show:

- AI cost this month
- cost by user
- cost by plan
- cost by LTD cohort
- Live minutes/user
- average stand-up duration
- text usage
- document processing cost
- top 10 most expensive accounts
- accounts approaching usage caps
- estimated gross margin

Important filters:

- date range
- plan
- Lifetime cohort
- user
- venture

---

## 8. Verify LTD slot claiming is atomic

The LTD system already exists.

Now verify the purchase claim itself.

Test:

- offer has 1 slot remaining
- two Stripe webhooks arrive nearly simultaneously
- only one purchase is accepted
- only one Founding Member number is assigned
- offer ends at exactly sold/total
- second purchase is safely rejected/refunded/handled

Use DB constraints / transaction / RPC if needed.

Do not rely only on application-level checks.

---

## 9. Verify Stripe webhook idempotency

Repeated webhook delivery must not:

- increment quantitySold twice
- create duplicate purchase rows
- assign multiple Founding Member numbers
- assign Lifetime entitlement twice

Use Stripe event ID/payment intent/session ID as an idempotency key.

---

## 10. Verify Founding Member numbering

Ensure global numbering works independently of offer counters.

Expected:

```text
Offer 1
$400
#001–#100

Offer 2
$500
#101–#200

Offer 3
$600
#201–#300

Offer 4
$700
#301–#400
```

The per-offer counter resets.

The global member number never resets.

Add DB uniqueness constraint to member number.

---

# P1 — COMMERCIAL EXPERIENCE

## 11. Build User Usage & Plan screen

User should be able to see:

- current plan
- Lifetime/Monthly/Annual status
- Founding Member number if applicable
- Live minutes used
- Live minutes remaining
- next reset date
- max session duration
- active ventures / allowed ventures
- collaborators / allowed collaborators
- document/storage usage
- upgrade/top-up buttons

Example:

```text
Founding Lifetime Member #042

Live Voice
73 / 300 minutes used
227 minutes remaining
Resets Sep 1

Maximum Live session: 30 min
```

---

## 12. Add Live Voice top-ups

Support paid extra Live minutes.

Requirements:

- top-up balance tracked separately from monthly allowance
- use monthly allowance first
- then consume top-up balance
- clear user-facing usage
- server-side enforcement

Do not implement rollover of included monthly minutes.

---

## 13. Verify subscriber -> Lifetime conversion

If a current subscriber buys LTD:

- grant Lifetime entitlement
- do not leave them paying monthly/annual indefinitely
- schedule/cancel recurring plan appropriately
- ensure they keep access during transition
- avoid double billing

Show clear confirmation before purchase.

---

## 14. Prevent Lifetime user from buying core subscription again

If user already has Lifetime:

- do not show standard core subscription CTA as available
- instead show:
  - Lifetime active
  - optional top-ups
  - extra seats
  - premium add-ons

---

## 15. Keep LTD + subscriptions simultaneously available

Normal recurring pricing must work whether LTD is:

- enabled
- disabled
- active
- sold out

LTD sold out must never affect recurring checkout.

---

## 16. Add LTD admin safety

Admin should be able to:

- enable/disable LTD
- create offer
- set USD price
- set quantity
- activate
- close
- inspect sold/remaining/revenue

Changing active offer should require explicit confirmation.

Do not mutate historical offer rows.

Create new offer for new release.

---

# P1 — AI INTELLIGENCE

## 17. Build real document retrieval / RAG

Current document context injection is not enough.

Implement:

1. document ingestion
2. chunking
3. embeddings/indexing
4. relevant chunk retrieval
5. source metadata
6. response grounding

Do not send large slices of every document on every question.

---

## 18. Add context classifier

Before responding, determine what context is required.

Examples:

### Command

> “Move ticket 43 to Done.”

Need:
- board
- ticket

No document retrieval needed.

### Priority question

> “What should we focus on today?”

Need:
- sprint goal
- current board
- blockers
- commitments
- recent learnings
- maybe documents only if business evidence is required

### Business question

> “Should we target accountants or agencies?”

Need:
- customer research
- ICP docs
- previous decisions
- assumptions
- relevant memories

---

## 19. Add provenance to BA answers

Internally track why Sarah gave a recommendation.

Possible sources:

- ticket
- sprint goal
- commitment
- document
- customer research
- learning
- previous decision

When useful, Sarah can say:

> “Based on the pricing interviews in ‘Customer Discovery Notes’ and the current sprint goal…”

Do not invent evidence.

---

## 20. Improve decision behaviour

Sarah should not ask unnecessary questions when she has enough information.

Bad:

> “Which ticket should we focus on?”

when the board already clearly indicates the highest-risk priority.

Good:

> “Customer interviews are still the highest priority because they directly test the sprint goal. I’d move prototype polish behind them.”

---

## 21. Improve blocked-ticket behaviour

Current `blockedReason` work is good.

Extend it:

- never allow Blocked with no reason
- surface blockers in stand-up
- identify dependency owner
- identify how long blocked
- ask whether blocker is:
  - decision
  - person
  - technical
  - dependency
  - unknown
- propose explicit unblock action

---

## 22. Improve ticket refinement workflow

When a user asks Sarah to review a ticket:

1. fetch full ticket
2. inspect:
   - title
   - description
   - acceptance criteria
   - assignees
   - due date
   - priority
   - linked assumption
3. identify gaps
4. propose changes
5. wait for confirmation
6. apply changes
7. confirm authoritative result

Never silently replace acceptance criteria unless explicitly agreed.

---

# P1 — COLLABORATION

## 23. Fully test Resend invite flow

Test:

- invite email sent
- secure link works
- unauthenticated user signs in
- invited email matches
- invite accepted
- membership created
- venture visible
- permissions correct
- link expires correctly
- reused link fails
- invalid token fails

---

## 24. Fully test venture roles

Test:

- owner
- cofounder
- member
- advisor
- external

Test both:
- UI restrictions
- API/server restrictions

Never rely only on hidden buttons.

---

## 25. Fully test multi-assignee cards

Support:

- no assignee
- one assignee
- multiple assignees
- reassignment
- removal

Sarah must reason using actual assignees.

---

## 26. Improve cross-person dependency detection

If one member's work depends on another member:

Sarah should detect and surface it.

Example:

> “Prototype testing is waiting on Priya’s copy review. Priya, can you commit to completing that today?”

---

# P2 — MULTI-PERSON LIVE STAND-UPS

## 27. Build shared Live stand-up room

Support multiple human participants with Sarah in one ceremony.

Need:

- shared session ID
- participants
- presence
- join/leave
- audio streams
- shared transcript
- shared board context

Do not fake this as multiple browser-local sessions.

---

## 28. Add speaker identification

Each statement must be attributable to a venture member.

Sarah should be able to say:

> “Alex, yesterday you committed to three pricing interviews.”

not:

> “Someone said…”

---

## 29. Persist stand-up attendance

Store:

```ts
{
  standupId,
  ventureId,
  participantId,
  joinedAt,
  leftAt,
  presentAtEnd
}
```

---

## 30. Create per-person commitments

A commitment should include:

```ts
{
  memberId,
  ventureId,
  standupId,
  ticketId?,
  text,
  dueDate,
  status
}
```

Statuses:

- pending
- completed
- missed
- carried_over

---

## 31. Build structured stand-up summary

After stand-up persist:

- participants
- progress
- blockers
- decisions
- commitments
- board changes
- dependencies
- risks
- follow-ups
- learnings

---

## 32. Improve stand-up historical reasoning

Sarah should compare:

- previous commitments
- current board
- ticket movements
- blocked items
- completed work
- unplanned work

Avoid asking for facts already visible in the system.

---

# P2 — LEARNING & RETROSPECTIVE

## 33. Improve retrospective intelligence

Compare:

- planned vs actual
- commitments vs completion
- carried-over tickets
- unplanned work
- blockers
- priority switching
- customer-facing vs internal work

---

## 34. Add confidence thresholds for behavioural learning

Do not create a durable founder/team behaviour from one isolated event.

Use:

- Low confidence
- Medium confidence
- High confidence

Require repeated evidence before strong coaching changes.

---

## 35. Make learnings influence future coaching

Example:

If customer validation slipped three times:

Sarah should become more direct when new polish work appears.

Learning should affect future:

- questioning
- prioritisation
- stand-up preparation
- retrospective recommendations

---

# P2 — MODEL ROUTING

## 36. Build task-based model router

Route requests based on task.

Use:

### Deterministic code
- counters
- board state
- permissions
- entitlement calculations
- usage limits

### Cheaper text models
- ordinary BA chat
- ticket summaries
- extraction
- categorisation
- straightforward actions

### Stronger Gemini
- complex prioritisation
- conflicting evidence
- business strategy
- multi-document synthesis

### Gemini Live
- real-time voice only

---

## 37. Evaluate Gemma for background tasks

Candidate jobs:

- document preprocessing
- summarisation
- ticket classification
- acceptance-criteria suggestions
- sprint-history analysis
- candidate learning detection

Do not switch workloads to Gemma unless quality and total operating cost are actually better.

---

# P2 — COST & ABUSE PROTECTION

## 38. Add anomaly detection

Flag:

- unusually long Live use
- repeated reconnects
- excessive text usage
- extreme document processing
- abnormal storage growth

---

## 39. Add fair-use controls for text

Do not market or technically expose unlimited expensive AI.

Support configurable thresholds per plan.

Prefer:
- soft warnings
- cheaper model routing
- temporary throttling

before hard failure where possible.

---

## 40. Add collaborator limits by plan

Example Lifetime initial proposal:

- 1 founder
- 2–3 included collaborators

Additional seats can be paid.

Keep limits configurable.

---

## 41. Add active venture limits by plan

Initial Lifetime proposal:

- 3 active ventures

Keep configurable.

---

## 42. Add document/storage limits by plan

Lifetime must have a generous but finite allowance.

Track usage server-side.

---

# P3 — LTD COHORT OPERATIONS

## 43. Build cohort analytics

Track:

- release
- price
- members
- revenue
- average AI cost
- average Live minutes
- retention
- support burden
- top-up revenue
- collaborator usage

---

## 44. Create cohort launch gate

Do not automatically release the next 100.

Before moving:

```text
$400 -> $500
$500 -> $600
$600 -> $700
```

review:

- gross margin
- AI cost
- Live usage
- retention
- abuse
- support
- product stability

---

## 45. Test LTD purchase #99 / #100 / #101

Run concurrency tests.

Expected:

- #99 succeeds
- #100 succeeds
- #101 cannot claim an oversold slot

Also test duplicate webhook delivery.

---

# CURRENT LAUNCH GATE

Do not sell Founding Member #001 until all of these are true:

- [ ] Live usage is metered server-side
- [ ] Lifetime allowance is enforced
- [ ] 30-minute session cap works
- [ ] idle timeout works
- [ ] cost per user can be measured
- [ ] LTD claim is atomic
- [ ] Stripe webhook is idempotent
- [ ] Founding Member numbering is unique
- [ ] user can see remaining usage
- [ ] subscriber -> Lifetime conversion is safe

Only then open:

**Founding 100 — $400**

---

# DO NOT PRIORITISE YET

Do not spend the next implementation cycle on:

- more advisor avatars
- more dashboards
- more specialist AI agents
- CRM
- sales automation
- finance features
- marketing agents
- unrelated integrations

The immediate goal is:

> **Make FounderAlly commercially safe, measurable, durable and genuinely intelligent enough to sell.**
