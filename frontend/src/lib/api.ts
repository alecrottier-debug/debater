import type { DebateStatus } from "./debate-constants";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// personaJson may be v1 (flat: name, tagline, style, etc.) or v2 (nested: identity, positions, rhetoric, etc.)
// Components should use fallback reads: e.g. json.identity?.avatarUrl ?? json.avatarUrl
export interface Persona {
  id: string;
  name: string;
  tagline: string;
  personaJson: Record<string, unknown>;
  isTemplate: boolean;
  role: string;
  createdAt: string;
}

export type Speaker = "MOD" | "A" | "B" | "JUDGE";

export interface StageConfig {
  id: string;
  label: string;
  speaker: Speaker;
  maxWords: number | null;
  bullets: { min: number; max: number } | null;
  questionRequired: boolean;
  questionCount: number;
}

export interface StagePlan {
  mode: string;
  stages: StageConfig[];
}

export interface TurnPayload {
  narrative?: string;
  lead?: string;
  bullets?: string[];
  question?: string;
  questionAnswered?: string;
  winner?: string;
  scores?: Record<string, { A: number; B: number }>;
  ballot?: { stageRef: string; reason: string }[];
  bestLines?: { A: string; B: string };
}

export interface Turn {
  id: string;
  debateId: string;
  stageId: string;
  speaker: Speaker;
  payload: TurnPayload;
  renderedText: string;
  wordCount: number;
  violations: string[];
  createdAt: string;
}

export interface DetailedSubScores {
  logicalRigor: number;
  evidenceQuality: number;
  rebuttalEffectiveness: number;
  argumentNovelty: number;
  persuasiveness: number;
  voiceAuthenticity: number;
  rhetoricalSkill: number;
  emotionalResonance: number;
  framingControl: number;
  adaptability: number;
}

export interface SideAnalysis {
  strengths: string[];
  weaknesses: string[];
  keyMoment: string;
  keyMomentRef: string;
}

export interface SideScores {
  clarity: number;
  strength: number;
  responsiveness: number;
  weighing: number;
  [key: string]: number;
}

export interface JudgeDecision {
  id: string;
  debateId: string;
  winner: string;
  scores: { A: SideScores; B: SideScores };
  ballot: { refs: string[]; reason: string }[];
  bestLines: { A: string; B: string };
  /** New in judge_v2 — may be absent for older debates */
  detailedScores?: { A: DetailedSubScores; B: DetailedSubScores };
  verdict?: string;
  analysis?: { A: SideAnalysis; B: SideAnalysis };
  momentum?: { trajectory: string; description: string };
  closeness?: string;
  createdAt: string;
}

export interface Debate {
  id: string;
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
  moderatorPersonaId: string | null;
  confrontationLevel: number;
  stageIndex: number;
  status: DebateStatus;
  createdAt: string;
  updatedAt: string;
  personaA: Persona;
  personaB: Persona;
  moderatorPersona: Persona | null;
  turns?: Turn[];
  judgeDecision: JudgeDecision | null;
}

