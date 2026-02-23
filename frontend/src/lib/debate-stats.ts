import type { Debate } from "./api";

/* ── Types ── */

export interface HeroStats {
  totalDebates: number;
  totalDiscussions: number;
  completedDebates: number;
  avgCloseness: number;
  mostActivePersona: string | null;
}

export interface PersonaRecord {
  name: string;
  avatarUrl: string | undefined;
  wins: number;
  losses: number;
  ties: number;
  totalDebates: number;
  winRate: number;
  avgScore: number;
  bestQuote: string | undefined;
}

export interface HeadToHeadRecord {
  personaA: string;
  personaB: string;
  winsA: number;
  winsB: number;
  ties: number;
  debates: string[];
}

export interface TopicEntry {
  topic: string;
  count: number;
  lastDebated: string;
}

export interface BestQuote {
  quote: string;
  personaName: string;
  avatarUrl: string | undefined;
  debateMotion: string;
  debateId: string;
}

export interface AllStats {
  hero: HeroStats;
  leaderboard: PersonaRecord[];
  headToHead: HeadToHeadRecord[];
  topics: TopicEntry[];
  quotes: BestQuote[];
}

/* ── Helpers ── */

function getAvatarUrl(persona: Debate["personaA"]): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

const CLOSENESS_MAP: Record<string, number> = {
  "razor-thin": 5,
  "narrow": 4,
  "moderate": 3,
  "clear": 2,
  "dominant": 1,
};

