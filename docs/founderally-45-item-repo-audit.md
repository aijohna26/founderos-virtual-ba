# FounderAlly — 45-Item Repo Audit

## Summary

This audit compares the current FounderAlly repository against the 45-item implementation TODO.

**Legend**
- 🟢 Implemented enough to mark done
- 🟡 Substantial work exists, but acceptance criteria/testing are incomplete
- 🔴 Not meaningfully implemented yet

## Overall Scorecard

- 🟢 **13 complete**
- 🟡 **17 partially complete / needs testing or finishing**
- 🔴 **15 still to build**

The codebase has made strong progress on commercial safety. The main remaining gaps are now:

1. Cost Ops
2. User Usage & Plan page
3. Subscriber → Lifetime conversion
4. Human-presence-based idle detection
5. Real concurrency/integration testing
6. Proper RAG
7. Intelligent context/model routing
8. Multi-person Live stand-ups

---

# Audit

| # | Task | Status | Audit result |
|---:|---|:---:|---|
| 1 | Server-side Live Voice metering | 🟢 | Persistent `live_usage_sessions`, server-created sessions and server-authoritative accounting exist. |
| 2 | Lifetime 300-minute allowance | 🟢 | `lifetime: 300` is centralized in `LIVE_MINUTES_BY_PLAN`; calendar-month usage is used. |
| 3 | Entitlement before Live token | 🟢 | Live now resolves plan/allowance and atomically reserves a session before granting Live access. |
| 4 | 30-minute session maximum | 🟢 | 30-minute hard cap + 3-minute warning implemented. |
| 5 | Idle timeout | 🟡 | 60-sec warning + 45-sec grace + disconnect exists, but AI/tool activity also resets idle, so it is not yet purely measuring human presence. |
| 6 | AI cost ledger | 🟡 | Text, Live and TTS cost recording exists. Document/background-job recording is not fully wired. |
| 7 | Internal Cost Ops dashboard | 🔴 | LTD admin exists, but not the full cost/user/model/cohort analytics dashboard. |
| 8 | Atomic LTD slot claim | 🟢 | `claim_ltd_offer_slot` atomically increments inventory and serializes concurrent purchases. |
| 9 | Stripe webhook idempotency | 🟢 | Stripe payment intent is the purchase primary key and the RPC returns an existing purchase on replay. |
| 10 | Founding Member numbering | 🟢 | Global Postgres sequence + unique membership number implemented. |
| 11 | User Usage & Plan screen | 🔴 | `/account` currently uses Clerk `UserProfile`; it does not show the FounderAlly-specific Live allowance dashboard. |
| 12 | Live Voice top-ups | 🔴 | No top-up balance/payment/consumption layer found. |
| 13 | Subscriber → Lifetime conversion | 🔴 | Subscription persistence exists, but there is no reliable cancellation/conversion workflow when LTD is purchased. |
| 14 | Prevent Lifetime user rebuying subscription | 🟡 | Entitlement awareness exists in places, but complete checkout/UI prevention is not evident. |
| 15 | LTD + subscriptions simultaneously | 🟢 | They are deliberately separate: Clerk recurring billing + Stripe LTD. |
| 16 | LTD admin safety | 🟢 | Create, activate, close, price, quantity, sales/revenue and confirmation UX exist. |
| 17 | Real document RAG | 🔴 | No dedicated embedding/chunking/vector retrieval system found; documents are still principally provided directly to agent context. |
| 18 | Context classifier | 🔴 | No clear central classifier/router determining board-only vs document retrieval vs broader business context. |
| 19 | Recommendation provenance | 🟡 | Sarah is instructed to cite/use documents as evidence and receives structured business state, but there is not yet a formal provenance structure. |
| 20 | Decision behaviour | 🟡 | Prompts and sprint context are much stronger, but this remains model-behaviour driven rather than a robust prioritisation engine. |
| 21 | Blocked-ticket behaviour | 🟡 | `blockedReason` is strong and blockers surface to Sarah; dependency ownership, blocker type and explicit unblock workflow are not complete. |
| 22 | Ticket refinement workflow | 🟢 | Full ticket retrieval, acceptance criteria editing, assignment, dates, priority, linked assumptions and confirmation flow are present. |
| 23 | Fully test Resend invite flow | 🟡 | Implementation exists, including signed expiring invitations and acceptance; full end-to-end verification is not demonstrated. |
| 24 | Fully test venture roles | 🟡 | Roles and permission fields exist; full UI + API authorization test coverage is not demonstrated. |
| 25 | Fully test multi-assignee cards | 🟡 | `assigneeIds` and agent awareness exist, but full verification is still needed. |
| 26 | Cross-person dependency detection | 🟡 | Sarah understands members/assignees, but there is not yet a mature explicit dependency engine. |
| 27 | Shared multi-person Live room | 🔴 | Current Live architecture is still fundamentally one Live client/session, not a Miro/Meet-style shared audio room. |
| 28 | Speaker identification | 🔴 | No robust multi-speaker identity/diarisation layer found. |
| 29 | Persist stand-up attendance | 🟡 | Stand-up participants are represented, but the full `joinedAt / leftAt / presentAtEnd` attendance model is not clearly complete. |
| 30 | Per-person commitments | 🟡 | Team context exists, but commitments are not clearly at the complete member/session/ticket lifecycle described in the TODO. |
| 31 | Structured stand-up summary | 🟡 | Sessions/history/activity are persisted, but the complete decisions + dependencies + risks + follow-ups schema is not fully evident. |
| 32 | Stand-up historical reasoning | 🟢 | `ticketActivity`, stand-up summaries and the prep engine explicitly compare recent board activity and previous stand-ups. |
| 33 | Retrospective intelligence | 🟡 | Sprint analysis exists, but plan-vs-actual/unplanned/customer-facing/internal analysis is not yet comprehensive. |
| 34 | Learning confidence thresholds | 🟢 | Pattern detector uses Low/Medium/High and requires repeated sprint evidence before creating patterns. |
| 35 | Learnings influence coaching | 🟡 | Relevant learnings are loaded into stand-up preparation, but adaptive coaching can go significantly deeper. |
| 36 | Task-based model router | 🔴 | Models are configured, but there is no real task/cost/complexity router choosing models dynamically. |
| 37 | Evaluate/use Gemma background tasks | 🔴 | No meaningful Gemma processing pipeline found in the current agent layer. |
| 38 | Anomaly detection | 🔴 | No dedicated excessive-use/reconnect/storage anomaly detector found. |
| 39 | Text fair-use controls | 🔴 | Text cost is now measured, but there is not yet a configurable text entitlement/throttle layer. |
| 40 | Collaborator limits by plan | 🔴 | Collaboration exists; commercial seat allowances by entitlement do not appear complete. |
| 41 | Active venture limits by plan | 🔴 | No robust plan-based active venture enforcement found. |
| 42 | Document/storage limits by plan | 🔴 | Persistence exists; finite plan storage/document quotas are not implemented. |
| 43 | Cohort analytics | 🟡 | LTD sales/revenue and AI cost primitives exist, but retention, cohort cost, support load, top-up and collaborator analytics are not unified. |
| 44 | Cohort launch gate | 🟢 | New LTD releases are created closed and require deliberate activation; the next cohort does not automatically launch. |
| 45 | Test purchases #99/#100/#101 | 🟡 | The database design should handle it correctly, but there is no evidence the concurrency test itself has been executed. |

---

# Highest Priority Next Work

1. **Build Cost Ops**
2. **Build FounderAlly Usage & Plan UI**
3. **Finish Subscriber → Lifetime conversion**
4. **Fix human-presence idle logic**
5. **Execute real concurrency/integration tests**
6. **Build proper RAG**
7. **Add context classifier**
8. **Build task-based model routing**
9. **Add plan-level fair-use / seat / venture / storage limits**
10. **Build true multi-person Live stand-ups**

---

# Current Launch Assessment

Before selling **Founding Member #001**, the remaining launch-critical areas I would want verified are:

- [ ] Cost Ops exists
- [ ] User can see their Live allowance
- [ ] Subscriber → Lifetime conversion is safe
- [ ] Human-presence idle behaviour is correct
- [ ] Atomic LTD purchase flow is concurrency-tested
- [ ] Live reservation is concurrency-tested
- [ ] Stale-session reconciliation is tested
- [ ] Stripe webhook replay is tested

After those are complete, FounderAlly is much closer to being commercially ready for:

**Founding 100 — $400 Lifetime Deal**

The next major differentiator after commercial safety should be:

> **Proper RAG + intelligent context routing so Sarah genuinely understands the company rather than simply receiving a lot of context.**
