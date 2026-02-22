"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPersonas, createDebate, type Persona } from "@/lib/api";
import PersonaPicker from "@/components/PersonaPicker";
import PersonaPreview from "@/components/PersonaPreview";

const SUGGESTED_DEBATE_MOTIONS = [
  "AI will replace more jobs than it creates within 10 years",
  "Social media has done more harm than good to democracy",
  "Billionaires should be banned from owning media companies",
  "Universal basic income is inevitable and necessary",
  "The US should break up Big Tech monopolies",
  "Voting should be mandatory in all democracies",
  "Nuclear energy is the only realistic path to net zero",
  "Remote work is destroying company culture and innovation",
  "The electoral college should be abolished",
  "Cryptocurrency is a net negative for society",
  "College degrees are no longer worth the cost",
  "Autonomous weapons should be banned under international law",
  "China will overtake the US as the leading superpower by 2040",
  "A global carbon tax is the only way to stop climate change",
  "Free speech should have no limits on the internet",
  "Smartphones should be banned for children under 16",
  "The death penalty should be abolished worldwide",
  "Genetic engineering of human embryos should be legal",
  "All drugs should be decriminalized",
  "Colonizing Mars is a waste of money while Earth has unsolved problems",
];

const SUGGESTED_DISCUSSION_TOPICS = [
  "What does the rise of AI mean for human creativity and purpose?",
  "Is the American Dream still alive, or has inequality killed it?",
  "How should we balance national security with individual privacy?",
  "What went wrong with social media, and can it be fixed?",
  "Should tech founders have as much political power as they do?",
  "Is capitalism compatible with solving climate change?",
  "What does the future of work look like in an AI-first world?",
  "Are we in a new Cold War with China?",
  "Has the pursuit of safety culture gone too far?",
  "What role should government play in regulating AI?",
  "How do we rebuild trust in media, government, and science?",
  "Is space colonization a real priority or a billionaire vanity project?",
  "If you could have dinner with anyone in history, what would you argue about?",
  "Are humans fundamentally good or fundamentally selfish?",
  "What will people 100 years from now think we got completely wrong?",
  "Is it possible to be truly objective, or is everything we believe shaped by bias?",
  "Would you upload your consciousness to live forever?",
  "What's the most overrated virtue and the most underrated vice?",
  "If aliens arrived tomorrow, how would it change religion, politics, and culture?",
  "Is it better to be feared or loved — and does the answer change with power?",
];

const CONFRONTATION_LABELS = [
  { level: 1, label: "Supportive", color: "text-blue-500" },
  { level: 2, label: "Curious", color: "text-cyan-500" },
  { level: 3, label: "Balanced", color: "text-gray-600" },
  { level: 4, label: "Pressing", color: "text-orange-500" },
  { level: 5, label: "Relentless", color: "text-red-500" },
];

function getAvatarUrl(persona: Persona): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

