# FounderAlly — Real-Time Adaptive AI Business Analyst for Solo Founders

> **You may be building solo, but you have an AI Business Analyst who understands the work, challenges your assumptions, remembers what you committed to, and turns up every morning.**

FounderAlly transforms startup building by pairing solo founders with **Sarah Jenkins**, a Lead AI Business Analyst powered by **Google Gemini Live**, native tool execution, and adaptive sprint memory.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    Founder([🎙️ Solo Founder]) -->|Request Live session| TokenRoute[🔐 Next.js /api/live-session]
    TokenRoute -->|Permanent key, server-side only| TokenService[Google ephemeral token service]
    TokenService -->|One-use constrained token| Founder
    Founder <-->|Real-time 16kHz PCM in / 24kHz PCM out| GeminiLive[⚡ Persistent Gemini Live Session\ngemini-3.1-flash-live-preview]
    
    GeminiLive -->|1. Reason over venture & sprint context| ReasoningEngine[🧠 Business Reasoning]
    GeminiLive -->|2. Native Function Calls| ToolRouter[🔧 Tool Execution Router]
    
    ToolRouter -->|get_sprint_context| SprintContext[📊 Sprint & Board State]
    ToolRouter -->|get_ticket / create_ticket / update_ticket / move_ticket| BAAgentService[📋 BAAgentService\nKanban Board Mutations]
    ToolRouter -->|record_commitment| CommitmentStore[⏱️ Founder Commitments Store]
    ToolRouter -->|record_learning| AdaptiveMemory[💡 Retrospective Learnings & Patterns]
    
    BAAgentService -->|Live State Mutation| VentureStore[(💾 Workspace Persistence)]
    CommitmentStore -->|Persist Commitments| VentureStore
    AdaptiveMemory -->|Persist Patterns| VentureStore
    
    BAAgentService -->|3. Authoritative Tool Result| ToolRouter
    CommitmentStore -->|3. Authoritative Tool Result| ToolRouter
    AdaptiveMemory -->|3. Authoritative Tool Result| ToolRouter
    
    ToolRouter -->|4. Tool Result returned into SAME Live Session| GeminiLive
    GeminiLive -->|5. Native Spoken Confirmation & Next Actions| Founder
```

---

## 🌟 Key Capabilities

### 1. Real-Time Bidirectional Voice Agent (`GeminiLiveService`)
- Uses `@google/genai` `ai.live.connect()` with a one-use, short-lived token constrained by the server to the configured Live model and session configuration.
- Native 16kHz PCM audio streaming with Google's **`Kore`** and **`Aoede`** expressive neural voices.
- Natural barge-in interruption: when the founder speaks mid-sentence, playback halts and the agent answers.
- If token provisioning, microphone access, or Live transport fails, the UI switches to the existing browser speech recognition → `/api/ai-analyst` → TTS/browser voice path.

### 2. The 7 Authoritative MVP Tools
1. `get_sprint_context` — Retrieves current sprint goal, board columns, active commitments, and completion rate.
2. `get_ticket` — Authoritative lookup of ticket details, acceptance criteria, and blocker notes.
3. `create_ticket` — Converts spoken agreements into structured Kanban tickets with categories and priorities.
4. `update_ticket` — Refines acceptance criteria, updates descriptions, or flags blockers.
5. `move_ticket` — Moves tickets between columns (`backlog`, `today`, `in_progress`, `done`, `blocked`) and returns verified results.
6. `record_commitment` — Records explicit founder commitments for morning accountability.
7. `record_learning` — Stores durable retrospective learnings and recurring behavioral patterns.

### 3. Proactive Stand-up Preparation (`StandupPrepEngine`)
- Analyzes active tickets, carried-over work, unfulfilled commitments, and sprint goal alignment before stand-up begins.
- Opens stand-ups with substantive, goal-oriented observations rather than generic greetings.

### 4. Adaptation & Behavioral Coaching
- Persists explicit learnings and founder commitments in browser storage.
- Injects those persisted facts and learnings into later Live-session instructions so they influence future coaching.

### 5. Auditable AI Operations & Telemetry
- Inspect live tool executions, latency benchmarks, success rates, and Gemini models via the **AI Ops** telemetry dashboard.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create `.env.local`:
```env
# Google Gemini API Key (from https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSyYourGoogleApiKeyHere

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (Optional Database Persistence)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Feature Flag: Refocused AI Business Analyst Experience
SHOW_ADVANCED_FEATURES=false
NEXT_PUBLIC_SHOW_ADVANCED_FEATURES=false
```

Do not define or use `NEXT_PUBLIC_GEMINI_API_KEY`. The permanent Gemini credential must never be compiled into browser JavaScript. The configured key must be a Gemini Developer API key authorized to create ephemeral Live tokens; an OAuth token or unsupported credential will be rejected.

Model configuration is centralized in `lib/config/geminiConfig.ts`. Live audio uses `gemini-3.1-flash-live-preview`. Text requests try `gemini-3.7-flash`, `gemini-flash-latest`, then `gemini-3.1-flash-lite`. TTS fallback uses the dedicated `gemini-3.1-flash-tts-preview` model; text-only Flash models cannot replace a Live or TTS model.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

---

## 🧪 Testing the Voice Agent Demo Scenario

1. Open **`http://localhost:3000/dashboard`** and click the **Stand-up** tab.
2. Click **"Connect Live Voice Standup"**.
3. **Founder**: *"I spent yesterday polishing the dashboard animations."*
4. **Sarah**: Challenges the distraction against the sprint goal (*"Our sprint goal is customer validation. Dashboard animations aren't helping us reach it right now. I recommend moving that ticket back to the backlog."*)
5. **Founder**: *"Yeah, do it."*
6. **Sarah**: Calls `move_ticket`. FounderAlly changes the board and sends the authoritative result back through `session.sendToolResponse(...)`; only then should Sarah confirm the move and continue.
7. **Founder**: *"I'll contact all six."*
8. **Sarah**: Calls `record_commitment` and records it for tomorrow's stand-up.

---

## 🔒 Security & Best Practices
- **No permanent key in the browser**: `/api/live-session` exchanges the server-only `GEMINI_API_KEY` for a one-use, short-lived Gemini credential. The ephemeral credential is expected to be visible to the browser; the permanent key is not.
- **Graceful Fallbacks**: If WebSocket streaming is unavailable, the application automatically falls back to the HTTP contextual engine.

## Persistence and current scope

Venture state, commitments, learnings, and AI Ops events currently persist in browser `localStorage`; memory facts optionally mirror to Supabase. They survive refresh in the same browser profile but are not yet guaranteed to synchronize across devices. Documents remain in the primary navigation. Strategy, Assumptions, Requirements, Experiments, Metrics, and Roadmap remain behind `SHOW_ADVANCED_FEATURES`.
