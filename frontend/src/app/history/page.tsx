"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchDebates } from "@/lib/api";
import type { Debate } from "@/lib/api";

/* ── Helpers ── */

function getAvatarUrl(persona: Debate["personaA"]): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

function getAllParticipants(debates: Debate[]): string[] {
  const names = new Set<string>();
  for (const d of debates) {
    names.add(d.personaA.name);
    names.add(d.personaB.name);
  }
  return Array.from(names).sort();
}

/* ── Sub-components ── */

type TabFilter = "all" | "debate" | "discussion";

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
          active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function FormatBadge({ mode }: { mode: string }) {
  const isDiscussion = mode === "discussion";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        isDiscussion
          ? "bg-purple-100 text-purple-600"
          : "bg-blue-100 text-blue-600"
      }`}
    >
      {isDiscussion ? "Discussion" : "Debate"}
    </span>
  );
}

function StatusBadge({ debate }: { debate: Debate }) {
  const isDiscussion = debate.mode === "discussion";

  if (debate.status !== "completed") {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600">
        {debate.status === "in_progress" ? "In Progress" : debate.status}
      </span>
    );
  }

  if (isDiscussion) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
        Completed
      </span>
    );
  }

  if (!debate.judgeDecision) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {debate.status}
      </span>
    );
  }

  const winner = debate.judgeDecision.winner;
  if (winner === "TIE") {
    return (
      <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-600">
        Tie
      </span>
    );
  }

  const isA = winner === "A";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ${
        isA ? "bg-blue-500" : "bg-purple-500"
      }`}
    >
      {isA ? debate.personaA.name : debate.personaB.name} wins
    </span>
  );
}

function DebateCard({
  debate,
  onClick,
  index,
}: {
  debate: Debate;
  onClick: () => void;
  index: number;
}) {
  const avatarA = getAvatarUrl(debate.personaA);
  const avatarB = getAvatarUrl(debate.personaB);
  const isDiscussion = debate.mode === "discussion";

  const ballot = debate.judgeDecision?.ballot as
    | Array<{ reason: string }>
    | undefined;
  const rawSummary = ballot?.[0]?.reason?.replace(
    /\s*\([A-Z_]+(?:,\s*[A-Z_]+)*\)/g,
    ""
  );
  const summary = rawSummary
    ?.replace(/\bSide A\b/g, debate.personaA.name)
    .replace(/\bSide B\b/g, debate.personaB.name)
    .replace(/\bside A\b/g, debate.personaA.name)
    .replace(/\bside B\b/g, debate.personaB.name)
    .replace(/\bDebater A\b/g, debate.personaA.name)
    .replace(/\bDebater B\b/g, debate.personaB.name);

  const date = new Date(debate.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const time = new Date(debate.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      className="group w-full rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300"
    >
      {/* Top row: format badge + date */}
      <div className="flex items-center justify-between mb-3">
        <FormatBadge mode={debate.mode} />
        <span className="text-xs text-gray-400">
          {date} at {time}
        </span>
      </div>

      {/* Motion / Topic */}
      <h3 className="text-base font-bold text-gray-900 line-clamp-2 transition-colors group-hover:text-blue-600 mb-3">
        {debate.motion}
      </h3>

      {/* Participants */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          {avatarA ? (
            <img
              src={avatarA}
              alt={debate.personaA.name}
              className="h-9 w-9 rounded-full border-2 border-blue-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              A
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {debate.personaA.name}
          </span>
        </div>

        <span className="text-sm font-bold text-gray-300">
          {isDiscussion ? "&" : "vs"}
        </span>

        <div className="flex items-center gap-2">
          {avatarB ? (
            <img
              src={avatarB}
              alt={debate.personaB.name}
              className="h-9 w-9 rounded-full border-2 border-purple-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-600">
              B
            </div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {debate.personaB.name}
          </span>
        </div>

        <div className="ml-auto">
          <StatusBadge debate={debate} />
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
          {summary}
        </p>
      )}
    </motion.button>
  );
}

/* ── Main page ── */

export default function HistoryPage() {
  const router = useRouter();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [selectedParticipant, setSelectedParticipant] = useState("");

  useEffect(() => {
    fetchDebates()
      .then(setDebates)
      .catch(() => setDebates([]))
      .finally(() => setLoading(false));
  }, []);

  const participants = useMemo(() => getAllParticipants(debates), [debates]);

  const filtered = useMemo(() => {
    let result = debates;

    // Tab filter
    if (tab === "debate") result = result.filter((d) => d.mode !== "discussion");
    if (tab === "discussion") result = result.filter((d) => d.mode === "discussion");

    // Participant filter
    if (selectedParticipant) {
      result = result.filter(
        (d) =>
          d.personaA.name === selectedParticipant ||
          d.personaB.name === selectedParticipant
      );
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.motion.toLowerCase().includes(q) ||
          d.personaA.name.toLowerCase().includes(q) ||
          d.personaB.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [debates, tab, selectedParticipant, search]);

  const counts = useMemo(() => {
    const all = debates.length;
    const debateCount = debates.filter((d) => d.mode !== "discussion").length;
    const discussionCount = debates.filter((d) => d.mode === "discussion").length;
    return { all, debate: debateCount, discussion: discussionCount };
  }, [debates]);

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Page header */}
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-[var(--font-playfair)] text-3xl font-black tracking-tight text-gray-900"
        >
          History
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-1 text-sm text-gray-500"
        >
          Browse past debates and discussions
        </motion.p>
      </div>

      {/* Filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-5 flex flex-wrap items-center gap-3"
      >
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <TabButton label="All" count={counts.all} active={tab === "all"} onClick={() => setTab("all")} />
          <TabButton label="Debates" count={counts.debate} active={tab === "debate"} onClick={() => setTab("debate")} />
          <TabButton label="Discussions" count={counts.discussion} active={tab === "discussion"} onClick={() => setTab("discussion")} />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by topic or debater..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Participant filter */}
        <select
          value={selectedParticipant}
          onChange={(e) => setSelectedParticipant(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All Participants</option>
          {participants.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </motion.div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-300 border-t-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center"
        >
          {debates.length === 0 ? (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="mt-3 text-base font-medium text-gray-400">
                No debates or discussions yet
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Start a new debate to see it here
              </p>
            </>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <p className="mt-3 text-base font-medium text-gray-400">
                No results match your filters
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTab("all");
                  setSelectedParticipant("");
                }}
                className="mt-2 text-sm font-medium text-blue-500 hover:text-blue-600"
              >
                Clear filters
              </button>
            </>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((debate, i) => (
              <DebateCard
                key={debate.id}
                debate={debate}
                index={i}
                onClick={() => router.push(`/debate/${debate.id}`)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
