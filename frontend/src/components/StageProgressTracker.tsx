"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StageConfig, Speaker } from "@/lib/api";

interface StageProgressTrackerProps {
  stages: StageConfig[];
  completedCount: number;
  isCompleted: boolean;
  personaAName?: string;
  personaBName?: string;
}

const speakerColors: Record<Speaker, string> = {
  MOD: "from-amber-500 to-orange-500",
  A: "from-blue-500 to-cyan-400",
  B: "from-purple-500 to-pink-400",
  JUDGE: "from-emerald-500 to-teal-400",
};

const speakerTextColors: Record<Speaker, string> = {
  MOD: "text-amber-600",
  A: "text-blue-600",
  B: "text-purple-600",
  JUDGE: "text-emerald-600",
};

export default function StageProgressTracker({
  stages,
  completedCount,
  isCompleted,
  personaAName = "Side A",
  personaBName = "Side B",
}: StageProgressTrackerProps) {
  function humanizeLabel(label: string): string {
    return label
      .replace(/\bSide A\b/g, personaAName)
      .replace(/\bSide B\b/g, personaBName)
      .replace(/\bGuest A\b/g, personaAName)
      .replace(/\bGuest B\b/g, personaBName);
  }
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const totalStages = stages.length;
  const progressPercent = isCompleted
    ? 100
    : (completedCount / totalStages) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
    >
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"
          />
        </div>
        {/* Completion text */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-400">
            {completedCount}/{totalStages} stages
          </span>
          {isCompleted && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
            >
              Complete
            </motion.span>
          )}
        </div>
      </div>

      {/* Stage ticks */}
      <div className="flex items-start justify-between gap-0.5">
        {stages.map((stage, idx) => {
          const isComplete = idx < completedCount;
          const isCurrent = idx === completedCount && !isCompleted;
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={stage.id}
              className="relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={`absolute right-1/2 top-[14px] h-0.5 w-full -translate-y-1/2 ${
                    isComplete ? "bg-gradient-to-r from-blue-300 to-purple-300" : "bg-gray-100"
                  }`}
                  style={{ left: "-50%" }}
                />
              )}

              {/* Dot/Tick */}
              <motion.div
                whileHover={{ scale: 1.2 }}
                className={`relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold transition-all sm:h-8 sm:w-8 sm:text-xs ${
                  isComplete
                    ? `bg-gradient-to-br ${speakerColors[stage.speaker]} text-white shadow-md`
                    : isCurrent
                    ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
                    : "border border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {isComplete ? (
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}

                {/* Pulsing ring for current stage */}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.div>

              {/* Label (desktop only) */}
              <span
                className={`mt-1.5 hidden text-center text-[9px] leading-tight sm:block ${
                  isComplete || isCurrent ? "text-gray-600" : "text-gray-300"
                }`}
              >
                {humanizeLabel(stage.label).split(" ").slice(0, 2).join("\n")}
              </span>

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-16 z-20 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
                  >
                    <p className="text-xs font-bold text-gray-900">{humanizeLabel(stage.label)}</p>
                    <p className={`text-[10px] ${speakerTextColors[stage.speaker]}`}>
                      {stage.speaker === "A"
                        ? personaAName
                        : stage.speaker === "B"
                        ? personaBName
                        : stage.speaker}
                      {stage.maxWords ? ` - ${stage.maxWords} max words` : ""}
                    </p>
                    <div className="absolute left-1/2 top-full -translate-x-1/2">
                      <div className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
