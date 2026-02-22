"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  rematchDebate,
  exportDebate,
  type Debate,
  type Persona,
  type DetailedSubScores,
} from "@/lib/api";

interface ResultsViewProps {
  debate: Debate;
}

/* ── Confetti ── */

function ConfettiParticle({ delay }: { delay: number }) {
  const randomX = useMemo(() => Math.random() * 100, []);
  const randomDuration = useMemo(() => 2 + Math.random() * 3, []);
  const randomRotation = useMemo(() => Math.random() * 720 - 360, []);
  const colors = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
  const color = useMemo(() => colors[Math.floor(Math.random() * colors.length)], []);
  const size = useMemo(() => 4 + Math.random() * 8, []);

  return (
    <motion.div
      initial={{ y: -20, x: `${randomX}vw`, opacity: 1, rotate: 0 }}
      animate={{ y: "100vh", opacity: 0, rotate: randomRotation }}
      transition={{ duration: randomDuration, delay, ease: "easeIn" }}
      className="pointer-events-none fixed top-0 z-50"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "0%",
        left: `${randomX}%`,
      }}
    />
  );
}

function Confetti() {
  const particles = Array.from({ length: 50 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((i) => (
        <ConfettiParticle key={i} delay={i * 0.04} />
      ))}
    </div>
  );
}

/* ── Helpers ── */

function getAvatarUrl(persona: Persona): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

const scoreLabels: Record<string, string> = {
  clarity: "Clarity",
  strength: "Argument Strength",
  responsiveness: "Responsiveness",
  weighing: "Impact Weighing",
};

const detailedScoreLabels: Record<keyof DetailedSubScores, string> = {
  logicalRigor: "Logical Rigor",
  evidenceQuality: "Evidence Quality",
  rebuttalEffectiveness: "Rebuttal Effectiveness",
  argumentNovelty: "Argument Novelty",
  persuasiveness: "Persuasiveness",
  voiceAuthenticity: "Voice Authenticity",
  rhetoricalSkill: "Rhetorical Skill",
  emotionalResonance: "Emotional Resonance",
  framingControl: "Framing Control",
  adaptability: "Adaptability",
};

const detailedScoreGroups: { label: string; keys: (keyof DetailedSubScores)[] }[] = [
  { label: "Argument Quality", keys: ["logicalRigor", "evidenceQuality", "rebuttalEffectiveness", "argumentNovelty", "persuasiveness"] },
  { label: "Rhetorical Performance", keys: ["voiceAuthenticity", "rhetoricalSkill", "emotionalResonance"] },
  { label: "Strategic Skills", keys: ["framingControl", "adaptability"] },
];

