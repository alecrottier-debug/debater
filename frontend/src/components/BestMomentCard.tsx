"use client";

import { motion } from "framer-motion";

interface BestMomentCardProps {
  quote: string;
  speakerName: string;
  side: "A" | "B";
  index: number;
}

const sideStyles = {
  A: {
    borderGradient: "from-blue-400 via-cyan-300 to-blue-500",
    bgGradient: "from-blue-50 via-sky-50/50 to-transparent",
    textColor: "text-blue-700",
    labelColor: "text-blue-600",
    quoteColor: "text-blue-200",
    glowColor: "shadow-blue-100",
    dotColor: "bg-blue-500",
  },
  B: {
    borderGradient: "from-purple-400 via-pink-300 to-purple-500",
    bgGradient: "from-purple-50 via-fuchsia-50/50 to-transparent",
    textColor: "text-purple-700",
    labelColor: "text-purple-600",
    quoteColor: "text-purple-200",
    glowColor: "shadow-purple-100",
    dotColor: "bg-purple-500",
  },
};

export default function BestMomentCard({
  quote,
  speakerName,
  side,
  index,
}: BestMomentCardProps) {
  const styles = sideStyles[side];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 2.5 + index * 0.2,
        duration: 0.5,
        type: "spring",
        stiffness: 200,
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group relative"
    >
      {/* Gradient border effect */}
      <div
        className={`absolute -inset-[1px] rounded-2xl bg-gradient-to-br ${styles.borderGradient} opacity-50 transition-opacity group-hover:opacity-80`}
      />

      {/* Card body */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${styles.bgGradient} border border-gray-200 p-6 shadow-lg ${styles.glowColor}`}
      >
        {/* Background quote mark */}
        <div
          className={`absolute -right-4 -top-4 select-none font-serif text-[120px] font-bold leading-none ${styles.quoteColor}`}
        >
          &ldquo;
        </div>

        {/* Collectible badge */}
        <div className="mb-4 flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full ${styles.dotColor}`}
          >
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${styles.labelColor}`}
          >
            Best Moment
          </span>
        </div>

        {/* Quote */}
        <p
          className={`relative text-base font-medium italic leading-relaxed ${styles.textColor}`}
        >
          &ldquo;{quote}&rdquo;
        </p>

        {/* Attribution */}
        <div className="mt-4 flex items-center gap-2 border-t border-gray-200 pt-3">
          <div
            className={`h-1 w-6 rounded-full ${styles.dotColor} opacity-50`}
          />
          <span className="text-xs font-semibold text-gray-500">
            {speakerName}
          </span>
          <span className="text-xs text-gray-400">
            Side {side}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