function closenessToNumber(closeness: string | undefined): number {
  if (!closeness) return 3;
  const lower = closeness.toLowerCase();
  for (const [key, val] of Object.entries(CLOSENESS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 3;
}

function h2hKey(a: string, b: string): string {
  return [a, b].sort().join("|||");
}

/* ── Main computation ── */

export function computeStats(debates: Debate[]): AllStats {
  const personaMap = new Map<
    string,
    {
      name: string;
      avatarUrl: string | undefined;
      wins: number;
      losses: number;
      ties: number;
      totalDebates: number;
      scores: number[];
      bestQuote: string | undefined;
    }
  >();

  const h2hMap = new Map<
    string,
    { personaA: string; personaB: string; winsA: number; winsB: number; ties: number; debates: string[] }
  >();

  const topicMap = new Map<string, { count: number; lastDebated: string }>();
  const quotes: BestQuote[] = [];
  const closenessValues: number[] = [];
  const personaActivity = new Map<string, number>();

  const completedDebates = debates.filter((d) => d.status === "completed");
  const debateOnly = debates.filter((d) => d.mode !== "discussion");
  const discussionOnly = debates.filter((d) => d.mode === "discussion");

  for (const d of completedDebates) {
    const isDebate = d.mode !== "discussion";

    // Track topics
    const motion = d.motion.trim();
    const existing = topicMap.get(motion);
    if (existing) {
      existing.count++;
      if (d.createdAt > existing.lastDebated) existing.lastDebated = d.createdAt;
    } else {
      topicMap.set(motion, { count: 1, lastDebated: d.createdAt });
    }

    // Track activity
    personaActivity.set(d.personaA.name, (personaActivity.get(d.personaA.name) ?? 0) + 1);
    personaActivity.set(d.personaB.name, (personaActivity.get(d.personaB.name) ?? 0) + 1);

    // Only tally win/loss for actual debates with judge decisions
    if (!isDebate || !d.judgeDecision) continue;

    const jd = d.judgeDecision;
    const nameA = d.personaA.name;
    const nameB = d.personaB.name;
    const avatarA = getAvatarUrl(d.personaA);
    const avatarB = getAvatarUrl(d.personaB);

    // Initialize persona records
    for (const [name, avatar] of [
      [nameA, avatarA],
      [nameB, avatarB],
    ] as [string, string | undefined][]) {
      if (!personaMap.has(name)) {
        personaMap.set(name, { name, avatarUrl: avatar, wins: 0, losses: 0, ties: 0, totalDebates: 0, scores: [], bestQuote: undefined });
      }
    }

    const recA = personaMap.get(nameA)!;
    const recB = personaMap.get(nameB)!;
    recA.totalDebates++;
    recB.totalDebates++;

    // Scores — compute average across all score categories for each side
    if (jd.scores) {
      const scoresA = jd.scores.A;
      const scoresB = jd.scores.B;
      if (scoresA && typeof scoresA === "object") {
        const vals = Object.values(scoresA).filter((v): v is number => typeof v === "number");
        if (vals.length > 0) recA.scores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      if (scoresB && typeof scoresB === "object") {
        const vals = Object.values(scoresB).filter((v): v is number => typeof v === "number");
        if (vals.length > 0) recB.scores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }

    // Win/loss/tie
    if (jd.winner === "TIE") {
      recA.ties++;
      recB.ties++;
    } else if (jd.winner === "A") {
      recA.wins++;
      recB.losses++;
    } else if (jd.winner === "B") {
      recB.wins++;
      recA.losses++;
    }

    // Head to head
    const key = h2hKey(nameA, nameB);
    if (!h2hMap.has(key)) {
      const [sortedA, sortedB] = [nameA, nameB].sort();
      h2hMap.set(key, { personaA: sortedA, personaB: sortedB, winsA: 0, winsB: 0, ties: 0, debates: [] });
    }
    const h2h = h2hMap.get(key)!;
    h2h.debates.push(d.id);
    const [sortedFirst] = [nameA, nameB].sort();
    if (jd.winner === "TIE") {
      h2h.ties++;
    } else if (jd.winner === "A") {
      if (nameA === sortedFirst) h2h.winsA++;
      else h2h.winsB++;
    } else if (jd.winner === "B") {
      if (nameB === sortedFirst) h2h.winsA++;
      else h2h.winsB++;
    }

    // Closeness
    if (jd.closeness) {
      closenessValues.push(closenessToNumber(jd.closeness));
    }

    // Best quotes
    if (jd.bestLines) {
      if (jd.bestLines.A) {
        quotes.push({ quote: jd.bestLines.A, personaName: nameA, avatarUrl: avatarA, debateMotion: d.motion, debateId: d.id });
      }
      if (jd.bestLines.B) {
        quotes.push({ quote: jd.bestLines.B, personaName: nameB, avatarUrl: avatarB, debateMotion: d.motion, debateId: d.id });
      }
    }

    // Best quote per persona
    if (jd.bestLines?.A && !recA.bestQuote) recA.bestQuote = jd.bestLines.A;
    if (jd.bestLines?.B && !recB.bestQuote) recB.bestQuote = jd.bestLines.B;
  }

  // Build leaderboard
  const leaderboard = Array.from(personaMap.values())
    .map((r) => ({
      ...r,
      winRate: r.totalDebates > 0 ? r.wins / r.totalDebates : 0,
      avgScore: r.scores.length > 0 ? r.scores.reduce((a, b) => a + b, 0) / r.scores.length : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.avgScore - a.avgScore)
    .slice(0, 10);

  // Build topics
  const topics = Array.from(topicMap.entries())
    .map(([topic, data]) => ({ topic, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Most active persona
  let mostActivePersona: string | null = null;
  let maxActivity = 0;
  for (const [name, count] of personaActivity) {
    if (count > maxActivity) {
      maxActivity = count;
      mostActivePersona = name;
    }
  }

  // Average closeness
  const avgCloseness =
    closenessValues.length > 0
      ? closenessValues.reduce((a, b) => a + b, 0) / closenessValues.length
      : 0;

  return {
    hero: {
      totalDebates: debateOnly.length,
      totalDiscussions: discussionOnly.length,
      completedDebates: completedDebates.length,
      avgCloseness: Math.round(avgCloseness * 10) / 10,
      mostActivePersona,
    },
    leaderboard,
    headToHead: Array.from(h2hMap.values()),
    topics,
    quotes: quotes.slice(0, 8),
  };
}
