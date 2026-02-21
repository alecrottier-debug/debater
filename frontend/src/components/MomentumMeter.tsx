"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Turn, StageConfig, TurnPayload } from "@/lib/api";

interface MomentumMeterProps {
  turns: Turn[];
  stages: StageConfig[];
  personaAName: string;
  personaBName: string;
}

interface MomentumScore {
  A: number;
  B: number;
}

function computeMomentum(
  turns: Turn[],
  stages: StageConfig[]
): MomentumScore {
  const score: MomentumScore = { A: 0, B: 0 };

  turns.forEach((turn, idx) => {
    // Skip MOD and JUDGE stages
    if (turn.speaker !== "A" && turn.speaker !== "B") return;

    const side = turn.speaker;
    const stageConfig = stages[idx];
    if (!stageConfig) return;

    const payload = turn.payload as TurnPayload;

    // Conciseness: fewer words relative to max = more concise = +1
    if (stageConfig.maxWords) {
      const ratio = turn.wordCount / stageConfig.maxWords;
      if (ratio <= 0.85) {
        score[side] += 1; // Concise
      }
    }

    // Has question answered (shows responsiveness) = +1
    if (payload.questionAnswered) {
      score[side] += 1;
    }

    // Fewer violations = +1 (no violations)
    if (turn.violations.length === 0) {
      score[side] += 1;
    }

    // Has bullets (structured argument) = +0.5
    if (payload.bullets && payload.bullets.length > 0) {
      score[side] += 0.5;
    }

    // Asked a question when required = +0.5
    if (stageConfig.questionRequired && payload.question) {
      score[side] += 0.5;
    }
  });

  return score;
}

function getMomentumLabel(score: MomentumScore): { label: string; color: string } {
  const diff = score.A - score.B;
  if (Math.abs(diff) < 0.5) {
    return { label: "Tied", color: "text-slate-300" };
  }
  if (diff > 0) {
    return { label: "Side A leads", color: "text-blue-400" };
  }
  return { label: "Side B leads", color: "text-purple-400" };
}

export default function MomentumMeter({
  turns,
  stages,
  personaAName,
  personaBName,
}: MomentumMeterProps) {
  const score = useMemo(() => computeMomentum(turns, stages), [turns, stages]);

  // Don't show until we have at least one debater turn
  const hasDebaterTurns = turns.some((t) => t.speaker === "A" || t.speaker === "B");
  if (!hasDebaterTurns) return null;

  const total = score.A + score.B;
  const aPercent = total === 0 ? 50 : (score.A / total) * 100;
  const bPercent = 100 - aPercent;
  const momentum = getMomentumLabel(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/5 bg-[#111827] p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Momentum
        </h3>
        <span className={`text-xs font-semibold ${momentum.color}`}>
          {momentum.label}
        </span>
      </div>

      {/* Bar */}
      <div className="relative mb-2 flex h-3 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: "50%" }}
          animate={{ width: `${aPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative h-full bg-gradient-to-r from-blue-600 to-blue-400"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        </motion.div>
        <motion.div
          initial={{ width: "50%" }}
          animate={{ width: `${bPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative h-full bg-gradient-to-r from-purple-400 to-purple-600"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        </motion.div>
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-[10px] font-medium text-blue-400">
            {personaAName}
          </span>
          <span className="text-[10px] text-slate-500">
            ({score.A.toFixed(1)})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">
            ({score.B.toFixed(1)})
          </span>
          <span className="text-[10px] font-medium text-purple-400">
            {personaBName}
          </span>
          <div className="h-2 w-2 rounded-full bg-purple-400" />
        </div>
      </div>
    </motion.div>
  );
}
