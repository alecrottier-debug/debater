"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchDebate,
  advanceDebate,
  QUICK_STAGES,
  type Debate,
  type Turn,
  type Speaker,
} from "@/lib/api";
import FighterCard, { ModJudgeCard } from "@/components/FighterCard";
import SpeechCard from "@/components/SpeechCard";
import TranscriptDrawer from "@/components/TranscriptDrawer";
import StageProgressTracker from "@/components/StageProgressTracker";
import MomentumMeter from "@/components/MomentumMeter";
import ResultsView from "@/components/ResultsView";

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

export default function DebatePage({ params }: DebatePageProps) {
  const { id } = use(params);
  const [debate, setDebate] = useState<Debate | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stages = QUICK_STAGES;

  const loadDebate = useCallback(async () => {
    try {
      const data = await fetchDebate(id);
      setDebate(data);
      setTurns(data.turns || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load debate");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDebate();
  }, [loadDebate]);

  async function handleNextStage() {
    if (advancing || !debate) return;
    setAdvancing(true);
    setError(null);

    try {
      const newTurn = await advanceDebate(id);
      setTurns((prev) => [...prev, newTurn]);
      setDebate((prev) =>
        prev
          ? {
              ...prev,
              stageIndex: prev.stageIndex + 1,
              status:
                prev.stageIndex + 1 >= stages.length ? "completed" : prev.status,
            }
          : prev
      );
      // Re-fetch full state to stay in sync
      const updated = await fetchDebate(id);
      setDebate(updated);
      setTurns(updated.turns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to advance stage");
    } finally {
      setAdvancing(false);
    }
  }

  const isCompleted = debate?.status === "completed";
  const currentStageIndex = debate?.stageIndex ?? 0;

  // Determine active speaker from stage plan
  const getActiveSpeaker = (): Speaker | null => {
    if (isCompleted || !advancing) {
      if (currentStageIndex < stages.length && !isCompleted) {
        return stages[currentStageIndex].speaker;
      }
      return null;
    }
    if (currentStageIndex < stages.length) {
      return stages[currentStageIndex].speaker;
    }
    return null;
  };

  const activeSpeaker = getActiveSpeaker();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-gray-500">Loading debate...</p>
        </motion.div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500">Debate not found</p>
          {error && <p className="mt-2 text-sm text-gray-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Motion Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Motion
        </p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
          &ldquo;{debate.motion}&rdquo;
        </h1>
      </motion.div>

      {/* Stage Progress Tracker */}
      <StageProgressTracker
        stages={stages}
        completedCount={turns.length}
        isCompleted={isCompleted}
      />

      {/* Momentum Meter */}
      <MomentumMeter
        turns={turns}
        stages={stages}
        personaAName={debate.personaA.name}
        personaBName={debate.personaB.name}
      />

      {/* MOD/JUDGE indicator (centered above arena) */}
      <AnimatePresence>
        {(activeSpeaker === "MOD" || activeSpeaker === "JUDGE") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center"
          >
            <ModJudgeCard role={activeSpeaker} isActive={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debate Arena Content */}
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Fighter Card A - Desktop */}
        <div className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24">
            <FighterCard
              persona={debate.personaA}
              side="A"
              isActive={activeSpeaker === "A"}
            />
          </div>
        </div>

        {/* Turns Display */}
        <div className="min-w-0 flex-1">
          <div className="space-y-4">
            <AnimatePresence>
              {turns.map((turn, idx) => (
                <SpeechCard
                  key={turn.id}
                  turn={turn}
                  stageLabel={stages[idx]?.label || turn.stageId}
                  speakerName={
                    turn.speaker === "A"
                      ? debate.personaA.name
                      : turn.speaker === "B"
                      ? debate.personaB.name
                      : turn.speaker
                  }
                  isLatest={idx === turns.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Loading indicator while advancing */}
            <AnimatePresence>
              {advancing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-8 shadow-sm"
                >
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  <span className="text-sm text-gray-500">
                    {currentStageIndex < stages.length
                      ? `Generating ${stages[currentStageIndex]?.label}...`
                      : "Generating..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Next Stage Button */}
          {!isCompleted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex justify-center"
            >
              <motion.button
                onClick={handleNextStage}
                disabled={advancing}
                whileHover={!advancing ? { scale: 1.02 } : {}}
                whileTap={!advancing ? { scale: 0.98 } : {}}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {advancing
                  ? "Generating..."
                  : turns.length === 0
                  ? "Begin Debate"
                  : `Next Stage (${turns.length + 1}/${stages.length})`}
              </motion.button>
            </motion.div>
          )}

          {/* Results View */}
          {isCompleted && <ResultsView debate={debate} />}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fighter Card B - Desktop */}
        <div className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24">
            <FighterCard
              persona={debate.personaB}
              side="B"
              isActive={activeSpeaker === "B"}
            />
          </div>
        </div>
      </div>

      {/* Mobile Fighter Cards */}
      <div className="flex gap-4 lg:hidden">
        <FighterCard
          persona={debate.personaA}
          side="A"
          isActive={activeSpeaker === "A"}
          compact
        />
        <FighterCard
          persona={debate.personaB}
          side="B"
          isActive={activeSpeaker === "B"}
          compact
        />
      </div>

      {/* Transcript Timeline Drawer */}
      <TranscriptDrawer
        turns={turns}
        stages={stages}
        personaAName={debate.personaA.name}
        personaBName={debate.personaB.name}
      />
    </div>
  );
}
