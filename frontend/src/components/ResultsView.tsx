"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { rematchDebate, exportDebate, type Debate, type JudgeDecision } from "@/lib/api";
import BestMomentCard from "@/components/BestMomentCard";

interface ResultsViewProps {
  debate: Debate;
}

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
      animate={{
        y: "100vh",
        opacity: 0,
        rotate: randomRotation,
      }}
      transition={{
        duration: randomDuration,
        delay: delay,
        ease: "easeIn",
      }}
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

const scoreLabels: Record<string, string> = {
  clarity: "Clarity",
  strength: "Argument Strength",
  responsiveness: "Responsiveness",
  weighing: "Impact Weighing",
};

export default function ResultsView({ debate }: ResultsViewProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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
      // Try to download as file
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

  if (!decision) {
    return null;
  }

  const winner = decision.winner;
  const winnerName =
    winner === "A" ? debate.personaA.name : debate.personaB.name;
  const loserName =
    winner === "A" ? debate.personaB.name : debate.personaA.name;
  const winnerColor = winner === "A" ? "blue" : "purple";

  const scores = decision.scores as Record<string, { A: number; B: number }>;
  const ballot = decision.ballot as { stageRef: string; reason: string }[];
  const bestLines = decision.bestLines as { A: string; B: string };

  function scrollToStage(stageRef: string) {
    // Try to find matching stage element
    const el = document.getElementById(`stage-${stageRef}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-emerald-500/50");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-emerald-500/50");
      }, 2000);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mt-8 space-y-6"
    >
      {/* Confetti */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {/* Winner Spotlight */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        className={`relative overflow-hidden rounded-2xl border p-8 text-center ${
          winnerColor === "blue"
            ? "border-blue-500/30 bg-gradient-to-br from-blue-950/50 via-blue-900/20 to-transparent"
            : "border-purple-500/30 bg-gradient-to-br from-purple-950/50 via-purple-900/20 to-transparent"
        }`}
      >
        {/* Glow background */}
        <div
          className={`absolute inset-0 opacity-20 ${
            winnerColor === "blue"
              ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent"
              : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500 to-transparent"
          }`}
        />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Winner
          </p>

          {/* Trophy */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
            className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-2xl shadow-amber-500/30"
          >
            <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3h14c.6 0 1 .4 1 1v2c0 3.3-2.2 6.2-5.3 7.1A3 3 0 0 1 12 16a3 3 0 0 1-2.7-2.9C6.2 12.2 4 9.3 4 6V4c0-.6.4-1 1-1Zm4 17h6v1c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1v-1Z" />
            </svg>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className={`mt-4 text-3xl font-bold ${
              winnerColor === "blue" ? "text-blue-400" : "text-purple-400"
            }`}
          >
            {winnerName}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            className="mt-1 text-sm text-slate-400"
          >
            defeats {loserName}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Scorecard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="rounded-2xl border border-white/5 bg-[#111827] p-6"
      >
        <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-wider text-slate-300">
          Scorecard
        </h3>

        {/* Column headers */}
        <div className="mb-2 flex items-center px-2">
          <div className="flex-1" />
          <div className="w-20 text-center text-xs font-bold text-blue-400">
            {debate.personaA.name}
          </div>
          <div className="w-20 text-center text-xs font-bold text-purple-400">
            {debate.personaB.name}
          </div>
        </div>

        {/* Score rows */}
        <div className="space-y-2">
          {Object.entries(scores).map(([category, values], idx) => {
            const aScore = values.A;
            const bScore = values.B;
            const isAHigher = aScore > bScore;
            const isBHigher = bScore > aScore;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6 + idx * 0.1 }}
                className="flex items-center rounded-lg bg-white/[0.02] px-3 py-2.5"
              >
                <div className="flex-1 text-sm text-slate-300">
                  {scoreLabels[category] || category}
                </div>
                <div
                  className={`w-20 text-center text-sm font-bold ${
                    isAHigher ? "text-blue-400" : "text-slate-500"
                  }`}
                >
                  {aScore}
                </div>
                <div
                  className={`w-20 text-center text-sm font-bold ${
                    isBHigher ? "text-purple-400" : "text-slate-500"
                  }`}
                >
                  {bScore}
                </div>
              </motion.div>
            );
          })}

          {/* Totals */}
          <div className="mt-2 flex items-center border-t border-white/5 px-3 pt-3">
            <div className="flex-1 text-sm font-bold text-white">Total</div>
            <div className="w-20 text-center text-sm font-bold text-blue-400">
              {Object.values(scores).reduce((sum, v) => sum + v.A, 0)}
            </div>
            <div className="w-20 text-center text-sm font-bold text-purple-400">
              {Object.values(scores).reduce((sum, v) => sum + v.B, 0)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ballot Reasons */}
      {ballot && ballot.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
          className="rounded-2xl border border-white/5 bg-[#111827] p-6"
        >
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">
            Ballot Reasons
          </h3>
          <div className="space-y-3">
            {ballot.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.1 + idx * 0.1 }}
                className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-4 py-3"
              >
                <button
                  onClick={() => scrollToStage(item.stageRef)}
                  className="mt-0.5 shrink-0 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  {item.stageRef}
                </button>
                <p className="text-sm leading-relaxed text-slate-300">
                  {item.reason}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Best Moments Quote Cards */}
      {bestLines && (
        <div className="grid gap-4 sm:grid-cols-2">
          <BestMomentCard
            quote={bestLines.A}
            speakerName={debate.personaA.name}
            side="A"
            index={0}
          />
          <BestMomentCard
            quote={bestLines.B}
            speakerName={debate.personaB.name}
            side="B"
            index={1}
          />
        </div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.8 }}
        className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center"
      >
        {/* Rematch Button */}
        <motion.button
          onClick={handleRematch}
          disabled={rematchLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rematchLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Creating Rematch...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Rematch
            </>
          )}
        </motion.button>

        {/* Export Markdown Button */}
        <motion.button
          onClick={handleExport}
          disabled={exportLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              Exporting...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Markdown
            </>
          )}
        </motion.button>

        {/* Copy to Clipboard Button */}
        <motion.button
          onClick={handleCopyExport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/10"
        >
          {copied ? (
            <>
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
