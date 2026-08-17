export type AdvisorStyle =
  | "Strategic Co-Founder"
  | "Strict & Analytical"
  | "Technical Architect";

export const GEMINI_VOICES = [
  { name: "Zephyr", character: "Bright" },
  { name: "Puck", character: "Upbeat" },
  { name: "Charon", character: "Informative" },
  { name: "Kore", character: "Firm" },
  { name: "Fenrir", character: "Excitable" },
  { name: "Leda", character: "Youthful" },
  { name: "Orus", character: "Firm" },
  { name: "Aoede", character: "Breezy" },
  { name: "Callirrhoe", character: "Easy-going" },
  { name: "Autonoe", character: "Bright" },
  { name: "Enceladus", character: "Breathy" },
  { name: "Iapetus", character: "Clear" },
  { name: "Umbriel", character: "Easy-going" },
  { name: "Algieba", character: "Smooth" },
  { name: "Despina", character: "Smooth" },
  { name: "Erinome", character: "Clear" },
  { name: "Algenib", character: "Gravelly" },
  { name: "Rasalgethi", character: "Informative" },
  { name: "Laomedeia", character: "Upbeat" },
  { name: "Achernar", character: "Soft" },
  { name: "Alnilam", character: "Firm" },
  { name: "Schedar", character: "Even" },
  { name: "Gacrux", character: "Mature" },
  { name: "Pulcherrima", character: "Forward" },
  { name: "Achird", character: "Friendly" },
  { name: "Zubenelgenubi", character: "Casual" },
  { name: "Vindemiatrix", character: "Gentle" },
  { name: "Sadachbia", character: "Lively" },
  { name: "Sadaltager", character: "Knowledgeable" },
  { name: "Sulafat", character: "Warm" },
] as const;

export type GeminiVoiceName = (typeof GEMINI_VOICES)[number]["name"];

export interface AdvisorPersona {
  id: string;
  name: string;
  title: string;
  organization: string;
  voiceName: GeminiVoiceName;
  voiceCharacter: string;
  voiceDirection: string;
  domain: string;
  avatar: string;
  style: AdvisorStyle;
  description: string;
}

export const ADVISOR_PERSONAS: readonly AdvisorPersona[] = [
  {
    id: "maya-strategy",
    name: "Maya Chen",
    title: "Venture Partner & Strategic BA",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Sulafat",
    voiceCharacter: "Warm",
    voiceDirection:
      "Speak with calm warmth, grounded confidence, and an unhurried conversational pace. Avoid a synthetic announcer tone.",
    domain: "Strategic Venture Building",
    avatar: "/advisors/maya-chen-front.png",
    style: "Strategic Co-Founder",
    description:
      "A calm strategic partner who challenges assumptions without turning the stand-up into an interrogation.",
  },
  {
    id: "marcus-sprint",
    name: "Marcus Reed",
    title: "Sprint Coach & Operations BA",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Charon",
    voiceCharacter: "Informative",
    voiceDirection:
      "Speak with measured, informative authority and crisp pacing. Sound like an experienced operator, not a radio presenter.",
    domain: "Sprint Delivery & Accountability",
    avatar: "/advisors/marcus-reed-front.png",
    style: "Strict & Analytical",
    description:
      "A direct delivery coach who surfaces blockers, protects the sprint goal, and holds commitments firmly.",
  },
  {
    id: "priya-technical",
    name: "Priya Nair",
    title: "Technical Requirements Architect",
    organization: "FounderAlly Autonomous Co-Pilot",
    voiceName: "Erinome",
    voiceCharacter: "Clear",
    voiceDirection:
      "Speak clearly and precisely with a friendly, composed cadence. Emphasize decisions and acceptance criteria without sounding robotic.",
    domain: "PRDs, Systems & Feature Scoping",
    avatar: "/advisors/priya-nair-front.png",
    style: "Technical Architect",
    description:
      "A precise systems thinker for technical feasibility, requirements, dependencies, and acceptance criteria.",
  },
] as const;

export const DEFAULT_ADVISOR = ADVISOR_PERSONAS[0];

export function findAdvisorById(advisorId?: string): AdvisorPersona {
  return (
    ADVISOR_PERSONAS.find((advisor) => advisor.id === advisorId) ||
    DEFAULT_ADVISOR
  );
}

export function findGeminiVoice(voiceName?: string) {
  return GEMINI_VOICES.find((voice) => voice.name === voiceName);
}

export function resolveAdvisor(
  advisorId?: string,
  voiceName?: string
): AdvisorPersona {
  const advisor = findAdvisorById(advisorId);
  const voice = findGeminiVoice(voiceName);
  return voice
    ? { ...advisor, voiceName: voice.name, voiceCharacter: voice.character }
    : advisor;
}

export function findAdvisorByVoice(voiceName?: string): AdvisorPersona {
  const advisor =
    ADVISOR_PERSONAS.find((item) => item.voiceName === voiceName) ||
    DEFAULT_ADVISOR;
  const voice = findGeminiVoice(voiceName);
  return voice
    ? { ...advisor, voiceName: voice.name, voiceCharacter: voice.character }
    : advisor;
}
