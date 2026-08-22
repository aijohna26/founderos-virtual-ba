# FounderAlly — Fix `wip 3` and Implement the Real Gemini Live Voice Agent

The current `wip 3` commit is a useful intermediate step, but it does **not** yet implement the core architecture required by the PRD.

The most important missing piece is a persistent Gemini Live session using `@google/genai` with native function calling.

At the moment, the stand-up still behaves approximately like this:

```text
Browser speech recognition
↓
Transcript
↓
POST /api/ai-analyst
↓
Gemini text response
↓
data.actions
↓
BAAgentService.executeTool(...)
↓
Separate TTS generation
↓
Audio playback
```

That is still a voice-enabled text agent.

The required end state is:

```text
Founder speaks
↓
Persistent Gemini Live session
↓
Gemini reasons using venture/sprint context
↓
Gemini issues native function call
↓
Application executes tool
↓
Tool result is returned into SAME Gemini Live session
↓
Gemini continues reasoning
↓
Gemini responds naturally by voice
```

Do not rewrite the entire app.

Preserve:

* existing Kanban board
* `BAAgentService`
* `StandupPrepEngine`
* `VentureStore`
* sprint data
* memory
* Documents
* current UI
* authentication
* persistence
* advanced-feature flag work

Refactor only the voice-agent orchestration layer required to make this a genuine Gemini Live agent.

---

## Step 1 — Inspect the current implementation before changing anything

First inspect:

* `StandupTab`
* `AiAnalystPanel`
* `/api/ai-analyst`
* `/api/tts`
* `VoiceEngine`
* `BAAgentService`
* `StandupPrepEngine`
* venture persistence
* memory persistence
* current Gemini dependency
* current environment variables

Identify exactly which parts are reusable.

Do not duplicate existing board-action logic.

---

## Step 2 — Verify `@google/genai` is installed correctly

The project should use:

```ts
import { GoogleGenAI } from "@google/genai";
```

Verify `@google/genai` is present in `package.json`.

Do not use the deprecated `@google/generative-ai` package.

Do not continue building new Gemini functionality around direct manual REST calls unless there is a specific technical reason.

---

## Step 3 — Stop treating TTS as the Live Agent

The new `wip 3` TTS route using:

```ts
ai.models.generateContent(...)
```

with audio output is NOT the same as Gemini Live.

Keep the TTS route only as:

* fallback
* non-live narration
* optional utility

Do not consider it the main stand-up architecture.

The daily stand-up must use a persistent Gemini Live session.

---

## Step 4 — Create a dedicated Gemini Live service

Create a dedicated abstraction, for example:

```text
lib/agent/geminiLiveService.ts
```

or another location consistent with the project architecture.

Its responsibilities should include:

* connect to Gemini Live
* maintain one stand-up session
* send audio/input
* receive audio/output
* receive tool calls
* send tool results
* maintain connection state
* close/reconnect safely
* surface errors
* expose session events to the UI

Do not put all of this logic directly inside a React component.

---

## Step 5 — Use `ai.live.connect()`

The implementation must use the supported Live API/session pattern from `@google/genai`.

The coding task is not complete until there is an actual persistent Live connection.

Conceptually:

```ts
const ai = new GoogleGenAI({ apiKey });

const session = await ai.live.connect({
  model: LIVE_MODEL,
  config: {
    // native audio / system instructions / tools
  },
  callbacks: {
    // receive events
  }
});
```

Use the current official SDK signatures and model names.

Do not invent API contracts.

---

## Step 6 — Do not expose the permanent Gemini API key in the browser

This is critical.

Do NOT solve the Live implementation by placing the full `GEMINI_API_KEY` directly into client-side code.

Use the current recommended secure architecture for browser-based Gemini Live sessions.

If the current SDK supports ephemeral/session tokens or a server-mediated session setup, use that.

The permanent Gemini API key must remain server-side.

Do not rely on:

```text
NEXT_PUBLIC_GEMINI_API_KEY
```

for the production architecture.

If `NEXT_PUBLIC_GEMINI_API_KEY` was introduced in `wip 3`, remove or stop relying on it for sensitive production access.

---

## Step 7 — Build the Live stand-up system prompt

The Live session needs a concise system instruction that defines Sarah as the Business Analyst.

The BA should understand:

```text
VENTURE
SPRINT
CURRENT BOARD
CURRENT COMMITMENTS
RECENT LEARNINGS
RELEVANT MEMORY
RELEVANT DOCUMENT CONTEXT
```

The behaviour should be:

* concise
* conversational
* challenging when appropriate
* focused on sprint goals
* not generic
* not overly agreeable
* not verbose
* clear about uncertainty
* never claim an action succeeded before tool confirmation

