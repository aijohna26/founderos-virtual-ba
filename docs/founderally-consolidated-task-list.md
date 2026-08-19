# FounderAlly --- Consolidated Product & Commercial Task List

## Usage, Plans, Subscriptions & Lifetime Deal

1.  [ ] **Build central Usage & Entitlements service** --- Make the
    server the source of truth for plans, allowances, Live minutes,
    ventures, collaborators, documents, storage, premium capabilities
    and top-ups.
2.  [ ] **Create configurable plan definitions** --- Support Founder
    Monthly, Founder Annual, future Founder Pro/Team, and Founding
    Lifetime without hard-coding limits throughout the application.
3.  [ ] **Support simultaneous subscription + LTD pricing** --- Normal
    monthly/annual subscriptions and the Lifetime Deal must be able to
    run at the same time.
4.  [ ] **Create independent commercial feature flags** --- At minimum
    support `SUBSCRIPTIONS_ENABLED` and `LTD_ENABLED`; switching LTD off
    must never disable normal pricing.
5.  [ ] **Build configurable LTD pricing** --- Set the active Lifetime
    Deal price in USD from server-side/admin configuration, stored in
    cents, e.g. `$400 = 40000`.
6.  [ ] **Create unique LTD offers** --- Every release gets an immutable
    `offerId`; do not identify offers solely by price.
7.  [ ] **Add LTD offer total** --- Configure how many memberships are
    available in the current release, e.g. `100`.
8.  [ ] **Add LTD offer counter** --- Count only successfully completed
    LTD purchases against the active offer.
9.  [ ] **Calculate LTD remaining quantity** ---
    `remaining = offerTotal - offerCounter`.
10. [ ] **Automatically close sold-out LTD offers** --- When
    `offerCounter >= offerTotal`, mark the offer sold out and prevent
    further checkout.
11. [ ] **Prevent LTD overselling** --- Use atomic/transactional
    server-side fulfilment so two simultaneous purchases cannot sell
    membership #100 twice.
12. [ ] **Make payment fulfilment idempotent** --- A repeated payment
    webhook must never increment the LTD counter twice.
13. [ ] **Reset the offer counter for every new LTD release** --- A new
    price/release creates a new offer beginning at `0`; never erase the
    previous offer.
14. [ ] **Preserve LTD offer history** --- Keep price, quantity, sales,
    dates and revenue for every previous release.
15. [ ] **Implement proposed LTD ladder** --- Release 1: first 100 at
    \$400; Release 2: next 100 at \$500; Release 3: next 100 at \$600;
    Release 4: final 100 at \$700.
16. [ ] **Do not automatically open the next LTD cohort** --- Review
    actual costs, usage and retention before manually activating the
    next release.
17. [ ] **Build global Founding Member numbering** --- Membership
    numbers run continuously from `#001` to `#400` and do not reset when
    the offer counter resets.
18. [ ] **Add Founding 100 recognition** --- Give members #001--#100 a
    permanent Founding 100 designation/badge.
19. [ ] **Create permanent LTD purchase records** --- Store user, offer,
    actual price paid, currency, payment ID, membership number,
    entitlement and purchase date.
20. [ ] **Build LTD admin controls** --- Allow authorised admins to turn
    LTD on/off, create offers, set price, set quantity, activate/close
    offers and inspect sold/remaining/revenue.
21. [ ] **Require confirmation before changing an active LTD offer** ---
    Prevent accidental changes to a live commercial offer.
22. [ ] **Build LTD public pricing state** --- Show price, availability
    and remaining quantity when active; show `Sold Out` when exhausted;
    hide it when disabled.
23. [ ] **Keep subscription pricing available when LTD sells out** ---
    LTD state must never affect monthly/annual checkout.
24. [ ] **Allow existing subscribers to upgrade to Lifetime** --- After
    successful LTD purchase, convert entitlement and safely stop future
    core subscription billing.
25. [ ] **Prevent Lifetime customers accidentally buying the core
    subscription again** --- Recognise their entitlement while still
    allowing paid extras/top-ups.
