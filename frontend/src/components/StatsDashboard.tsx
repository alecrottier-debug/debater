"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Debate } from "@/lib/api";
import { computeStats, type AllStats, type PersonaRecord, type TopicEntry, type BestQuote } from "@/lib/debate-stats";

/* ── Hero Stats Bar ── */

function HeroStatsBar({ stats }: { stats: AllStats }) {
  const { hero } = stats;
  const cards = [
    {
      icon: (
        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      ),
      value: hero.totalDebates,
      label: "Debates",
    },
    {
      icon: (
        <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
      value: hero.totalDiscussions,
      label: "Discussions",
    },
    {
      icon: (
        <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
      value: hero.completedDebates,
      label: "Completed",
    },
    {
      icon: (
        <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
        </svg>
      ),
      value: hero.avgCloseness > 0 ? `${hero.avgCloseness}/5` : "—",
      label: "Avg Closeness",
    },
    {
      icon: (
        <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
      value: hero.mostActivePersona ?? "—",
      label: "Most Active",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="cursor-pointer rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2 shadow-sm backdrop-blur transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="shrink-0">{card.icon}</div>
            <div className="min-w-0">
              <div className={`font-bold text-gray-900 ${card.isText ? "text-sm truncate" : "text-2xl tabular-nums"}`}>
                {card.value}
              </div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Leaderboard ── */

const RANK_STYLES: Record<number, string> = {
  0: "text-amber-500",
  1: "text-gray-400",
  2: "text-orange-400",
};

function Leaderboard({
  leaderboard,
  onPersonaClick,
}: {
  leaderboard: PersonaRecord[];
  onPersonaClick: (name: string) => void;
}) {
  if (leaderboard.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
        <p className="text-sm text-gray-400">No debate results yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Leaderboard</h3>
        <p className="text-xs text-gray-400">Top personas by win rate (min 2 debates)</p>
      </div>
      <div className="divide-y divide-gray-50">
        {leaderboard
          .filter((p) => p.totalDebates >= 2)
          .map((persona, i) => (
            <motion.button
              key={persona.name}
              type="button"
              onClick={() => onPersonaClick(persona.name)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
            >
              {/* Rank */}
              <span className={`w-6 text-center text-sm font-bold ${RANK_STYLES[i] ?? "text-gray-300"}`}>
                {i + 1}
              </span>

              {/* Avatar */}
              {persona.avatarUrl ? (
                <img src={persona.avatarUrl} alt={persona.name} className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {persona.name[0]}
                </div>
              )}

              {/* Name + record */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 truncate">{persona.name}</div>
                <div className="text-xs text-gray-400">
                  {persona.wins}W-{persona.losses}L-{persona.ties}T
                </div>
              </div>

              {/* Win rate bar */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                    style={{ width: `${Math.round(persona.winRate * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-bold tabular-nums text-gray-600">
                  {Math.round(persona.winRate * 100)}%
                </span>
              </div>
            </motion.button>
          ))}
        {leaderboard.filter((p) => p.totalDebates >= 2).length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Need at least 2 debates per persona to rank
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Popular Topics ── */

function PopularTopics({ topics }: { topics: TopicEntry[] }) {
  if (topics.length === 0) return null;
  const max = topics[0].count;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Popular Topics</h3>
      </div>
      <div className="space-y-2 p-4">
        {topics.map((topic, i) => (
          <motion.div
            key={topic.topic}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-700 truncate">{topic.topic}</div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-300 to-indigo-400 transition-all"
                  style={{ width: `${(topic.count / max) * 100}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-600 tabular-nums">
              {topic.count}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Best Quotes Wall ── */

const QUOTE_ACCENTS = [
  "border-l-blue-400",
  "border-l-purple-400",
  "border-l-indigo-400",
  "border-l-violet-400",
  "border-l-blue-500",
  "border-l-purple-500",
  "border-l-indigo-500",
  "border-l-violet-500",
];

function BestQuotesWall({ quotes }: { quotes: BestQuote[] }) {
  const router = useRouter();
  if (quotes.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Best Quotes</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {quotes.map((q, i) => (
          <motion.button
            key={`${q.debateId}-${i}`}
            type="button"
            onClick={() => router.push(`/debate/${q.debateId}`)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-lg border-l-4 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 ${QUOTE_ACCENTS[i % QUOTE_ACCENTS.length]}`}
          >
            <p className="text-sm leading-relaxed text-gray-700 line-clamp-3">
              <span className="font-serif text-gray-300">&ldquo;</span>{q.quote}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {q.avatarUrl ? (
                <img src={q.avatarUrl} alt={q.personaName} className="h-5 w-5 rounded-full border border-gray-200 object-cover" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-500">
                  {q.personaName[0]}
                </div>
              )}
              <span className="text-xs font-medium text-gray-500">{q.personaName}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Activity ── */

function RecentActivity({ debates }: { debates: Debate[] }) {
  const router = useRouter();
  const recent = debates
    .filter((d) => d.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {recent.map((d, i) => {
          const avatarA = getAvatarUrlFromDebatePersona(d.personaA);
          const avatarB = getAvatarUrlFromDebatePersona(d.personaB);
          const isDebate = d.mode !== "discussion";
          const winner = d.judgeDecision?.winner;
          const date = new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <motion.button
              key={d.id}
              type="button"
              onClick={() => router.push(`/debate/${d.id}`)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <div className={`h-2 w-2 shrink-0 rounded-full ${isDebate ? "bg-blue-400" : "bg-purple-400"}`} />
              <div className="relative flex shrink-0">
                {avatarA ? (
                  <img src={avatarA} alt={d.personaA.name} className="h-6 w-6 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[10px] font-bold text-blue-600">A</div>
                )}
                {avatarB ? (
                  <img src={avatarB} alt={d.personaB.name} className="-ml-2 h-6 w-6 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div className="-ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-purple-100 text-[10px] font-bold text-purple-600">B</div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm text-gray-700 truncate">{d.motion}</div>
              <span className="shrink-0 text-xs text-gray-400">{date}</span>
              {isDebate && winner && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  winner === "TIE"
                    ? "bg-gray-100 text-gray-500"
                    : winner === "A"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-purple-100 text-purple-600"
                }`}>
                  {winner === "TIE" ? "Tie" : winner === "A" ? `${d.personaA.name} wins` : `${d.personaB.name} wins`}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function getAvatarUrlFromDebatePersona(persona: Debate["personaA"]): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

/* ── Main Dashboard Orchestrator ── */

export default function StatsDashboard({
  debates,
  onPersonaClick,
}: {
  debates: Debate[];
  onPersonaClick: (name: string) => void;
}) {
  const stats = useMemo(() => computeStats(debates), [debates]);

  return (
    <div className="space-y-6">
      {/* Hero stats */}
      <HeroStatsBar stats={stats} />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <Leaderboard leaderboard={stats.leaderboard} onPersonaClick={onPersonaClick} />
          <PopularTopics topics={stats.topics} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <BestQuotesWall quotes={stats.quotes} />
        </div>
      </div>

      {/* Recent Activity — full width */}
      <RecentActivity debates={debates} />
    </div>
  );
}