Example personality:

> You are Sarah, a sharp, warm Business Analyst working with a solo founder. Your job is to keep the sprint focused, identify blockers, challenge work that does not support the sprint goal, create clear tickets, and hold the founder accountable to explicit commitments.

---

## Step 8 — Implement native Gemini function declarations

Do not ask Gemini to output JSON in markdown.

Do not use regex parsing of:

```json
{
  "actions": [...]
}
```

for the Live agent.

Define formal function/tool declarations.

Start with exactly these:

```text
get_sprint_context
get_ticket
create_ticket
update_ticket
move_ticket
record_commitment
record_learning
```

Keep the toolset small and reliable.

---

## Step 9 — Map native tool calls into `BAAgentService`

Do not throw away `BAAgentService`.

It is useful.

The new architecture should be:

```text
Gemini tool call
↓
Live service receives function call
↓
Validate arguments
↓
BAAgentService executes operation
↓
Persist updated venture/state
↓
Return structured result
↓
Send tool result back to Gemini
```

`BAAgentService` should remain the domain/business-action layer.

Gemini should not directly mutate React state.

---

## Step 10 — Implement `get_sprint_context`

This should return the authoritative state needed for reasoning.

Return approximately:

```text
venture name
stage
sprint number
sprint goal
sprint dates
today tickets
in-progress tickets
blocked tickets
backlog
done tickets
outstanding commitments
recent completion rate
recent learnings
```

Avoid sending the entire application state if not needed.

---

## Step 11 — Implement `get_ticket`

Use stable IDs wherever possible.

Do not rely primarily on fuzzy title matching such as:

```ts
title.toLowerCase().includes(...)
```

Return:

```text
id
title
description
status
priority
due date
acceptance criteria
linked sprint goal
blocker
evidence
```

If Gemini only knows the title initially, resolve safely before acting.

---

## Step 12 — Implement `create_ticket`

The BA should be able to create a high-quality ticket during conversation.

Example:

Founder:

> "We need to test whether people will pay £19."

Sarah may ask one clarifying question if needed.

Then call:

```text
create_ticket
```

with fields such as:

```text
title
description
why_this_matters
acceptance_criteria
priority
column
linked_sprint_goal
```

---

## Step 13 — Implement `update_ticket`

This should support:

* adding acceptance criteria
* changing priority
* marking blocked
* adding a blocker
* updating description
* setting due date
* adding evidence
* linking to sprint goal

Return a success/failure result.

---

## Step 14 — Implement `move_ticket`

The allowed columns are:

```text
backlog
today
in_progress
done
blocked
```

The tool must return something authoritative such as:

```json
{
  "success": true,
  "ticketId": "abc123",
  "from": "today",
  "to": "backlog"
}
```

Gemini must receive this result before saying:

> "Done."

---

## Step 15 — Implement `record_commitment`

This is central to FounderAlly.

When the founder says:

> "I'll contact six prospects before tomorrow."

persist:

```text
commitment
related ticket if applicable
deadline
stand-up/session ID
created date
status
```

The next stand-up must be able to retrieve it.

Do not store commitments only inside chat history.

They need their own structured persistence.

---

## Step 16 — Implement `record_learning`

Use this for retrospective and adaptation.

Store:

```text
learning
evidence
confidence
source
sprint ID
date
```

Example:

> Founder repeatedly starts unplanned product work before completing customer outreach.

This learning should influence future BA behaviour.

---

## Step 17 — Return tool results into the SAME Live session

This is critical.

The flow must not be:

```text
Gemini asks for tool
↓
app executes
↓
conversation ends
```

Instead:

```text
Gemini asks for tool
↓
app executes
↓
tool result sent back to current Live session
↓
Gemini continues speaking naturally
```

Example:

Founder:

> "Move the dashboard task back to backlog."

Gemini calls:

```text
move_ticket(...)
```

Tool returns success.

Gemini then says:

> "Done. That keeps today's work aligned with customer validation."

Same session.

---

## Step 18 — Use Live audio input rather than browser speech recognition as the main path

The primary stand-up should send actual audio into Gemini Live.

Browser speech recognition may remain as a fallback.

The architecture should no longer depend on browser speech recognition as the normal reasoning input path.

Do not route every spoken sentence through:

```text
speech recognition
→ text
→ /api/ai-analyst
```

for the main Live experience.

---

## Step 19 — Use Gemini native audio output as the main voice response

The Live session should provide the conversational audio response.

Do not generate each reply separately through `/api/tts` during the Live stand-up.

`/api/tts` can remain as fallback.

