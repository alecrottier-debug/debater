"use client";

import { motion } from "framer-motion";
import type { Turn, Speaker, TurnPayload } from "@/lib/api";

interface SpeechCardProps {
  turn: Turn;
  stageLabel: string;
  speakerName: string;
  avatarUrl?: string;
  isLatest: boolean;
}

const bubbleColors: Record<Speaker, { bg: string; border: string; tail: string; text: string }> = {
  A: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    tail: "text-blue-200",
    text: "text-blue-900",
  },
  B: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    tail: "text-purple-200",
    text: "text-purple-900",
  },
  MOD: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    tail: "text-amber-200",
    text: "text-amber-900",
  },
  JUDGE: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    tail: "text-emerald-200",
    text: "text-emerald-900",
  },
};

const avatarRing: Record<Speaker, string> = {
  A: "ring-blue-300",
  B: "ring-purple-300",
  MOD: "ring-amber-300",
  JUDGE: "ring-emerald-300",
};

function getSlideDirection(speaker: Speaker): { x: number } {
  switch (speaker) {
    case "A":
      return { x: -30 };
    case "B":
      return { x: 30 };
    default:
      return { x: 0 };
  }
}

export default function SpeechCard({
  turn,
  stageLabel,
  speakerName,
  avatarUrl,
  isLatest,
}: SpeechCardProps) {
  const colors = bubbleColors[turn.speaker];
  const slide = getSlideDirection(turn.speaker);
  const payload = turn.payload as TurnPayload;

  const isLeft = turn.speaker === "A";
  const isRight = turn.speaker === "B";
  const isCentered = !isLeft && !isRight;

  const avatar = (
    <>
      {avatarUrl ? (
        <motion.img
          src={avatarUrl}
          alt={speakerName}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: isLatest ? 0.1 : 0, type: "spring", stiffness: 300 }}
          className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${avatarRing[turn.speaker]} shadow-md`}
        />
      ) : (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ${avatarRing[turn.speaker]} ${colors.bg} ${colors.text} shadow-md`}
        >
          {speakerName.charAt(0)}
        </div>
      )}
    </>
  );

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
      className={`flex items-end gap-3 ${
        isRight ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar — only for A/B */}
      {!isCentered && avatar}

      {/* Bubble — stretches full width */}
      <div className="relative min-w-0 flex-1">
        {/* Speech tail */}
        {isLeft && (
          <div className={`absolute -left-2 bottom-3 ${colors.tail}`}>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
              <path d="M12 0C12 0 4 4 2 8C0 12 0 16 0 16L12 12V0Z" fill="currentColor" />
            </svg>
          </div>
        )}
        {isRight && (
          <div className={`absolute -right-2 bottom-3 ${colors.tail}`}>
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
              <path d="M0 0C0 0 8 4 10 8C12 12 12 16 12 16L0 12V0Z" fill="currentColor" />
            </svg>
          </div>
        )}

        <div
          className={`overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} shadow-sm ${
            isLeft ? "rounded-bl-sm" : isRight ? "rounded-br-sm" : ""
          }`}
        >
          {/* Body — no header row */}
          <div className="px-4 py-3">
            {/* Narrative prose */}
            {payload.narrative && (
              <div className="space-y-2">
                {payload.narrative.split("\n\n").map((paragraph, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: isLatest ? 0.3 + i * 0.1 : 0 }}
                    className="text-sm leading-relaxed text-gray-800"
                  >
                    {paragraph}
                  </motion.p>
                ))}
              </div>
            )}

            {/* Legacy: lead + bullets */}
            {!payload.narrative && payload.lead && (
              <>
                <p className="text-sm font-medium leading-relaxed text-gray-800">
                  {payload.lead}
                </p>
                {payload.bullets && payload.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {payload.bullets.map((bullet, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: isLatest ? 0.4 + i * 0.1 : 0 }}
                        className="flex items-start gap-2 text-sm leading-relaxed text-gray-600"
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
              </>
            )}

            {/* Question block */}
            {payload.question && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isLatest ? 0.6 : 0 }}
                className="mt-3 rounded-lg border border-gray-200 bg-white/60 px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Question
                </p>
                <p className="mt-0.5 text-sm italic text-gray-700">
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
                className="mt-2 rounded-lg border border-gray-200 bg-white/60 px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Answering
                </p>
                <p className="mt-0.5 text-sm text-gray-700">
                  {payload.questionAnswered}
                </p>
              </motion.div>
            )}

            {/* Violations */}
            {turn.violations.length > 0 && (
              <div className="mt-2 space-y-1">
                {turn.violations.map((v, i) => (
                  <p key={i} className="text-xs text-red-500/70">
                    * {v}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