export default function SetupPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState<"debate" | "discussion">("debate");
  const [motionText, setMotionText] = useState("");
  const [personaAId, setPersonaAId] = useState("");
  const [personaBId, setPersonaBId] = useState("");
  const [moderatorPersonaId, setModeratorPersonaId] = useState("");
  const [confrontationLevel, setConfrontationLevel] = useState(3);
  const [mode, setMode] = useState("quick");

  useEffect(() => {
    fetchPersonas()
      .then((data) => {
        setPersonas(data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load personas. Is the backend running?");
        setLoading(false);
        console.error(err);
      });
  }, []);

  const debaterPersonas = useMemo(
    () => personas.filter((p) => p.role !== "moderator"),
    [personas],
  );
  const moderatorPersonas = useMemo(
    () => personas.filter((p) => p.role === "moderator"),
    [personas],
  );

  const isDiscussion = format === "discussion";
  const effectiveMode = isDiscussion ? "discussion" : mode;

  const isValid =
    motionText.trim().length > 0 &&
    personaAId !== "" &&
    personaBId !== "" &&
    personaAId !== personaBId &&
    (!isDiscussion || moderatorPersonaId !== "");

  const validationMessage = (() => {
    if (motionText.trim().length === 0) return null;
    if (personaAId && personaBId && personaAId === personaBId) {
      return "Personas must be different";
    }
    return null;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const debate = await createDebate({
        motion: motionText.trim(),
        mode: effectiveMode,
        personaAId,
        personaBId,
        moderatorPersonaId: moderatorPersonaId || undefined,
        confrontationLevel,
      });
      router.push(`/debate/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setSubmitting(false);
    }
  }

  const selectedA = debaterPersonas.find((p) => p.id === personaAId);
  const selectedB = debaterPersonas.find((p) => p.id === personaBId);
  const selectedMod = moderatorPersonas.find((p) => p.id === moderatorPersonaId);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
          >
            Set Up Your{" "}
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              {isDiscussion ? "Discussion" : "Debate"}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-lg text-gray-500"
          >
            {isDiscussion
              ? "Choose a topic, pick your guests and moderator, and let the conversation unfold."
              : "Choose a motion, pick your debaters, and let the arguments fly."}
          </motion.p>

        </div>

        {/* Form Card */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: [0, -6, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: 0.3 },
            y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 },
          }}
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-purple-200/60 bg-white/85 p-6 shadow-2xl shadow-purple-500/15 ring-1 ring-purple-100/40 backdrop-blur-xl sm:p-8"
        >
          {/* Format Toggle */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-500">
              Format
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat("debate")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  format === "debate"
                    ? "border-blue-400 bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                    : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                }`}
              >
                <div className="text-base font-semibold">Debate</div>
                <div className="mt-0.5 text-xs opacity-70">
                  FOR vs AGAINST with a judge
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormat("discussion")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  format === "discussion"
                    ? "border-purple-400 bg-purple-50 text-purple-600 ring-1 ring-purple-200"
                    : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                }`}
              >
                <div className="text-base font-semibold">Discussion</div>
                <div className="mt-0.5 text-xs opacity-70">
                  Moderated conversation for insight
                </div>
              </button>
            </div>
          </div>

          {/* Motion/Topic Input */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="motion"
                className="block text-sm font-semibold uppercase tracking-wider text-gray-500"
              >
                {isDiscussion ? "Topic" : "Motion"}
              </label>
              <div className="relative">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setMotionText(e.target.value);
                  }}
                  className="cursor-pointer appearance-none rounded-lg border border-dashed border-gray-300 bg-transparent py-1 pl-2.5 pr-7 text-xs font-medium text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">Suggestions...</option>
                  {(isDiscussion ? SUGGESTED_DISCUSSION_TOPICS : SUGGESTED_DEBATE_MOTIONS).map((s, i) => (
                    <option key={i} value={s}>
                      {s.length > 70 ? s.slice(0, 67) + "..." : s}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
            <textarea
              id="motion"
              rows={3}
              placeholder={
                isDiscussion
                  ? 'e.g. "The future of AI regulation and innovation"'
                  : 'e.g. "This house believes that AI will create more jobs than it destroys"'
              }
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Persona Pickers */}
          <div className="mb-6 grid gap-6 sm:grid-cols-2">
            {/* Side A / Guest 1 */}
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-blue-500">
                {isDiscussion ? "Guest 1" : "Side A"}
              </label>
              <PersonaPicker
                personas={debaterPersonas}
                selected={selectedA}
                onSelect={(p) => setPersonaAId(p.id)}
                side="A"
                disabledId={personaBId}
                loading={loading}
                pickerLabel={isDiscussion ? "guest" : "debater"}
              />
              <AnimatePresence>
                {selectedA && <PersonaPreview persona={selectedA} side="A" />}
              </AnimatePresence>
            </div>

            {/* Side B / Guest 2 */}
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-purple-500">
                {isDiscussion ? "Guest 2" : "Side B"}
              </label>
              <PersonaPicker
                personas={debaterPersonas}
                selected={selectedB}
                onSelect={(p) => setPersonaBId(p.id)}
                side="B"
                disabledId={personaAId}
                loading={loading}
                pickerLabel={isDiscussion ? "guest" : "debater"}
              />
              <AnimatePresence>
                {selectedB && <PersonaPreview persona={selectedB} side="B" />}
              </AnimatePresence>
            </div>
          </div>

          {/* Moderator Picker — discussion only */}
          {isDiscussion && moderatorPersonas.length > 0 && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-amber-600">
                Moderator
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!selectedMod) {
                    const el = document.getElementById("mod-picker");
                    if (el) el.classList.toggle("hidden");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!selectedMod) {
                      const el = document.getElementById("mod-picker");
                      if (el) el.classList.toggle("hidden");
                    }
                  }
                }}
                className={`w-full cursor-pointer rounded-xl border px-4 py-3 text-left transition-all ${
                  selectedMod
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {selectedMod ? (
                  <div className="flex items-center gap-3">
                    {getAvatarUrl(selectedMod) && (
                      <img
                        src={getAvatarUrl(selectedMod)}
                        alt={selectedMod.name}
                        className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {selectedMod.name}
                      </div>
                      <div className="text-xs italic text-gray-500 line-clamp-1">
                        {selectedMod.tagline}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModeratorPersonaId("");
                      }}
                      className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Select moderator...
                    </span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Inline moderator grid */}
              <div
                id="mod-picker"
                className={`mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3 ${
                  selectedMod ? "hidden" : ""
                }`}
              >
                {moderatorPersonas.map((mod) => {
                  const avatar = getAvatarUrl(mod);
                  const profile = (mod.personaJson as Record<string, unknown>)
                    .confrontationProfile as Record<string, unknown> | undefined;
                  const baseline = (profile?.baselineLevel as number) ?? 3;

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setModeratorPersonaId(mod.id);
                        document.getElementById("mod-picker")?.classList.add("hidden");
                      }}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all hover:border-amber-300 hover:bg-amber-50 ${
                        moderatorPersonaId === mod.id
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      {avatar && (
                        <img
                          src={avatar}
                          alt={mod.name}
                          className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 line-clamp-1">
                          {mod.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="text-[10px] text-gray-400 line-clamp-1">
                            {mod.tagline}
                          </div>
                          <span
                            className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                              baseline <= 2
                                ? "bg-blue-100 text-blue-600"
                                : baseline <= 3
                                ? "bg-gray-100 text-gray-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {baseline}/5
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confrontation Level Slider — discussion only, when moderator selected */}
          {isDiscussion && selectedMod && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-500">
                Confrontation Level
              </label>
              <div className="px-1">
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={confrontationLevel}
                  onChange={(e) =>
                    setConfrontationLevel(Number(e.target.value))
                  }
                  className="w-full cursor-pointer accent-purple-500"
                />
                <div className="mt-1 flex justify-between">
                  {CONFRONTATION_LABELS.map((c) => (
                    <span
                      key={c.level}
                      className={`text-[10px] font-medium transition-all ${
                        confrontationLevel === c.level
                          ? `${c.color} font-bold scale-110`
                          : "text-gray-300"
                      }`}
                    >
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Validation Message */}
          <AnimatePresence>
            {validationMessage && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-4 text-sm text-red-500"
              >
                {validationMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Mode Selector (hidden for discussions) */}
          {!isDiscussion && (
            <div className="mb-8">
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-500">
                Mode
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("quick")}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    mode === "quick"
                      ? "border-blue-400 bg-blue-50 text-blue-600 ring-1 ring-blue-200"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <div className="text-base font-semibold">Quick</div>
                  <div className="mt-0.5 text-xs opacity-70">
                    9 stages, ~5 min
                  </div>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex-1 cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-300"
                >
                  <div className="text-base font-semibold">Pro</div>
                  <div className="mt-0.5 text-xs opacity-70">Coming soon</div>
                </button>
              </div>
            </div>
          )}

          {/* Spacer when mode selector hidden */}
          {isDiscussion && <div className="mb-8" />}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={!isValid || submitting}
            whileHover={isValid && !submitting ? { scale: 1.01 } : {}}
            whileTap={isValid && !submitting ? { scale: 0.99 } : {}}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isDiscussion ? "Creating Discussion..." : "Creating Debate..."}
              </span>
            ) : isDiscussion ? (
              "Start Discussion"
            ) : (
              "Start Debate"
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