This removes unnecessary latency and makes the interaction genuinely conversational.

---

## Step 20 — Support interruption / barge-in

If the founder starts speaking while Sarah is speaking:

* stop or interrupt current playback appropriately
* send the founder's new audio into the Live session
* allow Gemini to respond to the interruption naturally

Do not restart the entire conversation.

The session must retain context.

---

## Step 21 — Keep `StandupPrepEngine`

This was a good addition in `wip 3`.

Use it before the stand-up begins.

The preparation step should identify:

* yesterday's commitments
* incomplete work
* overdue work
* blocked work
* carried-over work
* work not aligned with sprint goal
* relevant recent learnings

Produce a compact agenda/context for the Live session.

Do not make the greeting generic.

Example:

> "Morning. I've reviewed the sprint. You completed two of yesterday's three commitments, and the customer outreach ticket has now carried over twice. Let's start there."

---

## Step 22 — Add a proper commitment model if it does not exist

Do not overload:

```text
chatHistory
```

or:

```text
KanbanCard
```

to represent all commitments.

Create a structured model if needed:

```ts
interface Commitment {
  id: string;
  ventureId: string;
  sprintId?: string;
  text: string;
  relatedTicketId?: string;
  deadline?: string;
  status: "open" | "completed" | "missed";
  createdAt: string;
  completedAt?: string;
}
```

Persist it.

---

## Step 23 — Implement adaptation simply

Do not build a complex self-learning system.

Start with deterministic pattern detection.

Examples:

```text
same ticket carried over >= 3 times
customer-facing work repeatedly missed
unplanned feature work repeatedly added
blocked ticket remains blocked > X days
commitment completion rate drops below threshold
```

When a pattern is detected:

```text
record_learning(...)
```

Future system context should include relevant learning.

This allows Sarah to adapt.

---

## Step 24 — Add AI Operations logging

Every important AI action should be logged.

Create a structured event model such as:

```ts
interface AgentExecutionLog {
  id: string;
  timestamp: string;
  ventureId: string;
  sessionId: string;
  context: "standup" | "retro" | "board" | "planning";
  model: string;
  eventType: string;
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
  success: boolean;
  latencyMs?: number;
}
```

Log:

* Live session started
* Live session ended
* tool requested
* tool completed
* commitment recorded
* learning recorded
* stand-up prepared
* errors

---

## Step 25 — Add a simple AI Operations screen

Do not overbuild.

Show:

```text
Live sessions
Stand-ups completed
Gemini tool calls
Successful tool executions
Tickets created by AI
Tickets moved by AI
Commitments recorded
Learnings recorded
Average latency
Current Gemini model
```

This can be internal/admin-only.

---

## Step 26 — Keep Documents in the BA knowledge layer

Do not hide or remove Documents.

The BA should eventually be able to use relevant Documents during stand-up.

If full retrieval is not yet implemented, preserve the architecture and clearly separate:

```text
document storage
document retrieval
agent context injection
```

Do not fabricate document knowledge.

---

## Step 27 — Keep advanced features hidden, not deleted

Continue using:

```text
SHOW_ADVANCED_FEATURES
```

to hide advanced UI.

Do not delete:

* Strategy
* Assumptions
* Requirements
* Experiments
* Metrics
* Roadmap

The BA may still use this data behind the scenes.

The standard UX should remain focused.

---

## Step 28 — Fix the TTS route issue introduced in `wip 3`

Inspect the new `pcmToWav()` helper.

It appears to have been added but may not actually be used before returning raw audio.

Verify the actual format returned by Gemini.

If the API returns raw PCM:

* wrap it correctly before browser playback
* set the correct MIME type

If Gemini returns a directly playable audio format:

* do not unnecessarily convert it

Do not leave dead conversion code.

---

## Step 29 — Remove reliance on `NEXT_PUBLIC_GEMINI_API_KEY`

The current `wip 3` code appears to allow:

```ts
process.env.NEXT_PUBLIC_GEMINI_API_KEY
```

as a fallback.

Do not expose the permanent Gemini key publicly.

Use:

```text
GEMINI_API_KEY
```

server-side only.

For Live browser sessions, implement the currently recommended secure session-token architecture.

---

## Step 30 — Verify the actual model names against current Google documentation

Do not blindly continue using:

```text
gemini-2.0-flash
```

for Live or audio simply because it existed in previous code.

Use the current supported Gemini Live model and current audio model specified in Google's official documentation.

Keep the model name in a central config file.

Example:

```text
GEMINI_LIVE_MODEL
GEMINI_TEXT_MODEL
GEMINI_AUDIO_FALLBACK_MODEL
```

Do not scatter model strings throughout the app.

