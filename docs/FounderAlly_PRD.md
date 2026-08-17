# FounderAlly --- Product Requirements Document (PRD)

**Version:** 0.1\
**Status:** Draft\
**Product:** FounderAlly\
**Primary domain:** getfounderally.com\
**Product category:** AI Business Analyst for founders

------------------------------------------------------------------------

## 1. Product Summary

FounderAlly is an AI-powered Business Analyst designed to help founders
move from an early idea to a validated, planned and executable business.

The core proposition is not simply "chat with AI." FounderAlly should
behave like an **AI BA working alongside the founder**: asking
structured questions, analysing the business, challenging assumptions,
identifying gaps, researching decisions, documenting requirements and
turning uncertainty into actionable work.

The product should make a solo founder or small founding team feel as
though they have a capable Business Analyst available whenever they need
one.

### Core promise

> **Your AI Business Analyst for every founder decision.**

FounderAlly helps founders understand:

-   What problem they are solving.
-   Who they are solving it for.
-   Whether the opportunity is worth pursuing.
-   What should be built first.
-   What assumptions need validating.
-   What requirements are missing.
-   What the next highest-value action should be.
-   What progress has been made and what is blocking the business.

------------------------------------------------------------------------

## 2. Problem

Early-stage founders frequently have an idea but lack the structured
analytical support required to turn that idea into a viable product and
business.

Common problems include:

-   Building before properly validating the problem.
-   Unclear customer segments.
-   Weak or untested assumptions.
-   Poorly defined MVP scope.
-   Feature creep.
-   No structured requirements.
-   Decisions based on instinct without sufficient evidence.
-   Difficulty translating strategy into executable tasks.
-   Fragmented research, notes, documents and plans.
-   Limited access to experienced Business Analysts or product
    professionals.

General-purpose AI can answer questions, but founders still need to know
**what to ask** and how to turn the answers into a coherent business
process.

FounderAlly solves this by proactively guiding the founder through that
process.

------------------------------------------------------------------------

## 3. Target Users

### Primary user

**Solo founder / first-time founder**

A person developing a startup idea who may have strong domain knowledge
but limited experience in business analysis, product discovery or
structured product development.

### Secondary users

-   Technical founders.
-   Non-technical founders.
-   Small founding teams.
-   Indie hackers.
-   Startup studio participants.
-   Accelerators and incubators.
-   Product managers working on new ventures.

------------------------------------------------------------------------

## 4. Product Positioning

FounderAlly should be positioned as an **AI Business Analyst**, not
merely another AI productivity tool.

The user should immediately understand:

> "I am getting an AI BA that will analyse my idea and help me work out
> what to do next."

### Positioning hierarchy

**FounderAlly**\
**Your AI Business Analyst**

Analyse → Validate → Define → Plan → Execute → Learn

The AI should feel like an active collaborator rather than a passive
chatbot.

------------------------------------------------------------------------

## 5. Product Principles

### 5.1 Ask before assuming

The AI BA should gather missing information instead of inventing
business context.

### 5.2 Challenge the founder

FounderAlly should not automatically agree with ideas. It should
identify weak assumptions, contradictions and missing evidence.

### 5.3 Evidence over opinion

Recommendations should distinguish between:

-   Founder-provided facts.
-   Assumptions.
-   AI inference.
-   External evidence/research.

### 5.4 Convert conversation into work

Useful discussion should become structured outputs such as requirements,
decisions, hypotheses, tasks, reports and roadmap items.

### 5.5 Maintain business context

The founder should not repeatedly explain their startup. FounderAlly
should build and maintain a structured understanding of the venture.

### 5.6 Always provide a next step

Analysis should lead to action.

------------------------------------------------------------------------

## 6. Core User Journey

### Stage 1 --- Founder onboarding

The founder creates a workspace and describes their idea.

FounderAlly begins a structured BA discovery interview covering:

-   Business idea.
-   Problem.
-   Proposed solution.
-   Target customers.
-   Existing alternatives.
-   Revenue model.
-   Founder goals.
-   Current stage.
-   Constraints.
-   Existing research or evidence.

The system creates an initial **Business Context**.

### Stage 2 --- Business analysis

