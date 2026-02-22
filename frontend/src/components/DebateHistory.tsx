"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { fetchDebates } from "@/lib/api";
import type { Debate } from "@/lib/api";

function getAvatarUrl(persona: Debate["personaA"]): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

function FormatBadge({ mode }: { mode: string }) {
  const isDiscussion = mode === "discussion";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isDiscussion
          ? "bg-purple-100 text-purple-600"
          : "bg-blue-100 text-blue-600"
      }`}
    >
      {isDiscussion ? "Discussion" : "Debate"}
    </span>
  );
}

function WinnerBadge({ debate }: { debate: Debate }) {
  const isDiscussion = debate.mode === "discussion";

  if (debate.status !== "completed") {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {debate.status}
      </span>
    );
  }

  if (isDiscussion) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
        Completed
      </span>
    );
  }

  if (!debate.judgeDecision) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {debate.status}
      </span>
    );
  }

  const winner = debate.judgeDecision.winner;
  if (winner === "TIE") {
    return (
      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
        Tie
      </span>
    );
  }

  const isA = winner === "A";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
        isA ? "bg-blue-500" : "bg-purple-500"
      }`}
    >
      {isA ? debate.personaA.name : debate.personaB.name} wins
    </span>
  );
}

function DebateRow({ debate, onClick }: { debate: Debate; onClick: () => void }) {
  const avatarA = getAvatarUrl(debate.personaA);
  const avatarB = getAvatarUrl(debate.personaB);

  const ballot = debate.judgeDecision?.ballot as
    | Array<{ reason: string; refs?: string[] }>
    | undefined;
  const summary = ballot?.[0]?.reason;

  const date = new Date(debate.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-md"
    >
      {/* Format badge + Motion title */}
      <div className="mb-2 flex items-start gap-2">
        <FormatBadge mode={debate.mode} />
        <div className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {debate.motion}
        </div>
      </div>

      {/* Avatars + names + badge */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1.5">
          {avatarA ? (
            <img
              src={avatarA}
              alt={debate.personaA.name}
              className="h-7 w-7 rounded-full border border-blue-200 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
              A
            </div>
          )}
          <span className="text-xs text-gray-600">{debate.personaA.name}</span>
        </div>

        <span className="text-xs font-medium text-gray-300">
          {debate.mode === "discussion" ? "&" : "vs"}
        </span>

        <div className="flex items-center gap-1.5">
          {avatarB ? (
            <img
              src={avatarB}
              alt={debate.personaB.name}
              className="h-7 w-7 rounded-full border border-purple-200 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">
              B
            </div>
          )}
          <span className="text-xs text-gray-600">{debate.personaB.name}</span>
        </div>

        <div className="ml-auto">
          <WinnerBadge debate={debate} />
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-xs text-gray-400 line-clamp-2 mb-1">{summary}</p>
      )}

      {/* Date */}
      <div className="text-[10px] text-gray-300">{date}</div>
    </button>
  );
}

export default function DebateHistoryButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchDebates()
      .then(setDebates)
      .catch(() => setDebates([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        History
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-[5vh] z-50 mx-auto max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:w-full"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-4">
                <h3 className="text-base font-bold text-gray-900">
                  Debate History
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                  </div>
                ) : debates.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-400">No debates yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {debates.map((debate) => (
                      <DebateRow
                        key={debate.id}
                        debate={debate}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/debate/${debate.id}`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