---

## Step 31 — Preserve `/api/ai-analyst` as fallback if useful

Do not delete a working path prematurely.

The existing text reasoning endpoint can remain for:

* typed chat
* non-Live fallback
* debugging

But Stand-up should use the new Live service.

---

## Step 32 — Make the UI clearly show agent state

Use states such as:

```text
connecting
listening
thinking
using_tool
speaking
error
disconnected
```

The visual avatar/sphere should reflect those states.

For example:

```text
Listening...
Checking your sprint...
Moving ticket...
Speaking...
```

This makes the agent behaviour understandable to users and judges.

---

## Step 33 — Implement the exact demo path

Test this repeatedly:

Sprint goal:

> Validate customer demand.

Today:

```text
Contact 10 prospective customers
Improve dashboard animations
```

Founder starts stand-up.

Sarah:

> "You committed to ten customer conversations yesterday. How many did you complete?"

Founder:

> "Four. I spent most of the day improving the dashboard."

Sarah:

> "That work isn't supporting this sprint's validation goal. I recommend moving the dashboard task back to the backlog."

Founder:

> "Yeah, do it."

Expected:

```text
Gemini native function call
→ move_ticket
→ BAAgentService
→ persistence
→ tool result back to Gemini
→ board updates
```

Sarah:

> "Done. You still have six prospects left. What are you committing to before tomorrow?"

Founder:

> "All six."

Expected:

```text
record_commitment
```

Sarah:

> "Recorded. I'll check that at tomorrow's stand-up."

This scenario must work reliably.

---

## Step 34 — Test failure cases

Test:

* ambiguous ticket title
* tool execution failure
* network interruption
* Live connection dropped
* microphone permission denied
* Gemini unavailable
* duplicate commitment
* founder interrupts Sarah
* founder changes topic
* founder says "undo that"
* tool result returns failure

Do not let Sarah falsely claim success.

---

## Step 35 — Preserve graceful fallback

If Live fails:

Fallback to:

```text
browser speech recognition
↓
/api/ai-analyst
↓
text response
↓
TTS/browser voice
```

But make it clear internally that this is fallback mode.

Log:

```text
voice_mode: live
```

or:

```text
voice_mode: fallback
```

This helps debugging and competition evidence.

---

## Step 36 — Update the README

The README is still generic.

Update it with:

```text
FounderAlly
AI Business Analyst for Solo Founders
```

Explain:

* product purpose
* Gemini usage
* Gemini Live
* native function calling
* Google Cloud components
* setup
* environment variables
* architecture
* feature flag
* how to run
* how to test the voice agent

Do not include secrets.

---

## Step 37 — Add an architecture diagram to the README

Use a simple Mermaid or text diagram:

```text
Founder
↓
Gemini Live
↓
Tool Router
↓
BAAgentService
↓
Board / Sprint / Memory / Documents
↓
Tool result
↓
Gemini Live
↓
Founder
```

This will also help judging.

---

## Step 38 — Run build and lint

Before committing:

```bash
npm run build
npm run lint
```

Fix real issues.

Do not leave TypeScript failures or dead imports.

---

## Step 39 — Commit in logical stages

Do not make another giant `wip` commit if possible.

Suggested commits:

```text
feat: add secure Gemini Live session service
feat: add native BA tool declarations
feat: connect Live tool calls to BAAgentService
feat: add persistent founder commitments
feat: add adaptive BA learnings
feat: add agent execution logging
feat: wire real-time standup UI to Gemini Live
docs: document FounderAlly Gemini architecture
```

This makes the repository easier to audit.

---

## Step 40 — Definition of done

Do not report this PRD as complete until ALL of the following are true:

* real `ai.live.connect()` implementation exists
* stand-up runs over persistent Gemini Live session
* voice input is sent into Live
* native Gemini audio comes back
* native function declarations exist
* Gemini initiates tool calls
* tool calls execute through `BAAgentService`
* tool results are returned into SAME Live session
* Gemini continues speaking after tool execution
* board changes visibly
* commitments persist
* next stand-up can retrieve commitments
* learnings persist
* at least one learning changes future BA behaviour
* agent executions are logged
* permanent Gemini API key is not exposed client-side
* fallback mode remains available
* Documents remain available
* advanced features remain behind feature flag
* build passes
* README reflects actual architecture

The goal is not simply to say:

> "We are using `@google/genai`."

The goal is to be able to truthfully say:

> **FounderAlly runs a persistent Gemini Live Business Analyst agent that listens, reasons over startup context, invokes tools, changes the founder's workspace, receives the tool result, continues the conversation, remembers commitments, and adapts future coaching based on outcomes.**
x