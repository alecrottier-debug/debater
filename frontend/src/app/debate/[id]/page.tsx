"use client";

import { useState, useEffect, useCallback, useMemo, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchDebate,
  streamAdvanceDebate,
  getStagesForMode,
  type Debate,
  type Turn,
  type Speaker,
  type StageConfig,
  type TurnPayload,
  type Persona,
} from "@/lib/api";
import { formatStageLabel } from "@/lib/format-stage-label";
import { ModJudgeCard } from "@/components/FighterCard";
import Spinner from "@/components/Spinner";
import SpeechCard from "@/components/SpeechCard";
import TranscriptDrawer from "@/components/TranscriptDrawer";
import ResultsView from "@/components/ResultsView";
import DiscussionSummaryView from "@/components/DiscussionSummaryView";
/* ─── Momentum helpers (inlined from MomentumMeter) ─── */

function computeMomentum(turns: Turn[], stages: StageConfig[]) {
  const score = { A: 0, B: 0 };
  turns.forEach((turn, idx) => {
    if (turn.speaker !== "A" && turn.speaker !== "B") return;
    const side = turn.speaker as "A" | "B";
    const cfg = stages[idx];
    if (!cfg) return;
    const payload = turn.payload as TurnPayload;
    if (cfg.maxWords && turn.wordCount / cfg.maxWords <= 0.85) score[side] += 1;
    if (payload.questionAnswered) score[side] += 1;
    if (turn.violations.length === 0) score[side] += 1;
    if (payload.bullets && payload.bullets.length > 0) score[side] += 0.5;
    if (cfg.questionRequired && payload.question) score[side] += 0.5;
  });
  return score;
}

function getAvatarUrl(persona: Persona): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

/* Subtle "breathing" idle animation for avatars. Reduced from a full talking
   sway because the always-on motion was competing with the live streaming
   card for the user's attention. */
const avatarTalkingSway = {
  opacity: 1,
  scale: [1, 1.012, 1],
  transition: {
    opacity: { duration: 0.4 },
    scale: { duration: 4.5, repeat: Infinity, ease: "easeInOut" as const },
  },
};

function getBioSummary(persona: Persona): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  const bio = identity?.biography as Record<string, unknown> | undefined;
  return bio?.summary as string | undefined;
}

/* ─── Sticky Subheader ─── */

