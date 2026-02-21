"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Persona, Speaker } from "@/lib/api";

interface FighterCardProps {
  persona: Persona;
  side: "A" | "B";
  isActive: boolean;
  compact?: boolean;
}

const sideConfig = {
  A: {
    gradient: "from-blue-500 to-blue-700",
    border: "border-blue-500/20",
    borderActive: "border-blue-500/60",
    glow: "shadow-blue-500/30",
    glowActive: "shadow-blue-500/50",
    text: "text-blue-400",
    bg: "bg-blue-500/5",
    ring: "ring-blue-500/40",
  },
  B: {
    gradient: "from-purple-500 to-purple-700",
    border: "border-purple-500/20",
    borderActive: "border-purple-500/60",
    glow: "shadow-purple-500/30",
    glowActive: "shadow-purple-500/50",
    text: "text-purple-400",
    bg: "bg-purple-500/5",
    ring: "ring-purple-500/40",
  },
};

export default function FighterCard({
  persona,
  side,
  isActive,
  compact = false,
}: FighterCardProps) {
  const cfg = sideConfig[side];

  if (compact) {
    return (
      <motion.div
        animate={
          isActive
            ? { scale: 1.02, borderColor: "rgba(96,165,250,0.6)" }
            : { scale: 1, borderColor: "rgba(96,165,250,0.2)" }
        }
        className={`flex-1 rounded-xl border bg-[#111827] p-3 text-center transition-shadow ${
          isActive
            ? `${cfg.borderActive} shadow-lg ${cfg.glowActive}`
            : cfg.border
        }`}
      >
        <div
          className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-sm font-bold text-white`}
        >
          {side}
        </div>
        <h3 className="text-xs font-bold text-white">{persona.name}</h3>
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-1 text-[10px] font-medium ${cfg.text}`}
            >
              Speaking
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      animate={
        isActive
          ? { scale: 1.03 }
          : { scale: 1 }
      }
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`rounded-xl border bg-[#111827] p-4 text-center transition-all duration-300 ${
        isActive
          ? `${cfg.borderActive} shadow-xl ${cfg.glowActive} ring-1 ${cfg.ring}`
          : `${cfg.border} shadow-md shadow-black/20`
      }`}
    >
      {/* Avatar */}
      <div className="relative mx-auto mb-3">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-2xl font-bold text-white`}
        >
          {side}
        </div>
        {/* Active glow ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute inset-0 rounded-full ring-2 ${cfg.ring}`}
            >
              <motion.div
                className={`absolute inset-0 rounded-full ring-2 ${cfg.ring}`}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Name */}
      <h3 className="text-sm font-bold text-white">{persona.name}</h3>
      <p className="mt-1 text-xs leading-snug text-slate-400">
        {persona.tagline}
      </p>

      {/* Active indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`mt-3 rounded-full ${cfg.bg} px-3 py-1 text-xs font-semibold ${cfg.text}`}
          >
            Speaking
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface ModJudgeCardProps {
  role: "MOD" | "JUDGE";
  isActive: boolean;
}

export function ModJudgeCard({ role, isActive }: ModJudgeCardProps) {
  const cfg =
    role === "MOD"
      ? {
          gradient: "from-amber-500 to-orange-600",
          border: "border-amber-500/20",
          borderActive: "border-amber-500/60",
          glow: "shadow-amber-500/30",
          text: "text-amber-400",
          bg: "bg-amber-500/5",
          ring: "ring-amber-500/40",
          label: "Moderator",
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          ),
        }
      : {
          gradient: "from-emerald-500 to-teal-600",
          border: "border-emerald-500/20",
          borderActive: "border-emerald-500/60",
          glow: "shadow-emerald-500/30",
          text: "text-emerald-400",
          bg: "bg-emerald-500/5",
          ring: "ring-emerald-500/40",
          label: "Judge",
          icon: (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
            </svg>
          ),
        };

  return (
    <motion.div
      animate={isActive ? { scale: 1.03 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`mx-auto max-w-[160px] rounded-xl border bg-[#111827] p-3 text-center transition-all duration-300 ${
        isActive
          ? `${cfg.borderActive} shadow-xl ${cfg.glow} ring-1 ${cfg.ring}`
          : `${cfg.border}`
      }`}
    >
      <div
        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${cfg.gradient} text-white`}
      >
        {cfg.icon}
      </div>
      <h3 className="mt-2 text-xs font-bold text-white">{cfg.label}</h3>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            className={`mt-1 text-[10px] font-semibold ${cfg.text}`}
          >
            Active
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
