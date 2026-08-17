export interface CardChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  category: "Feature" | "Growth" | "Experiment" | "Research" | "Technical" | "Design" | "Legal";
  owner?: string;
  priority?: "High" | "Medium" | "Low";
  progress?: number;
  completed?: boolean;
  dueDate?: string;
  checklists?: CardChecklistItem[];
  linkedAssumptionId?: string;
}

export interface Assumption {
  id: string;
  statement: string;
  category: "Market" | "Problem" | "Product" | "Financial" | "Channel" | "Technical";
  importance: "High" | "Medium" | "Low";
  status: "Untested" | "Testing" | "Supported" | "Rejected";
  evidence?: string;
  dateAdded: string;
}

export interface PriorityItem {
  id: string;
  num: number;
  title: string;
  tag: string;
  tagColor: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  priorityColor: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  date: string;
  color: string;
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

export interface VentureStrategy {
  tam: string;
  sam: string;
  som: string;
  icp: string;
  valueProp: string;
  moat: string;
  alternatives: string;
}

export interface SprintRecord {
  sprintNumber: number;
  startDate: string;
  completedDate: string;
  totalTaken: number;
  completed: number;
  outstanding: number;
  blocked: number;
  completionRate: number;
  completedCards?: KanbanCard[];
}

export interface Venture {
  id: string;
  name: string;
  tagline: string;
  status: "Live" | "Validation" | "Ideation" | "Scaling";
  color: string;
  dot: string;
  stage: string;
  targetCustomer: string;
  problemStatement: string;
  solutionSummary: string;
  strategy: VentureStrategy;
  standupTime?: string;
  /** Advisor selection is persisted independently for this venture. */
  advisorId?: string;
  /** Optional project-specific Gemini voice override. */
  advisorVoiceName?: string;
  currentSprint?: number;
  sprintStartDate?: string;
  sprintHistory?: SprintRecord[];
  columns: {
    backlog: { name: string; items: KanbanCard[] };
    today: { name: string; items: KanbanCard[] };
    in_progress: { name: string; items: KanbanCard[] };
    done: { name: string; items: KanbanCard[] };
    blocked: { name: string; items: KanbanCard[] };
  };
  assumptions: Assumption[];
  priorities: PriorityItem[];
  milestones: MilestoneItem[];
  chatHistory: ChatMessage[];
  createdAt: string;
}

const STORAGE_KEY = "founderally_ventures_v1";

const DEFAULT_VENTURES: Venture[] = [
  {
    id: "founderally",
    name: "FounderAlly",
    tagline: "AI Business Analyst & Venture Co-Pilot",
    status: "Live",
    color: "bg-blue-600",
    dot: "bg-blue-600",
    stage: "MVP Build & First Customers",
    targetCustomer: "Solo founders, indie hackers, and early-stage startup builders",
    problemStatement: "Founders build before validating, waste months on low-priority features, and lack experienced Business Analysts to structure requirements and de-risk decisions.",
    solutionSummary: "An autonomous AI Business Analyst working alongside founders — challenging assumptions, mapping strategy, generating PRDs/financial models, and prioritizing sprints.",
    strategy: {
      tam: "$28.5B (Global venture building, startup software & product management tools)",
      sam: "$4.2B (Solo founders, pre-seed/seed startups, and accelerator participants)",
      som: "$75M (50,000 active founders on Pro/Studio plans within 3 years)",
      icp: "Solo founders & founding teams building software products with high ambiguity and limited BA experience.",
      valueProp: "From idea to scale: get instant clarity on what to build, why it matters, and how to make it succeed.",
      moat: "Proprietary structured discovery engine, persistent business context memory, and dynamic assumption validation loop.",
      alternatives: "Consultants ($150/hr), generalized chat AI without memory, fragmented spreadsheets & Notion docs."
    },
    columns: {
      backlog: {
        name: "BACKLOG",
        items: [
          { id: "b1", title: "Automated Competitor Crawler", category: "Growth", owner: "AI" },
          { id: "b2", title: "Team Collaboration & Shared Workspaces", category: "Feature", owner: "YOU" },
          { id: "b3", title: "Custom Prompt Tuning for Accelerators", category: "Technical", owner: "AI" },
        ],
      },
      today: {
        name: "TODAY",
        items: [
          { id: "t1", title: "Onboard first 5 real founders for feedback", category: "Experiment", owner: "YOU", priority: "High" },
          { id: "t2", title: "Verify real AI Analyst response latency", category: "Technical", owner: "AI", priority: "High" },
          { id: "t3", title: "Conduct pricing willingness interviews", category: "Research", owner: "YOU", priority: "Medium" },
        ],
      },
      in_progress: {
        name: "IN PROGRESS",
        items: [
          { id: "p1", title: "Real-time AI Business Analyst Chat API", category: "Feature", owner: "AI", progress: 85 },
          { id: "p2", title: "Dynamic Assumption Register & Health Scoring", category: "Feature", owner: "YOU", progress: 90 },
        ],
      },
      done: {
        name: "DONE",
        items: [
          { id: "d1", title: "Clerk Auth & Protected Workspaces", category: "Technical", owner: "YOU", completed: true },
          { id: "d2", title: "Pricing & Dollar Currency Plans", category: "Design", owner: "YOU", completed: true },
          { id: "d3", title: "High-Fidelity Dashboard Layout", category: "Design", owner: "YOU", completed: true },
        ],
      },
      blocked: {
        name: "BLOCKED",
        items: [
          { id: "bl1", title: "Payment Webhook Provider verification", category: "Legal", owner: "YOU", priority: "Medium" },
        ],
      },
    },
    assumptions: [
      {
        id: "fa-1",
        statement: "Founders prefer a proactive AI BA that challenges their ideas over a passive chatbot",
        category: "Product",
        importance: "High",
        status: "Testing",
        evidence: "Early users confirmed structured discovery prevents wasted engineering time.",
        dateAdded: "2026-08-16"
      },
      {
        id: "fa-2",
        statement: "Founders will pay $29/mo for automated PRDs, assumption registers, and market analysis",
        category: "Financial",
        importance: "High",
        status: "Untested",
        evidence: "Willingness to pay interviews scheduled this week.",
        dateAdded: "2026-08-16"
      },
      {
        id: "fa-3",
        statement: "Google Gemini can reliably extract risks and tasks into structured JSON models",
        category: "Technical",
        importance: "High",
        status: "Supported",
        evidence: "API extraction benchmark achieved 98% accuracy.",
        dateAdded: "2026-08-17"
      },
    ],
    priorities: [
      {
        id: "pr-1",
        num: 1,
        title: "Onboard first 5 real founders for feedback",
        tag: "Experiment",
        tagColor: "bg-orange-50 text-orange-700 border-orange-200",
        owner: "YOU",
        priority: "High",
        priorityColor: "text-rose-600 font-bold",
      },
      {
        id: "pr-2",
        num: 2,
        title: "Verify real AI Analyst response latency",
        tag: "Technical",
        tagColor: "bg-blue-50 text-blue-700 border-blue-200",
        owner: "AI",
        priority: "High",
        priorityColor: "text-rose-600 font-bold",
      },
      {
        id: "pr-3",
        num: 3,
        title: "Conduct pricing willingness interviews",
        tag: "Research",
        tagColor: "bg-amber-50 text-amber-700 border-amber-200",
        owner: "YOU",
        priority: "Medium",
        priorityColor: "text-amber-600 font-bold",
      }
    ],
    milestones: [
      { id: "m1", title: "MVP Launch & First Customer", date: "August 2026", color: "purple", completed: false },
      { id: "m2", title: "Beta 100 Founders Milestone", date: "October 2026", color: "amber", completed: false },
      { id: "m3", title: "First $10k MRR", date: "December 2026", color: "emerald", completed: false },
      { id: "m4", title: "Seed Round Ready", date: "March 2027", color: "slate", completed: false },
    ],
    chatHistory: [
      {
        id: "ch-1",
        sender: "ai",
        text: "Good day Founder! I'm your AI Business Analyst. I've loaded your venture context for FounderAlly. What's the biggest uncertainty we should stress-test today?",
        timestamp: "09:00 AM"
      }
    ],
    createdAt: new Date().toISOString(),
  }
];

function normalizeColumn(col: any, defaultName: string): { name: string; items: KanbanCard[] } {
  if (!col) return { name: defaultName, items: [] };
  if (Array.isArray(col)) {
    return { name: defaultName, items: col };
  }
  return {
    name: col.name || defaultName,
    items: Array.isArray(col.items) ? col.items : [],
  };
}

function normalizeVenture(v: any): Venture {
  if (!v) return DEFAULT_VENTURES[0];
  const defaultStandup = v.id === "founderally" ? "09:00 AM" : v.id?.toLowerCase().includes("property") ? "11:00 AM" : "10:00 AM";
  return {
    ...DEFAULT_VENTURES[0],
    ...v,
    standupTime: v.standupTime || defaultStandup,
    columns: {
      backlog: normalizeColumn(v.columns?.backlog, "BACKLOG"),
      today: normalizeColumn(v.columns?.today, "TODAY"),
      in_progress: normalizeColumn(v.columns?.in_progress, "IN PROGRESS"),
      done: normalizeColumn(v.columns?.done, "DONE"),
      blocked: normalizeColumn(v.columns?.blocked, "BLOCKED"),
    },
    assumptions: Array.isArray(v.assumptions) ? v.assumptions : DEFAULT_VENTURES[0].assumptions,
    priorities: Array.isArray(v.priorities) ? v.priorities : DEFAULT_VENTURES[0].priorities,
    milestones: Array.isArray(v.milestones) ? v.milestones : DEFAULT_VENTURES[0].milestones,
    chatHistory: Array.isArray(v.chatHistory) ? v.chatHistory : DEFAULT_VENTURES[0].chatHistory,
    strategy: v.strategy || DEFAULT_VENTURES[0].strategy,
  };
}

export class VentureStore {
  static getVentures(): Venture[] {
    if (typeof window === "undefined") return DEFAULT_VENTURES;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VENTURES));
        return DEFAULT_VENTURES;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeVenture);
        // Persist normalized shape
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
      return DEFAULT_VENTURES;
    } catch {
      return DEFAULT_VENTURES;
    }
  }

  static saveVentures(ventures: Venture[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ventures));
    } catch (e) {
      console.error("Failed to save ventures to localStorage:", e);
    }
  }

  static getVenture(id: string): Venture | undefined {
    const ventures = this.getVentures();
    return ventures.find((v) => v.id === id) || ventures[0];
  }

  static createVenture(data: {
    name: string;
    tagline: string;
    targetCustomer: string;
    problemStatement: string;
    solutionSummary: string;
    stage?: string;
  }): Venture {
    const ventures = this.getVentures();
    const id = data.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString().slice(-4);

    const newVenture: Venture = {
      id,
      name: data.name,
      tagline: data.tagline || "New Venture Workspace",
      status: "Validation",
      color: "bg-indigo-600",
      dot: "bg-indigo-500",
      stage: data.stage || "Ideation & Problem Discovery",
      targetCustomer: data.targetCustomer || "Early adopters & target ICP",
      problemStatement: data.problemStatement || "Problem statement under active discovery.",
      solutionSummary: data.solutionSummary || "Proposed solution value proposition.",
      strategy: {
        tam: "Estimating market sizing...",
        sam: "Defining serviceable addressable segment...",
        som: "Targeting year 1 customers...",
        icp: data.targetCustomer,
        valueProp: data.tagline,
        moat: "Unique proprietary workflow & product differentiation.",
        alternatives: "Existing manual workflows & competitor workarounds."
      },
      columns: {
        backlog: {
          name: "BACKLOG",
          items: [
            { id: `b-${Date.now()}-1`, title: "Define Core Value Proposition", category: "Research", owner: "YOU" },
            { id: `b-${Date.now()}-2`, title: "Draft Technical Architecture Brief", category: "Technical", owner: "AI" },
          ],
        },
        today: {
          name: "TODAY",
          items: [
            { id: `t-${Date.now()}-1`, title: "Conduct 5 Customer Problem Interviews", category: "Experiment", owner: "YOU", priority: "High" },
            { id: `t-${Date.now()}-2`, title: "Identify Top 3 Riskiest Assumptions", category: "Research", owner: "AI", priority: "High" },
          ],
        },
        in_progress: {
          name: "IN PROGRESS",
          items: [
            { id: `p-${Date.now()}-1`, title: "Build Minimum Testable Demo", category: "Feature", owner: "YOU", progress: 20 },
          ],
        },
        done: {
          name: "DONE",
          items: [
            { id: `d-${Date.now()}-1`, title: "Venture Workspace Initialized", category: "Research", owner: "AI", completed: true },
          ],
        },
        blocked: {
          name: "BLOCKED",
          items: [],
        },
      },
      assumptions: [
        {
          id: `a-${Date.now()}-1`,
          statement: `Target users (${data.targetCustomer}) urgently suffer from: ${data.problemStatement}`,
          category: "Problem",
          importance: "High",
          status: "Testing",
          evidence: "Initial founder discovery hypothesis.",
          dateAdded: new Date().toISOString().split("T")[0],
        },
        {
          id: `a-${Date.now()}-2`,
          statement: "Users are willing to pay for an automated software solution rather than manual workarounds",
          category: "Financial",
          importance: "High",
          status: "Untested",
          evidence: "Awaiting customer pricing validation.",
          dateAdded: new Date().toISOString().split("T")[0],
        }
      ],
      priorities: [
        {
          id: `pr-${Date.now()}-1`,
          num: 1,
          title: "Conduct 5 Customer Problem Interviews",
          tag: "Experiment",
          tagColor: "bg-orange-50 text-orange-700 border-orange-200",
          owner: "YOU",
          priority: "High",
          priorityColor: "text-rose-600 font-bold",
        },
        {
          id: `pr-${Date.now()}-2`,
          num: 2,
          title: "Identify Top 3 Riskiest Assumptions",
          tag: "Research",
          tagColor: "bg-amber-50 text-amber-700 border-amber-200",
          owner: "AI",
          priority: "High",
          priorityColor: "text-rose-600 font-bold",
        }
      ],
      milestones: [
        { id: "m1", title: "Problem-Solution Fit", date: "Sprint 1", color: "purple", completed: false },
        { id: "m2", title: "MVP Prototype", date: "Sprint 3", color: "amber", completed: false },
        { id: "m3", title: "First 10 Paying Users", date: "Sprint 6", color: "emerald", completed: false },
      ],
      chatHistory: [
        {
          id: `ch-${Date.now()}`,
          sender: "ai",
          text: `Welcome to ${data.name}! I've initialized your business analyst workspace. Based on your problem description ("${data.problemStatement}"), let's define the primary hypothesis to validate first.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      ],
      createdAt: new Date().toISOString(),
    };

    ventures.push(newVenture);
    this.saveVentures(ventures);
    return newVenture;
  }

  static updateVenture(venture: Venture): void {
    const ventures = this.getVentures();
    const idx = ventures.findIndex((v) => v.id === venture.id);
    if (idx !== -1) {
      ventures[idx] = venture;
      this.saveVentures(ventures);
    }
  }

  static addChatMessage(ventureId: string, message: ChatMessage): void {
    const venture = this.getVenture(ventureId);
    if (venture) {
      venture.chatHistory = [...venture.chatHistory, message];
      this.updateVenture(venture);
    }
  }

  static addAssumption(ventureId: string, assumption: Omit<Assumption, "id" | "dateAdded">): Assumption {
    const venture = this.getVenture(ventureId);
    const newAssump: Assumption = {
      ...assumption,
      id: "a-" + Date.now(),
      dateAdded: new Date().toISOString().split("T")[0],
    };
    if (venture) {
      venture.assumptions = [newAssump, ...venture.assumptions];
      this.updateVenture(venture);
    }
    return newAssump;
  }

  static updateAssumptionStatus(ventureId: string, assumptionId: string, status: Assumption["status"]): void {
    const venture = this.getVenture(ventureId);
    if (venture) {
      venture.assumptions = venture.assumptions.map((a) =>
        a.id === assumptionId ? { ...a, status } : a
      );
      this.updateVenture(venture);
    }
  }

  static addKanbanCard(ventureId: string, columnKey: keyof Venture["columns"], card: Omit<KanbanCard, "id">): KanbanCard {
    const venture = this.getVenture(ventureId);
    const newCard: KanbanCard = {
      ...card,
      id: "card-" + Date.now(),
    };
    if (venture && venture.columns[columnKey]) {
      venture.columns[columnKey].items.push(newCard);
      this.updateVenture(venture);
    }
    return newCard;
  }
}