26. [ ] **Separate Plans from Offers** --- Plans describe what users
    own; offers describe how a plan can currently be purchased.
27. [ ] **Add payment provider integration** --- Handle monthly, annual,
    LTD, future seat upgrades and top-ups with authoritative server-side
    webhooks.
28. [ ] **Connect LTD purchases to Lifetime entitlements** ---
    Successful payment must immediately assign the correct lifetime plan
    and allowances.

## Live Voice, Metering & Cost Control

29. [ ] **Implement 300 Live Voice minutes/month for Lifetime** ---
    Initial allowance; configurable rather than hard-coded.
30. [ ] **Do not roll unused Live minutes over** --- Reset the allowance
    every billing/usage month.
31. [ ] **Meter Gemini Live usage server-side** --- Never trust the
    browser to report remaining usage.
32. [ ] **Track Live usage by user, venture and session** --- Required
    for cost attribution and abuse detection.
33. [ ] **Enforce Live allowance before connection** --- Check
    entitlement and remaining minutes before issuing/authorising a Live
    session.
34. [ ] **Handle exhausted Live allowance gracefully** --- End/prevent
    Live while leaving text chat and the rest of FounderAlly
    operational.
35. [ ] **Build Live Voice top-ups** --- Allow users to purchase
    additional voice minutes without changing their base plan.
36. [ ] **Add 30-minute maximum Live session** --- Configurable by plan.
37. [ ] **Warn before Live session limit** --- Sarah should summarise
    decisions/commitments and ask whether anything important remains.
38. [ ] **Implement Live idle detection** --- Detect meaningful user
    inactivity rather than merely microphone/background noise.
39. [ ] **Add "Are you still there?" behaviour** --- After approximately
    60 seconds of inactivity, Sarah checks whether the participant
    remains present.
40. [ ] **Automatically disconnect after continued inactivity** ---
    After the grace period, save relevant state and terminate Live.
41. [ ] **Handle zombie Live sessions** --- Terminate appropriately
    after prolonged tab disappearance, device sleep, network failure or
    expired authentication.
42. [ ] **Persist useful state before Live disconnect** --- Preserve
    decisions, commitments, transcript/summary and relevant actions.
43. [ ] **Create an AI usage ledger** --- Record model, interaction
    type, tokens, Live minutes, session duration, turns, document
    processing and estimated cost.
44. [ ] **Track actual AI cost per customer** --- Especially important
    for Lifetime accounts.
45. [ ] **Build internal Cost Ops dashboard** --- Show cost/user, Live
    cost, text cost, average session length, heavy users, plan usage and
    estimated margin.
46. [ ] **Track lifetime cohort economics separately** --- Compare
    \$400, \$500, \$600 and \$700 cohorts.
47. [ ] **Add alerts for unusual consumption** --- Flag accounts with
    unexpectedly high Live, text, document or storage usage.
48. [ ] **Target Lifetime variable costs below \~\$3/month** --- Ideally
    \$1--\$2 average; use measured data rather than assumptions.

## AI Model Routing & Company Intelligence

49. [ ] **Build intelligent model routing** --- FounderAlly chooses the
    appropriate model based on task, complexity, latency, reliability,
    entitlement and cost.
50. [ ] **Route routine text conversations through cheaper models** ---
    Do not use premium reasoning for ordinary BA chat.
51. [ ] **Use deterministic code instead of AI where possible** ---
    Sprint completion, counters, entitlement checks, permissions,
    overdue commitments and similar calculations should not require an
    LLM.
52. [ ] **Reserve stronger Gemini reasoning for genuinely difficult
    questions** --- Strategy, conflicting evidence, complex
    prioritisation and business synthesis.
53. [ ] **Keep Gemini Live primarily for real-time voice** --- Stand-ups
    and short voice discussions rather than hours of general
    conversation.
54. [ ] **Evaluate Gemma for background/low-cost workloads** ---
    Document preprocessing, classification, extraction, summaries,
    sprint analysis and candidate learning detection where quality/cost
    justify it.
