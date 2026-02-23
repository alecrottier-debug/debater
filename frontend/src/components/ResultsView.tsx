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
  const colors = ["#a8802e", "#c9a84c", "#3a75d4", "#c4564a", "#3a8a5c"];
  const color = useMemo(
    () => colors[Math.floor(Math.random() * colors.length)],
    [],
  );
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

const detailedScoreGroups: {
  label: string;
  keys: (keyof DetailedSubScores)[];
}[] = [
  {
    label: "Argument Quality",
    keys: [
      "logicalRigor",
      "evidenceQuality",
      "rebuttalEffectiveness",
      "argumentNovelty",
      "persuasiveness",
    ],
  },
  {
    label: "Rhetorical Performance",
    keys: ["voiceAuthenticity", "rhetoricalSkill", "emotionalResonance"],
  },
  { label: "Strategic Skills", keys: ["framingControl", "adaptability"] },
];

const closenessText: Record<string, string> = {
  blowout: "Blowout",
  clear: "Clear Victory",
  narrow: "Narrow Win",
  "razor-thin": "Razor-Thin",
};

/* ── Main component ── */

export default function ResultsView({ debate }: ResultsViewProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetailedScores, setShowDetailedScores] = useState(false);
  const [activeTab, setActiveTab] = useState<"ballot" | "A" | "B">("ballot");
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

  const rawScores = decision.scores;
  const scores: Record<string, { A: number; B: number }> = {};
  if (rawScores?.A && rawScores?.B) {
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

  const verdict = decision.verdict;
  const closeness = decision.closeness;
  const analysis = decision.analysis;
  const detailedScores = decision.detailedScores;

  const winnerTotal = winner === "A" ? totalA : totalB;
  const loserTotal = winner === "A" ? totalB : totalA;
  const scoreDiff = Math.abs(totalA - totalB);

  /** Map raw stage IDs to human-readable labels with debater names */
  function humanizeStageId(stageId: string): string {
    const stageMap: Record<string, string> = {
      A_OPEN: `${nameA}'s Opening`,
      A_CHALLENGE: `${nameA}'s Challenge`,
      A_REBUTTAL: `${nameA}'s Rebuttal`,
      A_COUNTER: `${nameA}'s Counter`,
      A_CLOSE: `${nameA}'s Closing`,
      A_RESPOND_1: `${nameA}'s First Response`,
      A_RESPOND_2: `${nameA}'s Second Response`,
      A_FINAL: `${nameA}'s Final Thought`,
      B_OPEN: `${nameB}'s Opening`,
      B_CHALLENGE: `${nameB}'s Challenge`,
      B_REBUTTAL: `${nameB}'s Rebuttal`,
      B_COUNTER: `${nameB}'s Counter`,
      B_CLOSE: `${nameB}'s Closing`,
      B_RESPOND_1: `${nameB}'s First Response`,
      B_RESPOND_2: `${nameB}'s Second Response`,
      B_FINAL: `${nameB}'s Final Thought`,
      MOD_SETUP: "Moderator Setup",
      MOD_INTRO: "Moderator Introduction",
      MOD_Q1: "Opening Question",
      MOD_Q2: "Follow-up Question",
      MOD_SYNTHESIS: "Moderator Synthesis",
      MOD_WRAP: "Moderator Wrap-up",
      JUDGE: "Judge Decision",
    };
    return stageMap[stageId] ?? stageId;
  }

  function humanizeReason(text: string): string {
    return (
      text
        .replace(/\s*References?:\s*[A-Z_,;\s]+\.?\s*$/g, "")
        .replace(/\s*\([A-Z_]+(?:,\s*[A-Z_]+)*\)/g, "")
        .replace(/\[([A-Z][A-Z0-9_]+)\]/g, (_match, id) =>
          humanizeStageId(id),
        )
        .replace(
          /\b([AB]_(?:OPEN|CHALLENGE|REBUTTAL|COUNTER|CLOSE|RESPOND_[12]|FINAL))\b/g,
          (_match, id) => humanizeStageId(id),
        )
        .replace(
          /\b(MOD_(?:SETUP|INTRO|Q[12]|SYNTHESIS|WRAP))\b/g,
          (_match, id) => humanizeStageId(id),
        )
        .replace(/\bSide A\b/g, nameA)
        .replace(/\bSide B\b/g, nameB)
        .replace(/\bside A\b/g, nameA)
        .replace(/\bside B\b/g, nameB)
        .replace(/\bDebater A\b/g, nameA)
        .replace(/\bDebater B\b/g, nameB)
        .replace(/\bdebater A\b/g, nameA)
        .replace(/\bdebater B\b/g, nameB)
        .replace(/\bSpeaker A\b/g, nameA)
        .replace(/\bSpeaker B\b/g, nameB)
        .replace(/\bspeaker A\b/g, nameA)
        .replace(/\bspeaker B\b/g, nameB)
        .replace(/\bParticipant A\b/g, nameA)
        .replace(/\bParticipant B\b/g, nameB)
        .replace(/\bparticipant A\b/g, nameA)
        .replace(/\bparticipant B\b/g, nameB)
        .replace(/\bB\b/g, nameB)
        // Standalone "A" after punctuation = debater ref
        .replace(/(?<=[:;,]\s*)A\b/g, nameA)
        .replace(/(?<=\.\s+)A\b/g, nameA)
        .replace(/(?<![A-Za-z])\bA\b(?='s\b)/g, nameA)
    );
  }

  const rawBallot = decision.ballot as { refs: string[]; reason: string }[];
  const ballot = rawBallot?.map((item) => ({
    ...item,
    reason: humanizeReason(item.reason),
  }));
  const bestLines = decision.bestLines as { A: string; B: string };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4 pt-2.5 pb-4"
    >
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {/* ═══════════════════════════════════════════════
          3-Column Grid: Scorecard │ Winner │ Best Moments
         ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={`grid grid-cols-1 items-stretch gap-3.5 ${
          bestLines
            ? "lg:grid-cols-[1fr_240px_1fr]"
            : "lg:grid-cols-[1fr_240px]"
        }`}
      >
        {/* ── Scorecard (left) ── */}
        <div className="flex flex-col rounded-[10px] border border-[#e5e3dc] bg-white px-[18px] py-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-[var(--font-geist-mono)] text-[13px] font-medium uppercase tracking-[2.5px] text-[#999]">
              Scorecard
            </span>
            {detailedScores && (
              <button
                onClick={() => setShowDetailedScores(!showDetailedScores)}
                className="font-[var(--font-geist-mono)] text-[9px] uppercase tracking-[1.5px] text-[#3a75d4] transition-colors hover:text-[#2a5aa4]"
              >
                {showDetailedScores ? "Summary" : "Detailed"}
              </button>
            )}
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-[#eceae4] pb-2 text-left" />
                  <th className="w-[42px] border-b border-[#eceae4] pb-2 text-center font-[var(--font-geist-mono)] text-[9px] font-medium uppercase tracking-[1.5px] text-[#3a75d4]">
                    {nameA.split(" ")[0].charAt(0)}
                  </th>
                  <th className="w-[42px] border-b border-[#eceae4] pb-2 text-center font-[var(--font-geist-mono)] text-[9px] font-medium uppercase tracking-[1.5px] text-[#c4564a]">
                    {nameB.split(" ")[0].charAt(0)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!showDetailedScores
                  ? Object.entries(scores).map(([category, values], idx) => {
                      const isAHigher = values.A > values.B;
                      const isBHigher = values.B > values.A;
                      return (
                        <motion.tr
                          key={category}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 + idx * 0.06 }}
                        >
                          <td className="border-t border-[#eceae4] py-[7px] pr-2.5 text-[14px] text-[#5c5c5c] first:border-t-0">
                            {scoreLabels[category] || category}
                          </td>
                          <td className="border-t border-[#eceae4] py-[7px] text-center font-[var(--font-geist-mono)] text-[15px] font-medium text-[#3a75d4] first:border-t-0">
                            <span
                              className={`inline-block min-w-[28px] rounded px-1 py-px ${isAHigher ? "bg-[rgba(58,117,212,0.07)]" : ""}`}
                            >
                              {values.A}
                            </span>
                          </td>
                          <td className="border-t border-[#eceae4] py-[7px] text-center font-[var(--font-geist-mono)] text-[15px] font-medium text-[#c4564a] first:border-t-0">
                            <span
                              className={`inline-block min-w-[28px] rounded px-1 py-px ${isBHigher ? "bg-[rgba(196,86,74,0.07)]" : ""}`}
                            >
                              {values.B}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })
                  : detailedScores
                    ? detailedScoreGroups.flatMap((group) => [
                        <tr key={`h-${group.label}`}>
                          <td
                            colSpan={3}
                            className="bg-[#f3f2ee] py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#999]"
                          >
                            {group.label}
                          </td>
                        </tr>,
                        ...group.keys.map((key) => {
                          const aVal = detailedScores.A[key];
                          const bVal = detailedScores.B[key];
                          const isAHigher = aVal > bVal;
                          const isBHigher = bVal > aVal;
                          return (
                            <tr key={key}>
                              <td className="border-t border-[#eceae4] py-[5px] pr-2 text-[12px] text-[#5c5c5c]">
                                {detailedScoreLabels[key]}
                              </td>
                              <td className="border-t border-[#eceae4] py-[5px] text-center font-[var(--font-geist-mono)] text-[12px] font-medium text-[#3a75d4]">
                                <span
                                  className={`inline-block min-w-[24px] rounded px-1 py-px ${isAHigher ? "bg-[rgba(58,117,212,0.07)]" : ""}`}
                                >
                                  {aVal}
                                </span>
                              </td>
                              <td className="border-t border-[#eceae4] py-[5px] text-center font-[var(--font-geist-mono)] text-[12px] font-medium text-[#c4564a]">
                                <span
                                  className={`inline-block min-w-[24px] rounded px-1 py-px ${isBHigher ? "bg-[rgba(196,86,74,0.07)]" : ""}`}
                                >
                                  {bVal}
                                </span>
                              </td>
                            </tr>
                          );
                        }),
                      ])
                    : null}

                {/* Total row */}
                <tr>
                  <td className="border-t-[1.5px] border-[#e5e3dc] pt-2.5 text-[15px] font-semibold text-[#1a1a1a]">
                    Total
                  </td>
                  <td className="border-t-[1.5px] border-[#e5e3dc] pt-2.5 text-center font-[var(--font-geist-mono)] text-[20px] font-bold text-[#3a75d4]">
                    <span
                      className={`inline-block rounded px-1.5 py-px ${totalA > totalB ? "bg-[rgba(58,117,212,0.07)]" : ""}`}
                    >
                      {totalA}
                    </span>
                  </td>
                  <td className="border-t-[1.5px] border-[#e5e3dc] pt-2.5 text-center font-[var(--font-geist-mono)] text-[20px] font-bold text-[#c4564a]">
                    <span
                      className={`inline-block rounded px-1.5 py-px ${totalB > totalA ? "bg-[rgba(196,86,74,0.07)]" : ""}`}
                    >
                      {totalB}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Winner Card (center) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 22,
          }}
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-[10px] border border-[#e6d5a0] bg-[#faf6eb] p-5 text-center"
        >
          {/* Gold accent line at top */}
          <div className="pointer-events-none absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent opacity-60" />

          {/* Crown + label */}
          <div className="mb-2.5 flex items-center justify-center gap-[5px] font-[var(--font-geist-mono)] text-[12px] font-medium uppercase tracking-[2.5px] text-[#a8802e]">
            <svg
              className="h-[13px] w-[13px] fill-[#a8802e]"
              viewBox="0 0 24 24"
              style={{ animation: "crownPulse 3s ease-in-out infinite" }}
            >
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            Judge&apos;s Decision
          </div>

          {/* Portrait */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 250 }}
          >
            {winnerAvatar ? (
              <img
                src={winnerAvatar}
                alt={winnerPersona.name}
                className="mb-3 h-[150px] w-[150px] shrink-0 rounded-full border-[3px] border-[#e6d5a0] bg-[#f3f2ee] object-cover"
                style={{
                  boxShadow:
                    "0 0 0 5px #faf6eb, 0 4px 24px rgba(168,128,46,0.15)",
                }}
              />
            ) : (
              <div
                className="mb-3 flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#e6d5a0] bg-gradient-to-br from-[#c9a84c] to-[#a8802e]"
                style={{
                  boxShadow:
                    "0 0 0 5px #faf6eb, 0 4px 24px rgba(168,128,46,0.15)",
                }}
              >
                <svg
                  className="h-12 w-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                </svg>
              </div>
            )}
          </motion.div>

          {/* Winner name */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="font-[var(--font-playfair)] text-2xl font-semibold leading-tight text-[#a8802e]"
          >
            {isTie ? "TIE" : winnerPersona.name}
          </motion.div>

          {/* Defeats */}
          {!isTie && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-0.5 mb-2.5 text-[12px] text-[#5c5c5c]"
            >
              defeats{" "}
              <strong className="font-medium text-[#1a1a1a]">
                {loserPersona.name}
              </strong>
            </motion.div>
          )}

          {/* Scores box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1 }}
            className="rounded-lg border border-[#e6d5a0] bg-white/60 px-4 py-2.5"
          >
            <div className="flex items-baseline justify-center gap-2 font-[var(--font-playfair)]">
              <span className="text-[22px] font-light text-[#999]">
                {loserTotal}
              </span>
              <span className="text-[13px] text-[#999]">&mdash;</span>
              <span className="text-[28px] font-bold text-[#a8802e]">
                {winnerTotal}
              </span>
            </div>
            <div className="mt-0.5 font-[var(--font-geist-mono)] text-[9px] uppercase tracking-[1.5px] text-[#a8802e]">
              {closeness && closenessText[closeness]
                ? closenessText[closeness]
                : "Victory"}{" "}
              &middot; +{scoreDiff}
            </div>
          </motion.div>
        </motion.div>

        {/* ── Best Moments (right) ── */}
        {bestLines && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col rounded-[10px] border border-[#e5e3dc] bg-white px-[18px] py-4"
          >
            <div className="mb-2.5 font-[var(--font-geist-mono)] text-[13px] font-medium uppercase tracking-[2.5px] text-[#999]">
              Best Moments
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2.5">
              {/* Side A quote */}
              <div className="rounded-[6px] border-l-[3px] border-l-[#3a75d4] bg-[#f7f6f2] px-3.5 py-3">
                <p className="mb-1.5 font-[var(--font-cormorant)] text-[21px] italic leading-[1.4] text-[#1a1a1a]">
                  &ldquo;{bestLines.A}&rdquo;
                </p>
                <div className="flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] tracking-[1px] text-[#999]">
                  <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#3a75d4]" />
                  {nameA}
                </div>
              </div>
              {/* Side B quote */}
              <div className="rounded-[6px] border-l-[3px] border-l-[#c4564a] bg-[#f7f6f2] px-3.5 py-3">
                <p className="mb-1.5 font-[var(--font-cormorant)] text-[21px] italic leading-[1.4] text-[#1a1a1a]">
                  &ldquo;{bestLines.B}&rdquo;
                </p>
                <div className="flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] tracking-[1px] text-[#999]">
                  <span className="inline-block h-[5px] w-[5px] rounded-full bg-[#c4564a]" />
                  {nameB}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════
          Tabbed Analysis: Ballot │ Per-debater
         ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="overflow-hidden rounded-[10px] border border-[#e5e3dc] bg-white"
      >
        {/* Tab bar */}
        <div className="flex border-b border-[#e5e3dc]">
          <button
            onClick={() => setActiveTab("ballot")}
            className={`flex-1 border-b-2 px-3.5 py-2.5 text-center font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] transition-all ${
              activeTab === "ballot"
                ? "border-[#a8802e] bg-[#faf6eb] text-[#a8802e]"
                : "border-transparent text-[#999] hover:bg-[#f3f2ee] hover:text-[#5c5c5c]"
            }`}
          >
            Ballot Reasons
          </button>
          {analysis && (
            <>
              <button
                onClick={() => setActiveTab("A")}
                className={`flex-1 border-b-2 px-3.5 py-2.5 text-center font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] transition-all ${
                  activeTab === "A"
                    ? "border-[#a8802e] bg-[#faf6eb] text-[#a8802e]"
                    : "border-transparent text-[#999] hover:bg-[#f3f2ee] hover:text-[#5c5c5c]"
                }`}
              >
                {nameA.split(" ")[0]} Analysis
              </button>
              <button
                onClick={() => setActiveTab("B")}
                className={`flex-1 border-b-2 px-3.5 py-2.5 text-center font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] transition-all ${
                  activeTab === "B"
                    ? "border-[#a8802e] bg-[#faf6eb] text-[#a8802e]"
                    : "border-transparent text-[#999] hover:bg-[#f3f2ee] hover:text-[#5c5c5c]"
                }`}
              >
                {nameB.split(" ")[0]} Analysis
              </button>
            </>
          )}
        </div>

        {/* Tab content */}
        <div className="px-5 py-[18px]">
          <AnimatePresence mode="wait">
            {activeTab === "ballot" && (
              <motion.div
                key="ballot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Verdict */}
                {verdict && (
                  <div className="mb-3.5 border-b border-[#eceae4] pb-3 text-[15px] leading-[1.7] text-[#5c5c5c]">
                    {humanizeReason(verdict)}
                  </div>
                )}
                {/* Ballot points */}
                {ballot &&
                  ballot.length > 0 &&
                  ballot.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + idx * 0.06 }}
                      className="relative border-b border-[#eceae4] py-[7px] pl-3.5 last:border-b-0"
                    >
                      <span className="absolute left-0 top-[13px] h-[5px] w-[5px] rounded-full bg-[#a8802e]" />
                      <p className="text-[14px] leading-[1.6] text-[#5c5c5c]">
                        {item.reason}
                      </p>
                    </motion.div>
                  ))}
              </motion.div>
            )}

            {activeTab === "A" && analysis?.A && (
              <motion.div
                key="analysisA"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Strengths */}
                  <div>
                    <div className="mb-2 flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#3a8a5c]">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Strengths
                    </div>
                    {analysis.A.strengths?.map((s, i) => (
                      <div
                        key={i}
                        className="mb-[5px] flex items-start gap-[7px] rounded-[6px] bg-[#f3f2ee] px-2.5 py-[7px] text-[13px] leading-[1.5] text-[#5c5c5c]"
                      >
                        <div className="mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[rgba(58,138,92,0.08)] text-[8px] font-bold text-[#3a8a5c]">
                          ✓
                        </div>
                        <span>{humanizeReason(s)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Weaknesses */}
                  <div>
                    <div className="mb-2 flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#b5564a]">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Weaknesses
                    </div>
                    {analysis.A.weaknesses?.map((w, i) => (
                      <div
                        key={i}
                        className="mb-[5px] flex items-start gap-[7px] rounded-[6px] bg-[#f3f2ee] px-2.5 py-[7px] text-[13px] leading-[1.5] text-[#5c5c5c]"
                      >
                        <div className="mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[rgba(181,86,74,0.06)] text-[8px] font-bold text-[#b5564a]">
                          ✗
                        </div>
                        <span>{humanizeReason(w)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Key moment */}
                {analysis.A.keyMoment && (
                  <div className="mt-4 rounded-[6px] border border-[#e5e3dc] bg-[#f7f6f2] px-4 py-3">
                    <div className="mb-1 font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#a8802e]">
                      Key Moment
                      {analysis.A.keyMomentRef && (
                        <span className="ml-2 normal-case tracking-normal text-[#999]">
                          ({humanizeStageId(analysis.A.keyMomentRef)})
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] italic leading-[1.6] text-[#5c5c5c]">
                      {humanizeReason(analysis.A.keyMoment)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "B" && analysis?.B && (
              <motion.div
                key="analysisB"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Strengths */}
                  <div>
                    <div className="mb-2 flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#3a8a5c]">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Strengths
                    </div>
                    {analysis.B.strengths?.map((s, i) => (
                      <div
                        key={i}
                        className="mb-[5px] flex items-start gap-[7px] rounded-[6px] bg-[#f3f2ee] px-2.5 py-[7px] text-[13px] leading-[1.5] text-[#5c5c5c]"
                      >
                        <div className="mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[rgba(58,138,92,0.08)] text-[8px] font-bold text-[#3a8a5c]">
                          ✓
                        </div>
                        <span>{humanizeReason(s)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Weaknesses */}
                  <div>
                    <div className="mb-2 flex items-center gap-[5px] font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#b5564a]">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Weaknesses
                    </div>
                    {analysis.B.weaknesses?.map((w, i) => (
                      <div
                        key={i}
                        className="mb-[5px] flex items-start gap-[7px] rounded-[6px] bg-[#f3f2ee] px-2.5 py-[7px] text-[13px] leading-[1.5] text-[#5c5c5c]"
                      >
                        <div className="mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full bg-[rgba(181,86,74,0.06)] text-[8px] font-bold text-[#b5564a]">
                          ✗
                        </div>
                        <span>{humanizeReason(w)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Key moment */}
                {analysis.B.keyMoment && (
                  <div className="mt-4 rounded-[6px] border border-[#e5e3dc] bg-[#f7f6f2] px-4 py-3">
                    <div className="mb-1 font-[var(--font-geist-mono)] text-[10px] uppercase tracking-[2px] text-[#a8802e]">
                      Key Moment
                      {analysis.B.keyMomentRef && (
                        <span className="ml-2 normal-case tracking-normal text-[#999]">
                          ({humanizeStageId(analysis.B.keyMomentRef)})
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] italic leading-[1.6] text-[#5c5c5c]">
                      {humanizeReason(analysis.B.keyMoment)}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          Action Buttons
         ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="flex items-center justify-center gap-3 pt-1"
      >
        {/* Rematch */}
        <motion.button
          onClick={handleRematch}
          disabled={rematchLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-[10px] bg-[#a8802e] px-6 py-2.5 font-[var(--font-geist-mono)] text-[11px] font-medium uppercase tracking-[1.5px] text-white shadow-md transition-all hover:bg-[#8f6c26] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rematchLoading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Rematch...
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
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
          className="flex items-center gap-2 rounded-[10px] border border-[#e5e3dc] bg-white px-6 py-2.5 font-[var(--font-geist-mono)] text-[11px] font-medium uppercase tracking-[1.5px] text-[#5c5c5c] transition-all hover:border-[#d5d3cc] hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#999] border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
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
          className="flex items-center gap-2 rounded-[10px] border border-[#e5e3dc] bg-white px-6 py-2.5 font-[var(--font-geist-mono)] text-[11px] font-medium uppercase tracking-[1.5px] text-[#5c5c5c] transition-all hover:border-[#d5d3cc] hover:bg-[#f7f6f2]"
        >
          {copied ? (
            <>
              <svg
                className="h-3.5 w-3.5 text-[#3a8a5c]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
              <span className="text-[#3a8a5c]">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                />
              </svg>
              Copy
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