FounderAlly analyses the information and identifies:

-   Known facts.
-   Assumptions.
-   Unknowns.
-   Risks.
-   Contradictions.
-   Research gaps.

The founder receives an initial assessment and recommended next steps.

### Stage 3 --- Validation

FounderAlly helps the founder validate key assumptions.

Possible activities:

-   Customer interview planning.
-   Market research.
-   Competitor analysis.
-   Problem validation.
-   Persona development.
-   Value proposition testing.
-   Pricing hypotheses.
-   Landing-page experiments.

### Stage 4 --- Product definition

Once sufficient evidence exists, FounderAlly helps define:

-   MVP.
-   Features.
-   User journeys.
-   Functional requirements.
-   Non-functional requirements.
-   User stories.
-   Acceptance criteria.
-   Dependencies.
-   Risks.

### Stage 5 --- Planning and execution

Validated work becomes:

-   Roadmap items.
-   Sprints.
-   Tasks.
-   Experiments.
-   Decisions.
-   Documents.

### Stage 6 --- Continuous analysis

FounderAlly monitors the venture context and continuously asks:

> "Given what we now know, what should the founder do next?"

------------------------------------------------------------------------

## 7. Core Features

### 7.1 AI Business Analyst

The central conversational interface.

The AI BA should be capable of:

-   Conducting structured discovery.
-   Asking follow-up questions.
-   Analysing founder responses.
-   Identifying missing information.
-   Challenging assumptions.
-   Recommending next actions.
-   Producing structured BA artefacts.
-   Referencing existing venture context.

Suggested prompts visible in the interface:

-   Is my idea a good opportunity?
-   Who are my target customers?
-   What assumptions should I validate?
-   What should my MVP contain?
-   How should I price my product?
-   What should I work on next?

------------------------------------------------------------------------

### 7.2 Business Context / Venture Memory

A persistent structured model of the startup.

Suggested objects:

-   Company.
-   Founder.
-   Problem.
-   Solution.
-   Customer segments.
-   Personas.
-   Competitors.
-   Market.
-   Value proposition.
-   Business model.
-   Assumptions.
-   Evidence.
-   Risks.
-   Decisions.
-   Requirements.
-   Experiments.
-   Metrics.

FounderAlly uses this context across future conversations and analyses.

------------------------------------------------------------------------

### 7.3 Assumption Register

FounderAlly automatically detects statements that have not yet been
validated.

Each assumption should contain:

-   Statement.
-   Category.
-   Importance.
-   Confidence.
-   Evidence.
-   Risk if incorrect.
-   Validation method.
-   Status.

Statuses:

`Untested → Testing → Supported → Rejected`

------------------------------------------------------------------------

### 7.4 Problem Validation

FounderAlly helps determine whether a meaningful customer problem
exists.

Outputs can include:

-   Problem statement.
-   Customer pain points.
-   Existing alternatives.
-   Evidence strength.
-   Validation score.
-   Outstanding questions.

------------------------------------------------------------------------

### 7.5 Market Analysis

FounderAlly helps analyse:

-   Market categories.
-   Customer segments.
-   Competitors.
-   Alternatives.
-   Differentiators.
-   Market opportunities.
-   Risks.

Where external research is used, sources should be clearly separated
from AI inference.

------------------------------------------------------------------------

### 7.6 MVP Definition

FounderAlly converts validated problems into a proposed MVP.

The system should classify features as:

-   Essential.
-   Valuable.
-   Later.
-   Reject / unnecessary.

Each MVP feature should link back to the customer problem or evidence
that justifies it.

------------------------------------------------------------------------

### 7.7 Requirements Workspace

FounderAlly generates and maintains:

-   Epics.
-   Features.
-   User stories.
-   Acceptance criteria.
-   Business rules.
-   Functional requirements.
-   Non-functional requirements.
-   Dependencies.

Requirements should remain editable by the founder.

------------------------------------------------------------------------

### 7.8 Founder Roadmap

A visual progression through startup development.

Example stages:

`Ideate → Validate → Build → Launch → Grow → Raise`

Each stage contains objectives and recommended activities.

------------------------------------------------------------------------

### 7.9 Sprints

Founders can create focused execution cycles.