55. [ ] **Improve company knowledge retrieval/RAG** --- Stop relying
    primarily on injecting document slices into prompts.
56. [ ] **Chunk and index company documents** --- Prepare documents for
    relevant retrieval.
57. [ ] **Detect when company knowledge is required** --- Not every
    command needs document retrieval.
58. [ ] **Retrieve only relevant company knowledge** --- Use the best
    matching document/memory/decision chunks for the current question.
59. [ ] **Keep Sarah continuously company-aware** --- Relevant venture
    knowledge should inform questions and answers without users
    repeatedly saying "look at my documents."
60. [ ] **Combine structured and unstructured context intelligently**
    --- Sprint, board, commitments, blockers and learnings first where
    appropriate; documents where additional business evidence is needed.
61. [ ] **Add evidence/provenance to recommendations** --- Internally
    know which documents, tickets, decisions, commitments or learnings
    support Sarah's conclusion.
62. [ ] **Improve Sarah's decision quality** --- When evidence is
    sufficient, recommend rather than repeatedly asking the user what
    they want.
63. [ ] **Reduce unnecessary clarification questions** --- Sarah should
    use information already present in the venture.
64. [ ] **Make prioritisation business-aware** --- Compare work against
    sprint goals, business risks, customer evidence, assumptions and
    commitments.
65. [ ] **Improve confidence handling** --- Ask questions when evidence
    genuinely is insufficient rather than inventing certainty.
66. [ ] **Continue improving contextual Chat beside the Board** --- The
    founder/team should be able to discuss work with Sarah without
    losing sight of the Kanban board.
67. [ ] **Make Sarah aware of the active workspace/view** --- Board,
    Today, Documents, Retrospective etc. should affect context and
    behaviour.

## Collaboration, Members & Permissions

68. [ ] **Test Resend venture invitation flow end-to-end** --- Send,
    receive, sign in, accept, persist and join.
69. [ ] **Test invitation security** --- Expired, reused, invalid and
    wrong-account invitations must fail safely.
70. [ ] **Test all venture roles and permissions** --- Owner,
    co-founder, member, advisor and external collaborator.
71. [ ] **Test board-edit permissions** --- Restricted users must not
    bypass permissions through API calls.
72. [ ] **Test card assignment thoroughly** --- Single assignee,
    multiple assignees, reassignment and removal.
73. [ ] **Ensure Sarah understands card ownership** --- Know who owns
    what and use assignments during coaching/stand-ups.
74. [ ] **Improve cross-person dependency detection** --- Identify work
    waiting on another venture member.
75. [ ] **Let Sarah challenge the correct person** --- For example,
    "This ticket is waiting on Alex's decision. Alex, can we resolve
    that today?"

## Multi-Person Stand-ups & Accountability

76. [ ] **Build true multi-person Live stand-up rooms** --- Multiple
    humans should be able to participate with Sarah in one shared
    ceremony.
77. [ ] **Add stand-up participant presence** --- Know who joined, left
    and is currently present.
78. [ ] **Add reliable speaker identification** --- Associate statements
    with the correct venture member.
79. [ ] **Create shared stand-up transcript/record** --- Preserve useful
    team discussion in one ceremony record.
80. [ ] **Persist stand-up attendance** --- Record participants and
    relevant join/leave information.
81. [ ] **Create per-person commitments** --- Sarah must know exactly
    who promised what.
82. [ ] **Link commitments to cards where possible** --- Make
    accountability measurable against actual work.
83. [ ] **Complete commitment lifecycle** --- Pending, completed, missed
    and carried over.
84. [ ] **Compare commitments against actual board changes** --- Sarah
    should know whether yesterday's promises were fulfilled.
85. [ ] **Improve stand-up history reasoning** --- Avoid asking
    questions whose answers are already visible from activity since the
    previous stand-up.
86. [ ] **Use ticket ageing intelligently** --- Challenge stuck work,
    oversized work and repeated carry-over.
87. [ ] **Make stand-ups concise by design** --- Focus on progress,
    priorities, blockers, dependencies, decisions and commitments.