export interface DiscussionWrapPayload {
  narrative: string;
  keyTakeaways: string[];
  areasOfAgreement: string[];
  areasOfDisagreement: string[];
  openQuestions: string[];
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function fetchPersonas(): Promise<Persona[]> {
  return apiFetch<Persona[]>("/personas");
}

export async function fetchDebates(): Promise<Debate[]> {
  return apiFetch<Debate[]>("/debates");
}

export async function createDebate(data: {
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
  moderatorPersonaId?: string;
  confrontationLevel?: number;
}): Promise<Debate> {
  return apiFetch<Debate>("/debates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchDebate(id: string): Promise<Debate> {
  return apiFetch<Debate>(`/debates/${id}`);
}

export async function advanceDebate(id: string): Promise<Debate> {
  return apiFetch<Debate>(`/debates/${id}/next`, {
    method: "POST",
  });
}

/* ========================== Streaming advance ========================== */

export type StreamEvent =
  | { type: "stage"; stageId: string; speaker: string; label: string }
  | { type: "narrative"; text: string }
  | { type: "done"; debate: Debate }
  | { type: "error"; message: string };

export interface StreamHandlers {
  onStage?: (event: { stageId: string; speaker: string; label: string }) => void;
  onNarrative?: (text: string) => void;
  onDone?: (debate: Debate) => void;
  onError?: (message: string) => void;
}

/**
 * Open an SSE connection to the streaming-advance endpoint. The LLM's narrative
 * text is delivered in cumulative deltas via `onNarrative`; once the turn is
 * persisted server-side, `onDone` fires with the refreshed debate.
 *
 * Returns an `unsubscribe` function — call it to abort the stream early
 * (e.g. on component unmount).
 */
export function streamAdvanceDebate(
  id: string,
  handlers: StreamHandlers,
): () => void {
  const url = `${API_BASE}/debates/${id}/next/stream`;
  const source = new EventSource(url);

  const close = () => source.close();

  const handle = (raw: MessageEvent) => {
    let event: StreamEvent;
    try {
      event = JSON.parse(raw.data) as StreamEvent;
    } catch {
      return;
    }
    switch (event.type) {
      case "stage":
        handlers.onStage?.({
          stageId: event.stageId,
          speaker: event.speaker,
          label: event.label,
        });
        break;
      case "narrative":
        handlers.onNarrative?.(event.text);
        break;
      case "done":
        handlers.onDone?.(event.debate);
        close();
        break;
      case "error":
        handlers.onError?.(event.message);
        close();
        break;
    }
  };

  // NestJS @Sse() emits each event with its `type` field as the SSE event name,
  // so a generic "message" listener won't pick them up. Subscribe to all four.
  for (const name of ["stage", "narrative", "done", "error"] as const) {
    source.addEventListener(name, handle as EventListener);
  }

  source.onerror = () => {
    // EventSource auto-reconnects on transient errors; once we've called
    // close() in the done/error branches, this handler is moot. Surface true
    // failures only when the connection couldn't be established at all.
    if (source.readyState === EventSource.CLOSED) {
      handlers.onError?.("Stream connection lost");
    }
  };

  return close;
}

export async function rematchDebate(id: string): Promise<Debate> {
  return apiFetch<Debate>(`/debates/${id}/rematch`, {
    method: "POST",
  });
}

export async function exportDebate(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/debates/${id}/export`);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }
  return res.text();
}

// Persona Builder API

export interface ResearchResult {
  dossierId: string;
  subject: string;
  summary: string;
  createdAt: string;
}

export async function researchPersona(data: {
  subject: string;
  context?: string;
}): Promise<ResearchResult> {
  return apiFetch<ResearchResult>("/personas/research", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function synthesizePersona(data: {
  dossierId: string;
  name?: string;
}): Promise<Persona> {
  return apiFetch<Persona>("/personas/synthesize", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** One-shot: research the subject and synthesize the persona in a single call. */
export async function researchAndSynthesizePersona(data: {
  subject: string;
  context?: string;
  name?: string;
}): Promise<{ persona: Persona; dossierId: string; summary: string }> {
  return apiFetch<{ persona: Persona; dossierId: string; summary: string }>(
    "/personas/research-and-synthesize",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function createPersona(data: {
  name: string;
  tagline: string;
  personaJson: Record<string, unknown>;
  isTemplate?: boolean;
}): Promise<Persona> {
  return apiFetch<Persona>("/personas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Quick stage plan for client-side reference
export const QUICK_STAGES: StageConfig[] = [
  { id: "MOD_SETUP", label: "Moderator Setup", speaker: "MOD", maxWords: 110, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_OPEN", label: "For Opening", speaker: "A", maxWords: 130, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "B_OPEN", label: "Against Opening", speaker: "B", maxWords: 130, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_CHALLENGE", label: "For Challenge", speaker: "A", maxWords: 100, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "B_COUNTER", label: "Against Counter", speaker: "B", maxWords: 110, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "A_COUNTER", label: "For Counter", speaker: "A", maxWords: 110, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "B_CLOSE", label: "Against Closing", speaker: "B", maxWords: 85, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_CLOSE", label: "For Closing", speaker: "A", maxWords: 85, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "JUDGE", label: "Judge Decision", speaker: "JUDGE", maxWords: null, bullets: null, questionRequired: false, questionCount: 0 },
];

// Discussion stage plan for client-side reference
export const DISCUSSION_STAGES: StageConfig[] = [
  { id: "MOD_INTRO", label: "Moderator Introduction", speaker: "MOD", maxWords: 130, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "MOD_Q1", label: "Opening Question", speaker: "MOD", maxWords: 60, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_RESPOND_1", label: "Guest A Response 1", speaker: "A", maxWords: 150, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "B_RESPOND_1", label: "Guest B Response 1", speaker: "B", maxWords: 150, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "MOD_Q2", label: "Follow-up Question", speaker: "MOD", maxWords: 70, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "B_RESPOND_2", label: "Guest B Response 2", speaker: "B", maxWords: 150, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_RESPOND_2", label: "Guest A Response 2", speaker: "A", maxWords: 150, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "MOD_SYNTHESIS", label: "Moderator Synthesis", speaker: "MOD", maxWords: 80, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_FINAL", label: "Guest A Final Thought", speaker: "A", maxWords: 100, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "MOD_WRAP", label: "Moderator Wrap-up", speaker: "MOD", maxWords: 150, bullets: null, questionRequired: false, questionCount: 0 },
];

export function getStagesForMode(mode: string): StageConfig[] {
  if (mode === "discussion") return DISCUSSION_STAGES;
  return QUICK_STAGES;
}