function DebateSubheader({
  debate,
  turns,
  stages,
  isCompleted,
  isDiscussion,
}: {
  debate: Debate;
  turns: Turn[];
  stages: StageConfig[];
  isCompleted: boolean;
  isDiscussion: boolean;
}) {
  const score = useMemo(() => computeMomentum(turns, stages), [turns, stages]);
  const total = score.A + score.B;
  const aPercent = total === 0 ? 50 : (score.A / total) * 100;

  const leader =
    Math.abs(score.A - score.B) < 0.5
      ? "Tied"
      : score.A > score.B
      ? `${debate.personaA.name.split(" ")[0]} leads`
      : `${debate.personaB.name.split(" ")[0]} leads`;

  const avatarA = getAvatarUrl(debate.personaA);
  const avatarB = getAvatarUrl(debate.personaB);
  const bioA = getBioSummary(debate.personaA);
  const bioB = getBioSummary(debate.personaB);
  const modAvatar = debate.moderatorPersona
    ? getAvatarUrl(debate.moderatorPersona)
    : undefined;

  return (
    <div className="sticky top-16 z-30 border-b border-gray-300 bg-white/95 shadow-sm backdrop-blur-xl">
      {/* Gradient accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30" />

      {/* ── Desktop layout ── */}
      <div className="hidden items-stretch gap-6 sm:flex">
        {/* Left: Debater A */}
        <div className="flex min-w-[220px] max-w-[280px] items-center gap-3 py-2">
          {avatarA ? (
            <motion.img
              src={avatarA}
              alt={debate.personaA.name}
              className="h-full max-h-[88px] w-auto shrink-0 object-contain"
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={avatarTalkingSway}
            />
          ) : (
            <motion.div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            >
              A
            </motion.div>
          )}
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight text-gray-900">
              {debate.personaA.name}
            </div>
            <div className="mt-0.5 text-xs italic text-gray-500">
              {debate.personaA.tagline}
            </div>
            {bioA && (
              <div className="mt-1 text-[11px] leading-snug text-gray-400 line-clamp-2">
                {bioA}
              </div>
            )}
          </div>
        </div>

        {/* Center: Motion + Progress + Momentum */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 py-2">
          {/* Moderator badge */}
          {modAvatar && debate.moderatorPersona && (
            <div className="flex items-center gap-2">
              <img
                src={modAvatar}
                alt={debate.moderatorPersona.name}
                className="h-12 w-12 rounded-full border border-amber-200 object-cover"
              />
              <span className="text-[10px] font-semibold text-amber-600">
                {debate.moderatorPersona.name}
              </span>
              {debate.confrontationLevel && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700">
                  {debate.confrontationLevel}/5
                </span>
              )}
            </div>
          )}

          <div className="flex max-w-[500px] items-baseline justify-center gap-2">
            <span
              aria-label="AI simulated content"
              title="AI-generated. Not real statements by any person depicted."
              className="shrink-0 rounded-sm bg-amber-100 px-1.5 py-0.5 font-[var(--font-cinzel)] text-[9px] font-bold uppercase tracking-[0.15em] text-amber-700"
            >
              Sim
            </span>
            <div className="text-center font-[var(--font-playfair)] text-[17px] font-extrabold leading-snug tracking-tight text-gray-900 line-clamp-2">
              &ldquo;{debate.motion}&rdquo;
            </div>
          </div>

          <div className="flex w-full max-w-[500px] items-center gap-3">
            {/* Mini progress dots */}
            <div className="flex items-center gap-1">
              {stages.map((stage, i) => (
                <div
                  key={stage.id}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < turns.length
                      ? "bg-gradient-to-br from-blue-500 to-purple-500"
                      : "bg-gray-200"
                  }`}
                  title={formatStageLabel(stage.label, debate.personaA.name, debate.personaB.name)}
                />
              ))}
            </div>

            {/* Mini momentum bar — hidden for discussions */}
            {!isDiscussion && (
              <>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${aPercent}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-gray-400">
                  {leader}
                </span>
              </>
            )}

            {/* Status badge */}
            {isCompleted && (
              <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                ✓ Complete
              </span>
            )}

          </div>
        </div>

        {/* Right: Debater B */}
        <div className="flex min-w-[220px] max-w-[280px] flex-row-reverse items-center gap-3 py-2 text-right">
          {avatarB ? (
            <motion.img
              src={avatarB}
              alt={debate.personaB.name}
              className="h-full max-h-[88px] w-auto shrink-0 object-contain"
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={avatarTalkingSway}
            />
          ) : (
            <motion.div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-lg font-bold text-white"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            >
              B
            </motion.div>
          )}
          <div className="min-w-0">
            <div className="text-base font-bold leading-tight text-gray-900">
              {debate.personaB.name}
            </div>
            <div className="mt-0.5 text-xs italic text-gray-500">
              {debate.personaB.tagline}
            </div>
            {bioB && (
              <div className="mt-1 text-[11px] leading-snug text-gray-400 line-clamp-2">
                {bioB}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex flex-col gap-2 px-4 py-2.5 sm:hidden">
        {/* Debaters row */}
        <div className="flex w-full items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {avatarA ? (
              <motion.img
                src={avatarA}
                alt={debate.personaA.name}
                className="h-11 w-11 shrink-0 object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={avatarTalkingSway}
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                A
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-gray-900">
                {debate.personaA.name}
              </span>
              <div className="truncate text-[10px] italic text-gray-400">
                {debate.personaA.tagline}
              </div>
            </div>
          </div>
          <span className="mt-3 shrink-0 text-xs font-extrabold text-gray-300">
            {isDiscussion ? "&" : "VS"}
          </span>
          <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right">
            {avatarB ? (
              <motion.img
                src={avatarB}
                alt={debate.personaB.name}
                className="h-11 w-11 shrink-0 object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={avatarTalkingSway}
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
                B
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-gray-900">
                {debate.personaB.name}
              </span>
              <div className="truncate text-[10px] italic text-gray-400">
                {debate.personaB.tagline}
              </div>
            </div>
          </div>
        </div>

        {/* Motion + progress row */}
        <div className="text-center">
          <div className="font-[var(--font-playfair)] text-[15px] font-extrabold tracking-tight text-gray-900 line-clamp-1">
            &ldquo;{debate.motion}&rdquo;
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <div className="flex items-center gap-0.5">
              {stages.map((stage, i) => (
                <div
                  key={stage.id}
                  className={`h-2 w-2 rounded-full ${
                    i < turns.length
                      ? "bg-gradient-to-br from-blue-500 to-purple-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            {!isDiscussion && (
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${aPercent}%` }}
                />
              </div>
            )}
            {isCompleted && (
              <span className="text-[9px] font-bold uppercase text-emerald-500">
                ✓ Done
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Streaming "ghost" turn card ───
   Renders the in-flight narrative text while SSE deltas arrive. Visual
   language mirrors SpeechCard so the swap-in on completion feels seamless. */

interface StreamingTurnCardProps {
  speaker: Speaker | null;
  speakerName: string;
  stageLabel: string;
  text: string;
  avatarUrl?: string;
}

const ghostTones: Record<Speaker, { bg: string; border: string; ring: string; text: string }> = {
  A: { bg: "bg-blue-50/80", border: "border-blue-200", ring: "ring-blue-300", text: "text-blue-900" },
  B: { bg: "bg-purple-50/80", border: "border-purple-200", ring: "ring-purple-300", text: "text-purple-900" },
  MOD: { bg: "bg-amber-50/80", border: "border-amber-200", ring: "ring-amber-300", text: "text-amber-900" },
  JUDGE: { bg: "bg-emerald-50/80", border: "border-emerald-200", ring: "ring-emerald-300", text: "text-emerald-900" },
};

function StreamingTurnCard({
  speaker,
  speakerName,
  stageLabel,
  text,
  avatarUrl,
}: StreamingTurnCardProps) {
  const tone = (speaker && ghostTones[speaker]) || ghostTones.MOD;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative rounded-2xl border ${tone.border} ${tone.bg} p-4 shadow-sm sm:p-5`}
    >
      <div className="mb-3 flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={speakerName}
            className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${tone.ring}`}
          />
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold ring-2 ${tone.ring} ${tone.text}`}
          >
            {speakerName ? speakerName.charAt(0) : "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-bold ${tone.text}`}>{speakerName || "Generating…"}</div>
          <div className="truncate text-[11px] uppercase tracking-wider text-gray-500">{stageLabel}</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          live
        </span>
      </div>
      <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${tone.text}`}>
        {text}
        <span className="ml-0.5 inline-block h-4 w-[2px] -translate-y-[1px] animate-pulse bg-current align-middle" />
      </p>
    </motion.div>
  );
}

/* ─── Main Page ─── */

interface DebatePageProps {
  params: Promise<{ id: string }>;
}

export default function DebatePage({ params }: DebatePageProps) {
  const { id } = use(params);
  const [debate, setDebate] = useState<Debate | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [streamingNarrative, setStreamingNarrative] = useState<string>("");
  const [streamingSpeaker, setStreamingSpeaker] = useState<Speaker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);
  const closeStreamRef = useRef<(() => void) | null>(null);

  const stages = useMemo(
    () => (debate ? getStagesForMode(debate.mode) : []),
    [debate?.mode],
  );
  const isDiscussion = debate?.mode === "discussion";
  const pageAvatarA = debate ? getAvatarUrl(debate.personaA) : undefined;
  const pageAvatarB = debate ? getAvatarUrl(debate.personaB) : undefined;

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

  // Auto-scroll to bottom when new turns arrive
  useEffect(() => {
    if (turns.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [turns.length]);

  // Auto-start: skip the "Begin Debate" step and immediately generate the moderator setup
  useEffect(() => {
    if (debate && !loading && turns.length === 0 && !advancing && !autoStarted.current && debate.status !== "completed") {
      autoStarted.current = true;
      handleNextStage();
    }
  }, [debate, loading, turns.length]);

  function handleNextStage() {
    if (advancing || !debate) return;
    setAdvancing(true);
    setError(null);
    setStreamingNarrative("");
    setStreamingSpeaker(null);

    // Coalesce narrative deltas through requestAnimationFrame so we never
    // run more than one React render per frame even if the model fires
    // 30+ tokens in 16ms. Reduces layout thrash and saves battery on mobile.
    let pendingText: string | null = null;
    let rafId: number | null = null;
    const flush = () => {
      if (pendingText !== null) {
        setStreamingNarrative(pendingText);
        pendingText = null;
      }
      rafId = null;
    };

    closeStreamRef.current?.();
    closeStreamRef.current = streamAdvanceDebate(id, {
      onStage: ({ speaker }) => {
        setStreamingSpeaker(speaker as Speaker);
      },
      onNarrative: (text) => {
        pendingText = text;
        if (rafId === null) rafId = requestAnimationFrame(flush);
      },
      onDone: (updated) => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        setDebate(updated);
        setTurns(updated.turns || []);
        setStreamingNarrative("");
        setStreamingSpeaker(null);
        setAdvancing(false);
        closeStreamRef.current = null;
      },
      onError: (message) => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        setError(message || "Failed to advance stage");
        setStreamingNarrative("");
        setStreamingSpeaker(null);
        setAdvancing(false);
        closeStreamRef.current = null;
      },
    });
  }

  // Cancel any in-flight stream when leaving the page
  useEffect(() => {
    return () => {
      closeStreamRef.current?.();
    };
  }, []);

  const isCompleted = debate?.status === "completed";
  const currentStageIndex = debate?.stageIndex ?? 0;

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
          <Spinner size="lg" />
          <p className="text-gray-500">Loading {isDiscussion ? "discussion" : "debate"}...</p>
        </motion.div>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500">Not found</p>
          {error && <p className="mt-2 text-sm text-gray-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sticky Subheader */}
      <DebateSubheader
        debate={debate}
        turns={turns}
        stages={stages}
        isCompleted={!!isCompleted}
        isDiscussion={!!isDiscussion}
      />

      {/* Main content */}
      {isCompleted ? (
        <div>
          {isDiscussion ? (
            <DiscussionSummaryView debate={debate} />
          ) : (
            <ResultsView debate={debate} />
          )}

          <TranscriptDrawer
            turns={turns}
            stages={stages}
            personaAName={debate.personaA.name}
            personaBName={debate.personaB.name}
          />
        </div>
      ) : (
        <div className="pt-4">
          {/* MOD/JUDGE indicator */}
          <AnimatePresence>
            {(activeSpeaker === "MOD" || activeSpeaker === "JUDGE") && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex justify-center"
              >
                <ModJudgeCard role={activeSpeaker} isActive={true} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Turns */}
          <div className="space-y-4">
            <AnimatePresence>
              {turns.map((turn, idx) => (
                <SpeechCard
                  key={turn.id}
                  turn={turn}
                  stageLabel={formatStageLabel(stages[idx]?.label || turn.stageId, debate.personaA.name, debate.personaB.name)}
                  speakerName={
                    turn.speaker === "A"
                      ? debate.personaA.name
                      : turn.speaker === "B"
                      ? debate.personaB.name
                      : turn.speaker === "MOD" && debate.moderatorPersona
                      ? debate.moderatorPersona.name
                      : turn.speaker
                  }
                  avatarUrl={
                    turn.speaker === "A"
                      ? pageAvatarA
                      : turn.speaker === "B"
                      ? pageAvatarB
                      : undefined
                  }
                  isLatest={idx === turns.length - 1}
                />
              ))}
            </AnimatePresence>

            {/* Live streaming card: shows the narrative as it arrives. While the
                stream is open but no text has landed yet, a spinner stands in. */}
            <AnimatePresence>
              {advancing && streamingNarrative && (
                <StreamingTurnCard
                  key="streaming-card"
                  speaker={streamingSpeaker}
                  speakerName={
                    streamingSpeaker === "A"
                      ? debate.personaA.name
                      : streamingSpeaker === "B"
                      ? debate.personaB.name
                      : streamingSpeaker === "MOD" && debate.moderatorPersona
                      ? debate.moderatorPersona.name
                      : streamingSpeaker ?? ""
                  }
                  stageLabel={formatStageLabel(
                    stages[currentStageIndex]?.label || "",
                    debate.personaA.name,
                    debate.personaB.name,
                  )}
                  text={streamingNarrative}
                  avatarUrl={
                    streamingSpeaker === "A"
                      ? pageAvatarA
                      : streamingSpeaker === "B"
                      ? pageAvatarB
                      : undefined
                  }
                />
              )}
              {advancing && !streamingNarrative && (
                <motion.div
                  key="generating-indicator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 rounded shimmer" />
                      <div className="h-2 w-20 rounded shimmer" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded shimmer" />
                    <div className="h-3 w-[92%] rounded shimmer" />
                    <div className="h-3 w-[78%] rounded shimmer" />
                  </div>
                  <span className="sr-only">
                    {currentStageIndex < stages.length
                      ? `Generating ${formatStageLabel(stages[currentStageIndex]?.label || "", debate.personaA.name, debate.personaB.name)}`
                      : "Generating"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scroll anchor */}
          <div ref={bottomRef} />

          {/* Spacer so content doesn't hide behind sticky button */}
          <div className="h-20 sm:h-24" />

          {/* Sticky Next Stage Button */}
          <div
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            className="sticky bottom-0 z-20 bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb] to-[#f8f9fb]/80 pt-8"
          >
            <div className="flex flex-col items-center gap-2">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                onClick={handleNextStage}
                disabled={advancing}
                whileHover={!advancing ? { scale: 1.02 } : {}}
                whileTap={!advancing ? { scale: 0.98 } : {}}
                className="min-h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:px-8"
              >
                {advancing
                  ? "Generating..."
                  : turns.length === 0
                  ? isDiscussion
                    ? "Begin Discussion"
                    : "Begin Debate"
                  : `Next Stage (${turns.length + 1}/${stages.length})`}
              </motion.button>
            </div>
          </div>

          {/* Transcript Timeline Drawer */}
          <TranscriptDrawer
            turns={turns}
            stages={stages}
            personaAName={debate.personaA.name}
            personaBName={debate.personaB.name}
          />
        </div>
      )}
    </>
  );
}
