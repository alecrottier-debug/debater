const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  personaJson: Record<string, unknown>;
  isTemplate: boolean;
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

export interface JudgeDecision {
  id: string;
  debateId: string;
  winner: string;
  scores: Record<string, { A: number; B: number }>;
  ballot: { stageRef: string; reason: string }[];
  bestLines: { A: string; B: string };
  createdAt: string;
}

export interface Debate {
  id: string;
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
  stageIndex: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  personaA: Persona;
  personaB: Persona;
  turns: Turn[];
  judgeDecision: JudgeDecision | null;
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

export async function createDebate(data: {
  motion: string;
  mode: string;
  personaAId: string;
  personaBId: string;
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

// Text-to-Speech
export async function fetchTtsAudio(text: string, speaker: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speaker }),
  });
  if (!res.ok) {
    throw new Error(`TTS error ${res.status}`);
  }
  return res.blob();
}

// Quick stage plan for client-side reference
export const QUICK_STAGES: StageConfig[] = [
  { id: "MOD_SETUP", label: "Moderator Setup", speaker: "MOD", maxWords: 110, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_OPEN", label: "Side A Opening", speaker: "A", maxWords: 130, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "B_OPEN", label: "Side B Opening", speaker: "B", maxWords: 130, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_CHALLENGE", label: "Side A Challenge", speaker: "A", maxWords: 100, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "B_COUNTER", label: "Side B Counter", speaker: "B", maxWords: 110, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "A_COUNTER", label: "Side A Counter", speaker: "A", maxWords: 110, bullets: null, questionRequired: true, questionCount: 1 },
  { id: "B_CLOSE", label: "Side B Closing", speaker: "B", maxWords: 85, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "A_CLOSE", label: "Side A Closing", speaker: "A", maxWords: 85, bullets: null, questionRequired: false, questionCount: 0 },
  { id: "JUDGE", label: "Judge Decision", speaker: "JUDGE", maxWords: null, bullets: null, questionRequired: false, questionCount: 0 },
];