88. [ ] **Allow Sarah to recommend board changes during stand-up** ---
    Require appropriate human confirmation before material actions.
89. [ ] **Produce a structured stand-up result** --- Participants,
    progress, blockers, decisions, commitments, dependencies and
    actions.
90. [ ] **Improve retrospective intelligence** --- Compare plan versus
    actual work, commitments, unplanned work, carry-over and blockers.
91. [ ] **Improve real behavioural learning** --- Detect repeated
    patterns from genuine venture history rather than seeded/demo
    behaviour.
92. [ ] **Add confidence/evidence thresholds to learnings** --- One
    incident should not automatically become a permanent behavioural
    conclusion.
93. [ ] **Let learnings influence future coaching** --- Sarah's
    questioning should adapt based on repeated, evidence-backed
    behaviour.

## User-Facing Limits, Add-ons & Commercial Guardrails

94. [ ] **Build user-facing Usage & Plan screen** --- Show current plan,
    Live minutes used/remaining, venture/member allowances and relevant
    storage/document usage.
95. [ ] **Show top-up/upgrade options when appropriate** --- Limits
    should lead to a clear commercial path rather than a dead end.
96. [ ] **Keep commercial limits enforced server-side** --- Feature
    flags and hidden buttons are UX; APIs must independently enforce
    entitlements.
97. [ ] **Build configurable fair-use controls for text AI** --- Avoid
    advertising or implementing effectively unlimited expensive
    inference.
98. [ ] **Add collaborator/seat limits by plan** --- Lifetime includes a
    defined number; additional seats can become recurring/add-on
    revenue.
99. [ ] **Add active venture limits by plan** --- Initial Lifetime
    proposal is three active ventures, but keep it configurable.
100. [ ] **Add document/storage limits by plan** --- Lifetime should
     have a generous but finite included allowance.
101. [ ] **Keep future premium services outside automatic Lifetime
     entitlement** --- New specialist agents, unusually expensive
     models, API access and third-party paid services do not
     automatically become "free forever."
102. [ ] **Build cohort launch analytics** --- Before releasing the next
     100 LTD memberships, review retention, Live usage, cost/user,
     support load, document usage and margin.
103. [ ] **Create commercial launch gate** --- Do not sell the first LTD
     until Live consumption, AI cost and plan limits can be reliably
     measured and enforced.
104. [ ] **Test the full \$400 LTD purchase journey before launch** ---
     Pricing → checkout → payment → webhook → offer counter → Founding
     Member number → entitlement → usage allowance.
105. [ ] **Test the sold-out boundary** --- Specifically test purchases
     #99, #100 and attempted #101 under concurrent checkout conditions.
106. [ ] **Test subscriber → Lifetime conversion** --- Ensure there is
     no double billing and no entitlement loss.
107. [ ] **Test Lifetime → top-up/add-on purchases** --- Core access
     remains Lifetime while variable-cost extras remain purchasable.
108. [ ] **Review economics after the first 100** --- Do not blindly
     launch the \$500 cohort; confirm the Lifetime model is financially
     sustainable first.

------------------------------------------------------------------------

## Recommended Build Order

1.  **Usage & Entitlements + LTD foundations**
2.  **Live Voice metering, caps, idle protection and cost control**
3.  **AI model routing and company knowledge/RAG**
4.  **Collaboration testing and permissions**
5.  **Multi-person Live stand-ups**
6.  **Billing, top-ups and LTD launch**
7.  **Cohort analytics and economics review**

## Commercial Launch Gate

Before accepting **FounderAlly Founding Member #001's \$400**,
FounderAlly must be able to:

-   know exactly what the customer bought;
-   enforce the included entitlements server-side;
-   meter Live Voice and other variable AI consumption;
-   know what that consumption costs;
-   prevent accidental or deliberate usage beyond plan limits;
-   prevent LTD overselling;
-   keep subscriptions and LTD available simultaneously when configured;
-   safely convert subscribers to Lifetime;
-   preserve each LTD cohort's historical pricing and sales data.