const closenessLabels: Record<string, { text: string; color: string }> = {
  "blowout": { text: "Blowout", color: "bg-red-100 text-red-700 border-red-200" },
  "clear": { text: "Clear Victory", color: "bg-amber-100 text-amber-700 border-amber-200" },
  "narrow": { text: "Narrow Win", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  "razor-thin": { text: "Razor-Thin", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const momentumLabels: Record<string, { text: string; icon: string }> = {
  "A_BUILDING": { text: "Side A gaining momentum", icon: "^" },
  "B_BUILDING": { text: "Side B gaining momentum", icon: "^" },
  "A_FADING": { text: "Side A losing steam", icon: "v" },
  "B_FADING": { text: "Side B losing steam", icon: "v" },
  "EVEN": { text: "Even momentum throughout", icon: "=" },
};

/* ── Main component ── */

export default function ResultsView({ debate }: ResultsViewProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetailedScores, setShowDetailedScores] = useState(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"A" | "B">("A");
  const decision = debate.judgeDecision;

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function handleRematch() {
    setRematchLoading(true);
    try {
      const newDebate = await rematchDebate(debate.id);
      router.push(`/debate/${newDebate.id}`);
    } catch (err) {
      console.error("Rematch failed:", err);
      setRematchLoading(false);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const markdown = await exportDebate(debate.id);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `debate-${debate.id.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleCopyExport() {
    try {
      const markdown = await exportDebate(debate.id);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  if (!decision) return null;

  const winner = decision.winner;
  const isTie = winner === "TIE";
  const winnerPersona = winner === "A" ? debate.personaA : debate.personaB;
  const loserPersona = winner === "A" ? debate.personaB : debate.personaA;
  const winnerAvatar = getAvatarUrl(winnerPersona);
  const loserAvatar = getAvatarUrl(loserPersona);
  const winnerColor = winner === "A" ? "blue" : "purple";

  const rawScores = decision.scores as Record<string, Record<string, number>>;
  const scores: Record<string, { A: number; B: number }> = {};
  if (rawScores.A && rawScores.B) {
    for (const category of Object.keys(rawScores.A)) {
      scores[category] = {
        A: rawScores.A[category] ?? 0,
        B: rawScores.B[category] ?? 0,
      };
    }
  }
  const totalA = Object.values(scores).reduce((s, v) => s + v.A, 0);
  const totalB = Object.values(scores).reduce((s, v) => s + v.B, 0);
  const nameA = debate.personaA.name;
  const nameB = debate.personaB.name;

  // New v2 fields (may be absent for older debates)
  const verdict = decision.verdict;
  const closeness = decision.closeness;
  const momentum = decision.momentum;
  const analysis = decision.analysis;
  const detailedScores = decision.detailedScores;

  function humanizeReason(text: string): string {
    return text
      // Strip trailing references like "References: A_OPEN, A_CHALLENGE, ..."
      .replace(/\s*References?:\s*[A-Z_,;\s]+\.?\s*$/g, "")
      // Strip inline parenthesized stage refs
      .replace(/\s*\([A-Z_]+(?:,\s*[A-Z_]+)*\)/g, "")
      // Named references
      .replace(/\bSide A\b/g, nameA)
      .replace(/\bSide B\b/g, nameB)
      .replace(/\bside A\b/g, nameA)
      .replace(/\bside B\b/g, nameB)
      .replace(/\bDebater A\b/g, nameA)
      .replace(/\bDebater B\b/g, nameB)
      .replace(/\bdebater A\b/g, nameA)
      .replace(/\bdebater B\b/g, nameB)
      // Standalone "B" is almost never a real English word — replace all instances
      .replace(/\bB\b/g, nameB)
      // Standalone "A" after punctuation (colon, semicolon, comma, period+space) = debater ref
      .replace(/(?<=[:;,]\s*)A\b/g, nameA)
      .replace(/(?<=\.\s+)A\b/g, nameA)
      // Possessive A's
      .replace(/(?<![A-Za-z])\bA\b(?='s\b)/g, nameA);
  }
  const rawBallot = decision.ballot as { stageRef: string; reason: string }[];
  const ballot = rawBallot?.map((item) => ({
    ...item,
    reason: humanizeReason(item.reason),
  }));
  const bestLines = decision.bestLines as { A: string; B: string };

  // Set initial analysis tab to the winner's side
  const effectiveAnalysisTab = activeAnalysisTab;
  const currentAnalysis = analysis?.[effectiveAnalysisTab];
  const currentAnalysisName = effectiveAnalysisTab === "A" ? nameA : nameB;
  const currentAnalysisColor = effectiveAnalysisTab === "A" ? "blue" : "purple";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3 overflow-y-auto pb-4"
    >
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {/* ═══════════════════════════════════════════════
          ROW 1: Winner Hero (left) + Scorecard (right)
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-3">
        {/* ── Winner Hero ── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 22 }}
          className={`col-span-3 relative overflow-hidden rounded-2xl border-2 px-5 py-3 ${
            winnerColor === "blue"
              ? "border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50/60 to-white"
              : "border-purple-200 bg-gradient-to-br from-purple-50 via-fuchsia-50/60 to-white"
          }`}
        >
          {/* Decorative glows */}
          <div
            className={`pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full blur-3xl ${
              winnerColor === "blue" ? "bg-blue-200/30" : "bg-purple-200/30"
            }`}
          />
          <div
            className={`pointer-events-none absolute -bottom-16 right-10 h-40 w-40 rounded-full blur-3xl ${
              winnerColor === "blue" ? "bg-cyan-200/20" : "bg-pink-200/20"
            }`}
          />

          <div className="relative flex items-center gap-7">
            {/* Large avatar pinned left */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 250 }}
              className="shrink-0"
            >
              {winnerAvatar ? (
                <div className="relative">
                  <div
                    className={`absolute -inset-2 rounded-2xl blur-xl ${
                      winnerColor === "blue" ? "bg-blue-400/25" : "bg-purple-400/25"
                    }`}
                  />
                  <img
                    src={winnerAvatar}
                    alt={winnerPersona.name}
                    className={`relative h-36 w-36 rounded-2xl border-2 object-cover shadow-2xl ${
                      winnerColor === "blue"
                        ? "border-blue-300 shadow-blue-200/50"
                        : "border-purple-300 shadow-purple-200/50"
                    }`}
                  />
                  <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-amber-300/50 ring-3 ring-white">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 3h14c.6 0 1 .4 1 1v2c0 3.3-2.2 6.2-5.3 7.1A3 3 0 0 1 12 16a3 3 0 0 1-2.7-2.9C6.2 12.2 4 9.3 4 6V4c0-.6.4-1 1-1Zm4 17h6v1c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1v-1Z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 shadow-2xl shadow-amber-200/50">
                  <svg className="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 3h14c.6 0 1 .4 1 1v2c0 3.3-2.2 6.2-5.3 7.1A3 3 0 0 1 12 16a3 3 0 0 1-2.7-2.9C6.2 12.2 4 9.3 4 6V4c0-.6.4-1 1-1Zm4 17h6v1c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1v-1Z" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* Text content right of avatar */}
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm font-bold uppercase tracking-[0.25em] text-gray-400"
              >
                Judge&apos;s Decision
              </motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className={`mt-1 font-[var(--font-playfair)] text-4xl font-black tracking-tight ${
                  winnerColor === "blue" ? "text-blue-600" : "text-purple-600"
                }`}
              >
                {isTie ? "TIE" : winnerPersona.name}
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-1 flex items-center gap-3"
              >
                {!isTie && (
                  <>
                    <span className="text-base text-gray-500">
                      defeats
                    </span>
                    <div className="flex items-center gap-2">
                      {loserAvatar && (
                        <img
                          src={loserAvatar}
                          alt={loserPersona.name}
                          className="h-7 w-7 rounded-full border border-gray-200 object-cover opacity-60"
                        />
                      )}
                      <span className="text-base font-semibold text-gray-500">
                        {loserPersona.name}
                      </span>
                    </div>
                  </>
                )}
              </motion.div>

              {/* Score pill + closeness badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0 }}
                className="mt-2 flex items-center gap-3"
              >
                <div className="inline-flex items-center gap-4 rounded-full border border-gray-200 bg-white/90 px-5 py-1.5 shadow-sm backdrop-blur-sm">
                  <span className="text-xl font-extrabold text-blue-600 tabular-nums">{totalA}</span>
                  <span className="text-lg text-gray-300">&mdash;</span>
                  <span className="text-xl font-extrabold text-purple-600 tabular-nums">{totalB}</span>
                </div>
                {closeness && closenessLabels[closeness] && (
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${closenessLabels[closeness].color}`}>
                    {closenessLabels[closeness].text}
                  </span>
                )}
                {momentum && momentumLabels[momentum.trajectory] && (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500" title={momentum.description}>
                    {momentum.trajectory.startsWith(winner) ? (
                      <svg className="mr-1 inline h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                    ) : momentum.trajectory === "EVEN" ? (
                      <svg className="mr-1 inline h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    ) : (
                      <svg className="mr-1 inline h-3 w-3 text-orange-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25M4.5 19.5V8.25" />
                      </svg>
                    )}
                    {momentumLabels[momentum.trajectory].text.replace("Side A", nameA.split(" ")[0]).replace("Side B", nameB.split(" ")[0])}
                  </span>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Scorecard ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 22 }}
          className="col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-2.5">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
              Scorecard
            </h3>
            {detailedScores && (
              <button
                onClick={() => setShowDetailedScores(!showDetailedScores)}
                className="text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
              >
                {showDetailedScores ? "Summary" : "Detailed"}
              </button>
            )}
          </div>

          {/* Column headers */}
          <div className="flex items-center border-b border-gray-100 px-5 py-2">
            <div className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Category
            </div>
            <div className="w-16 text-center text-xs font-bold text-blue-600">
              {debate.personaA.name.split(" ")[0]}
            </div>
            <div className="w-16 text-center text-xs font-bold text-purple-600">
              {debate.personaB.name.split(" ")[0]}
            </div>
          </div>

          {/* Score rows — summary or detailed */}
          <div>
            <AnimatePresence mode="wait">
              {!showDetailedScores ? (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {Object.entries(scores).map(([category, values], idx) => {
                    const isAHigher = values.A > values.B;
                    const isBHigher = values.B > values.A;
                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 + idx * 0.06 }}
                        className="flex items-center border-b border-gray-50 px-5 py-2.5 last:border-b-0"
                      >
                        <div className="flex-1 text-sm font-medium text-gray-600">
                          {scoreLabels[category] || category}
                        </div>
                        <div
                          className={`w-16 text-center text-lg font-bold tabular-nums ${
                            isAHigher ? "text-blue-600" : "text-gray-300"
                          }`}
                        >
                          {values.A}
                        </div>
                        <div
                          className={`w-16 text-center text-lg font-bold tabular-nums ${
                            isBHigher ? "text-purple-600" : "text-gray-300"
                          }`}
                        >
                          {values.B}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : detailedScores ? (
                <motion.div
                  key="detailed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {detailedScoreGroups.map((group) => (
                    <div key={group.label}>
                      <div className="bg-gray-50 px-5 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                        {group.label}
                      </div>
                      {group.keys.map((key) => {
                        const aVal = detailedScores.A[key];
                        const bVal = detailedScores.B[key];
                        const isAHigher = aVal > bVal;
                        const isBHigher = bVal > aVal;
                        return (
                          <div
                            key={key}
                            className="flex items-center border-b border-gray-50 px-5 py-1.5 last:border-b-0"
                          >
                            <div className="flex-1 text-xs font-medium text-gray-500">
                              {detailedScoreLabels[key]}
                            </div>
                            <div
                              className={`w-16 text-center text-sm font-bold tabular-nums ${
                                isAHigher ? "text-blue-600" : "text-gray-300"
                              }`}
                            >
                              {aVal}
                            </div>
                            <div
                              className={`w-16 text-center text-sm font-bold tabular-nums ${
                                isBHigher ? "text-purple-600" : "text-gray-300"
                              }`}
                            >
                              {bVal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Totals */}
          <div className="flex items-center border-t-2 border-gray-200 bg-gray-50/50 px-5 py-2.5">
            <div className="flex-1 text-sm font-bold text-gray-900">Total</div>
            <div className="w-16 text-center text-xl font-extrabold text-blue-600">
              {totalA}
            </div>
            <div className="w-16 text-center text-xl font-extrabold text-purple-600">
              {totalB}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════
          ROW 1.5: Verdict (full width, if present)
         ═══════════════════════════════════════════════ */}
      {verdict && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
          className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-gray-50/50 to-white px-5 py-2.5 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L3 7l1.63 14.27L12 22l7.37-0.73L21 7l-9-5zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z" />
            </svg>
            <p className="text-sm leading-relaxed text-gray-700 italic">
              {humanizeReason(verdict)}
            </p>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════
          ROW 2: Ballot + Analysis (left) + Best Moments (right)
         ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-3">
        {/* ── Ballot Reasons + Analysis (wider: 3/5) ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="col-span-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          {/* Tab bar for Ballot vs Analysis */}
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em] transition-colors ${
                !analysis || activeAnalysisTab === "A" && !showDetailedScores
                  ? "text-gray-500 border-b-2 border-gray-300"
                  : "text-gray-500 border-b-2 border-gray-300"
              }`}
              style={{ borderBottomColor: "transparent" }}
            >
              Ballot Reasons
            </button>
            {analysis && (
              <>
                <button
                  onClick={() => setActiveAnalysisTab("A")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors border-b-2 ${
                    activeAnalysisTab === "A"
                      ? "text-blue-600 border-blue-500"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  {nameA.split(" ")[0]} Analysis
                </button>
                <button
                  onClick={() => setActiveAnalysisTab("B")}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-colors border-b-2 ${
                    activeAnalysisTab === "B"
                      ? "text-purple-600 border-purple-500"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  {nameB.split(" ")[0]} Analysis
                </button>
              </>
            )}
          </div>

          <div>
            {/* Ballot reasons — always shown at top */}
            {ballot && ballot.length > 0 && (
              <div className="space-y-2 px-5 py-2">
                {ballot.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 + idx * 0.08 }}
                    className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <p className="text-sm leading-relaxed text-gray-700">
                      {item.reason}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Per-side analysis (if present) */}
            {analysis && currentAnalysis && (
              <div className="border-t border-gray-100 px-5 py-3 space-y-3">
                {/* Strengths */}
                {currentAnalysis.strengths && currentAnalysis.strengths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Strengths</h4>
                    <div className="space-y-1">
                      {currentAnalysis.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs leading-relaxed text-gray-700">{humanizeReason(s)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weaknesses */}
                {currentAnalysis.weaknesses && currentAnalysis.weaknesses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Areas for Improvement</h4>
                    <div className="space-y-1">
                      {currentAnalysis.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2">
                          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs leading-relaxed text-gray-700">{humanizeReason(w)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key moment */}
                {currentAnalysis.keyMoment && (
                  <div className={`rounded-xl border px-4 py-3 ${
                    currentAnalysisColor === "blue"
                      ? "border-blue-200 bg-blue-50/50"
                      : "border-purple-200 bg-purple-50/50"
                  }`}>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      currentAnalysisColor === "blue" ? "text-blue-600" : "text-purple-600"
                    }`}>
                      Key Moment
                      {currentAnalysis.keyMomentRef && (
                        <span className="ml-2 font-mono text-[10px] text-gray-400">
                          [{currentAnalysis.keyMomentRef}]
                        </span>
                      )}
                    </h4>
                    <p className="text-sm italic leading-relaxed text-gray-700">
                      {humanizeReason(currentAnalysis.keyMoment)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Best Moments (narrower: 2/5) ── */}
        {bestLines && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="col-span-2 flex flex-col gap-2 self-start"
          >
            <h3 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
              Best Moments
            </h3>

            {/* Side A best line */}
            <div className="group relative">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-blue-400 via-cyan-300 to-blue-500 opacity-40 transition-opacity group-hover:opacity-70" />
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 via-sky-50/50 to-transparent px-4 py-3 shadow-sm">
                <div className="absolute -right-2 -top-2 select-none font-serif text-[70px] font-bold leading-none text-blue-200/40">
                  &ldquo;
                </div>
                <p className="relative text-base font-semibold italic leading-relaxed text-blue-800">
                  &ldquo;{bestLines.A}&rdquo;
                </p>
                <div className="relative mt-2 flex items-center gap-2">
                  {getAvatarUrl(debate.personaA) && (
                    <img
                      src={getAvatarUrl(debate.personaA)!}
                      alt={debate.personaA.name}
                      className="h-6 w-6 rounded-full border border-blue-200 object-cover"
                    />
                  )}
                  <div className="h-0.5 w-4 rounded-full bg-blue-500/50" />
                  <span className="text-sm font-bold text-gray-600">
                    {debate.personaA.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Side B best line */}
            <div className="group relative">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-purple-400 via-pink-300 to-purple-500 opacity-40 transition-opacity group-hover:opacity-70" />
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 via-fuchsia-50/50 to-transparent px-4 py-3 shadow-sm">
                <div className="absolute -right-2 -top-2 select-none font-serif text-[70px] font-bold leading-none text-purple-200/40">
                  &ldquo;
                </div>
                <p className="relative text-base font-semibold italic leading-relaxed text-purple-800">
                  &ldquo;{bestLines.B}&rdquo;
                </p>
                <div className="relative mt-2 flex items-center gap-2">
                  {getAvatarUrl(debate.personaB) && (
                    <img
                      src={getAvatarUrl(debate.personaB)!}
                      alt={debate.personaB.name}
                      className="h-6 w-6 rounded-full border border-purple-200 object-cover"
                    />
                  )}
                  <div className="h-0.5 w-4 rounded-full bg-purple-500/50" />
                  <span className="text-sm font-bold text-gray-600">
                    {debate.personaB.name}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          BOTTOM: Action buttons
         ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="flex items-center justify-center gap-3 border-t border-gray-200/60 pt-3 pb-1"
      >
        {/* Rematch */}
        <motion.button
          onClick={handleRematch}
          disabled={rematchLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rematchLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Rematch...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Rematch
            </>
          )}
        </motion.button>

        {/* Export */}
        <motion.button
          onClick={handleExport}
          disabled={exportLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </>
          )}
        </motion.button>

        {/* Copy */}
        <motion.button
          onClick={handleCopyExport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
        >
          {copied ? (
            <>
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              Copy
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
