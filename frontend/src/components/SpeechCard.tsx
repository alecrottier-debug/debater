"use client";

import { motion } from "framer-motion";
import type { Turn, Speaker, TurnPayload } from "@/lib/api";

interface SpeechCardProps {
  turn: Turn;
  stageLabel: string;
  speakerName: string;
  isLatest: boolean;
}

const speakerStyles: Record<
  Speaker,
  {
    border: string;
    bg: string;
    badge: string;
    badgeText: string;
    accent: string;
  }
> = {
  MOD: {
    border: "border-amber-200",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50/30",
    badge: "bg-amber-100",
    badgeText: "text-amber-700",
    accent: "border-l-amber-500",
  },
  A: {
    border: "border-blue-200",
    bg: "bg-gradient-to-br from-blue-50 to-sky-50/30",
    badge: "bg-blue-100",
    badgeText: "text-blue-700",
    accent: "border-l-blue-500",
  },
  B: {
    border: "border-purple-200",
    bg: "bg-gradient-to-br from-purple-50 to-fuchsia-50/30",
    badge: "bg-purple-100",
    badgeText: "text-purple-700",
    accent: "border-l-purple-500",
  },
  JUDGE: {
    border: "border-emerald-200",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50/30",
    badge: "bg-emerald-100",
    badgeText: "text-emerald-700",
    accent: "border-l-emerald-500",
  },
};

function getSlideDirection(speaker: Speaker): { x: number } {
  switch (speaker) {
    case "A":
      return { x: -40 };
    case "B":
      return { x: 40 };
    default:
      return { x: 0 };
  }
}

function getAlignment(speaker: Speaker): string {
  switch (speaker) {
    case "MOD":
    case "JUDGE":
      return "mx-auto max-w-xl";
    default:
      return "";
  }
}

export default function SpeechCard({
  turn,
  stageLabel,
  speakerName,
  isLatest,
}: SpeechCardProps) {
  const style = speakerStyles[turn.speaker];
  const slide = getSlideDirection(turn.speaker);
  const alignment = getAlignment(turn.speaker);
  const payload = turn.payload as TurnPayload;

  return (
    <motion.div
      id={`stage-${turn.stageId}`}
      initial={{ opacity: 0, x: slide.x, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.5,
        delay: isLatest ? 0.2 : 0,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`${alignment}`}
    >
      <div
        className={`overflow-hidden rounded-xl border border-l-4 ${style.border} ${style.bg} ${style.accent} shadow-sm`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${style.badge} ${style.badgeText}`}
          >
            {speakerName}
          </span>
          <span className="text-xs font-medium text-gray-400">{stageLabel}</span>
          {turn.violations.length > 0 && (
            <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500">
              {turn.violations.length} violation{turn.violations.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Lead text */}
          {payload.lead && (
            <p className="text-sm font-medium leading-relaxed text-gray-800">
              {payload.lead}
            </p>
          )}

          {/* Bullets */}
          {payload.bullets && payload.bullets.length > 0 && (
            <ul className="mt-3 space-y-2">
              {payload.bullets.map((bullet, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: isLatest ? 0.4 + i * 0.1 : 0 }}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600"
                >
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      turn.speaker === "A"
                        ? "bg-blue-400"
                        : turn.speaker === "B"
                        ? "bg-purple-400"
                        : turn.speaker === "MOD"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  {bullet}
                </motion.li>
              ))}
            </ul>
          )}

          {/* Question block */}
          {payload.question && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLatest ? 0.6 : 0 }}
              className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Question
              </p>
              <p className="mt-1 text-sm italic text-gray-700">
                &ldquo;{payload.question}&rdquo;
              </p>
            </motion.div>
          )}

          {/* Question answered */}
          {payload.questionAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isLatest ? 0.5 : 0 }}
              className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Answering
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {payload.questionAnswered}
              </p>
            </motion.div>
          )}

          {/* Violations detail */}
          {turn.violations.length > 0 && (
            <div className="mt-3 space-y-1">
              {turn.violations.map((v, i) => (
                <p key={i} className="text-xs text-red-500/70">
                  * {v}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer - word count */}
        <div className="border-t border-gray-100 px-5 py-2">
          <span className="text-[10px] text-gray-400">
            {turn.wordCount} words
          </span>
        </div>
      </div>
    </motion.div>
  );
}