A sprint contains:

-   Goal.
-   Duration.
-   Tasks.
-   Experiments.
-   Requirements.
-   Success criteria.
-   Progress.

FounderAlly should recommend sprint content based on the venture's
highest-priority risks and objectives.

------------------------------------------------------------------------

### 7.10 Tasks

Tasks can originate from:

-   Founder input.
-   AI recommendations.
-   Requirements.
-   Validation experiments.
-   Sprint planning.

Each task includes:

-   Title.
-   Description.
-   Priority.
-   Owner.
-   Due date.
-   Status.
-   Related business objective.

------------------------------------------------------------------------

### 7.11 AI Recommendations

The dashboard should contain a prominent **AI Analyst Recommendations**
section.

Example recommendations:

-   Validate the pricing model.
-   Interview five target customers.
-   Remove two low-value MVP features.
-   Investigate a newly identified competitor.
-   Resolve a contradictory assumption.

Each recommendation should explain **why it matters**.

------------------------------------------------------------------------

### 7.12 Documents and Reports

FounderAlly should generate structured documents from the business
context.

Examples:

-   Business analysis report.
-   Market analysis.
-   Competitor analysis.
-   Lean Canvas.
-   Product requirements document.
-   MVP specification.
-   User stories.
-   Customer interview guide.
-   Validation report.
-   Investor briefing.
-   Sprint plan.

------------------------------------------------------------------------

## 8. Dashboard

The dashboard should answer four questions immediately:

1.  Where is my startup?
2.  What have we learned?
3.  What is most important now?
4.  What should I do next?

### Suggested dashboard components

**Startup stage**

Current stage and progression.

**Problem validation**

Example:

`87% — Strong signal`

**Top risks**

Highest-risk assumptions or unresolved issues.

**Recommended next step**

One prominent recommendation.

**AI Analyst Recommendations**

A short ranked list.

**Current sprint**

Progress and outstanding work.

**Recent learning**

Important evidence or decisions added recently.

------------------------------------------------------------------------

## 9. AI BA Interaction Model

The experience should not resemble a blank ChatGPT window.

FounderAlly should initiate structured interactions when appropriate.

Example:

**Founder:**\
"I want to build an app that helps freelancers manage invoices."

**FounderAlly:**\
"Before we discuss features, I want to understand the problem. How are
the freelancers you're targeting currently managing invoices?"

The system continues until sufficient information exists to create or
update the relevant business artefacts.

The conversation should visibly affect the workspace.

For example:

`Conversation → Assumption discovered → Assumption Register updated`

or:

`Conversation → Requirement agreed → MVP specification updated`

------------------------------------------------------------------------

## 10. AI Outputs

Every significant AI analysis should be capable of producing structured
output.

Recommended response structure:

### Finding

What FounderAlly has identified.

### Evidence

What information supports the finding.

### Confidence

Low / Medium / High.

### Why it matters

Business impact.

### Recommended action

What the founder should do.

### Update workspace

Optional action to create/update the relevant artefact.

------------------------------------------------------------------------

## 11. Homepage Requirements

The homepage must immediately communicate that FounderAlly provides an
**AI Business Analyst**.

### Hero

Suggested eyebrow:

**YOUR AI BUSINESS ANALYST & CO-FOUNDER**

Suggested headline:

> **Your AI Business Analyst for every founder decision.**

Supporting copy:

> FounderAlly analyses your idea, challenges assumptions and turns what
> you learn into clear requirements, plans and next steps.

Primary CTA:

**Chat with AI Analyst**

Secondary CTA:

**See How It Works**

### Hero product visual

The product mock-up should prominently show:

-   AI Business Analyst panel.
-   Business insights.
-   Problem validation.
-   Market analysis.
-   Recommended next step.
-   Confidence/evidence.
-   Founder roadmap.

The visual must communicate **analysis and decision support**, rather
than looking like a generic project-management dashboard.

------------------------------------------------------------------------

## 12. Initial Navigation

Recommended navigation:

-   Product
-   How It Works
-   Use Cases
-   Pricing
-   Resources
-   About

Application navigation:

