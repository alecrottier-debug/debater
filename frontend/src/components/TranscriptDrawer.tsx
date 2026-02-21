"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Turn, Speaker, StageConfig } from "@/lib/api";

interface TranscriptDrawerProps {
  turns: Turn[];
  stages: StageConfig[];
  personaAName: string;
  personaBName: string;
}

const speakerColor: Record<Speaker, string> = {
  MOD: "text-amber-400",
  A: "text-blue-400",
  B: "text-purple-400",
  JUDGE: "text-emerald-400",
};

const speakerDot: Record<Speaker, string> = {
  MOD: "bg-amber-400",
  A: "bg-blue-400",
  B: "bg-purple-400",
  JUDGE: "bg-emerald-400",
};

export default function TranscriptDrawer({
  turns,
  stages,
  personaAName,
  personaBName,
}: TranscriptDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  function scrollToStage(stageId: string) {
    const element = document.getElementById(`stage-${stageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Brief highlight
      element.classList.add("ring-2", "ring-blue-500/50");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-blue-500/50");
      }, 2000);
    }
    // Close drawer on mobile
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }

  function getSpeakerLabel(speaker: Speaker): string {
    switch (speaker) {
      case "A":
        return personaAName;
      case "B":
        return personaBName;
      default:
        return speaker;
    }
  }

  if (turns.length === 0) return null;

  return (
    <>
      {/* Toggle Button - fixed position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-105 lg:bottom-auto lg:right-auto lg:left-4 lg:top-24 lg:h-10 lg:w-10"
      >
        <svg
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      {/* Backdrop (mobile) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Desktop: Side drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-16 z-50 hidden h-[calc(100vh-4rem)] w-72 border-r border-white/5 bg-[#0d1117]/95 backdrop-blur-xl lg:block"
            >
              <DrawerContent
                turns={turns}
                stages={stages}
                getSpeakerLabel={getSpeakerLabel}
                scrollToStage={scrollToStage}
                onClose={() => setIsOpen(false)}
              />
            </motion.div>

            {/* Mobile: Bottom sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] rounded-t-2xl border-t border-white/10 bg-[#0d1117]/95 backdrop-blur-xl lg:hidden"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <DrawerContent
                turns={turns}
                stages={stages}
                getSpeakerLabel={getSpeakerLabel}
                scrollToStage={scrollToStage}
                onClose={() => setIsOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface DrawerContentProps {
  turns: Turn[];
  stages: StageConfig[];
  getSpeakerLabel: (speaker: Speaker) => string;
  scrollToStage: (stageId: string) => void;
  onClose: () => void;
}

function DrawerContent({
  turns,
  stages,
  getSpeakerLabel,
  scrollToStage,
  onClose,
}: DrawerContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h3 className="text-sm font-bold text-white">Transcript Timeline</h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stage List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 h-[calc(100%-1rem)] w-0.5 bg-gradient-to-b from-blue-500/30 via-purple-500/30 to-emerald-500/30" />

          <div className="space-y-1">
            {stages.map((stage, idx) => {
              const turn = turns[idx];
              const isComplete = idx < turns.length;

              return (
                <motion.button
                  key={stage.id}
                  onClick={() => isComplete && scrollToStage(stage.id)}
                  disabled={!isComplete}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                    isComplete
                      ? "cursor-pointer hover:bg-white/5"
                      : "cursor-default opacity-40"
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full ${
                      isComplete
                        ? `flex items-center justify-center ${speakerDot[stage.speaker]} shadow-sm`
                        : "border-2 border-slate-700 bg-[#0d1117]"
                    }`}
                  >
                    {isComplete && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>

                  {/* Stage info */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${isComplete ? "text-white" : "text-slate-600"}`}>
                      S{idx + 1}: {stage.label}
                    </p>
                    {isComplete && turn && (
                      <p className={`mt-0.5 text-[10px] font-medium ${speakerColor[stage.speaker]}`}>
                        {getSpeakerLabel(stage.speaker)} - {turn.wordCount}w
                      </p>
                    )}
                    {isComplete && turn && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
                        {(turn.payload as { lead?: string })?.lead || turn.renderedText.slice(0, 60)}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-3">
        <p className="text-center text-[10px] text-slate-600">
          {turns.length} of {stages.length} stages completed
        </p>
      </div>
    </div>
  );
}