-   Home
-   AI Analyst
-   Business Context
-   Market Analysis
-   Assumptions
-   Roadmap
-   Sprints
-   Tasks
-   Documents
-   Funding
-   Metrics

------------------------------------------------------------------------

## 13. MVP Scope

### P0 --- Required for first usable product

-   User authentication.
-   Founder workspace.
-   Startup onboarding.
-   AI Business Analyst chat.
-   Persistent venture context.
-   Assumption identification.
-   Problem validation workflow.
-   AI recommendations.
-   Basic roadmap.
-   Tasks.
-   Document generation.
-   Dashboard.

### P1 --- Important after initial validation

-   Market/competitor research.
-   Requirements management.
-   Sprint planning.
-   Customer interview workflow.
-   Evidence tracking.
-   Collaboration.
-   File uploads.
-   Exportable reports.

### P2 --- Expansion

-   Funding preparation.
-   Investor readiness.
-   Financial modelling.
-   Integrations.
-   Founder community.
-   Accelerator dashboards.
-   Multi-agent specialist support.

------------------------------------------------------------------------

## 14. Non-Goals for Initial MVP

The first version should **not** attempt to become:

-   A full Jira replacement.
-   A complete CRM.
-   Accounting software.
-   A general-purpose AI assistant.
-   A full fundraising marketplace.
-   A complete code-generation platform.

These may integrate with FounderAlly later.

The initial product wins by being exceptionally good at **AI-assisted
business analysis for founders**.

------------------------------------------------------------------------

## 15. Success Metrics

### Activation

Percentage of new users who complete startup discovery and receive their
first AI analysis.

### Time to value

Time between signup and the first useful recommendation.

Target direction:

**Under 10 minutes.**

### Engagement

-   AI BA sessions per active founder.
-   Recommendations completed.
-   Assumptions validated.
-   Documents generated.
-   Weekly active founders.

### Retention

Percentage of founders returning weekly during active venture
development.

### Outcome metrics

-   Founders reaching validated problem.
-   Founders defining an MVP.
-   Founders completing validation experiments.
-   Founders progressing between roadmap stages.

------------------------------------------------------------------------

## 16. Differentiation

FounderAlly should differentiate itself through the combination of:

**Persistent business understanding**

It understands the venture rather than treating every prompt
independently.

**BA methodology**

It follows structured discovery, analysis and requirements practices.

**Proactive questioning**

It identifies what the founder has failed to consider.

**Evidence-aware decisions**

It separates assumptions from validated knowledge.

**Execution connection**

Insights become requirements, experiments, tasks and roadmap items.

The product therefore sits between:

`AI Assistant + Business Analyst + Product Strategist + Founder Workspace`

rather than competing purely as another chatbot.

------------------------------------------------------------------------

## 17. Key Product Risk

The largest product risk is that FounderAlly becomes a **generic AI chat
interface wrapped in a startup dashboard**.

To avoid this, the product must demonstrate visible analytical
behaviour:

-   Ask structured questions.
-   Maintain a business model.
-   Identify assumptions.
-   Track evidence.
-   Detect contradictions.
-   Generate BA artefacts.
-   Recommend priorities.
-   Update the workspace as knowledge changes.

The user should consistently feel:

> **"FounderAlly understands my business and is helping me think through
> it."**

------------------------------------------------------------------------

## 18. Open Product Decisions

The following require further definition:

1.  Exact onboarding interview.
2.  Business Context data model.
3.  AI memory architecture.
4.  Research/source integration.
5.  Confidence scoring methodology.
6.  Assumption scoring.
7.  Founder roadmap methodology.
8.  Free vs paid limits.
9.  Collaboration model.
10. Export formats.
11. Whether "AI co-founder" should be part of positioning or whether the
    product remains strictly positioned as an AI Business Analyst.

------------------------------------------------------------------------

## 19. Recommended Next Specification

The next document should define the **FounderAlly AI Business Analyst
Engine**, including:

-   BA system behaviour.
-   Discovery interview flow.
-   Venture Context schema.
-   Assumption detection.
-   Evidence model.
-   Recommendation engine.
-   Memory rules.
-   Artefact generation.
-   Example conversations.
-   Guardrails against unsupported assumptions.

That engine is the core intellectual product behind FounderAlly.
