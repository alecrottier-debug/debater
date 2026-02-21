"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPersonas, createDebate, type Persona } from "@/lib/api";

export default function SetupPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [motionText, setMotionText] = useState("");
  const [personaAId, setPersonaAId] = useState("");
  const [personaBId, setPersonaBId] = useState("");
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

  const isValid =
    motionText.trim().length > 0 &&
    personaAId !== "" &&
    personaBId !== "" &&
    personaAId !== personaBId;

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
        mode,
        personaAId,
        personaBId,
      });
      router.push(`/debate/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create debate");
      setSubmitting(false);
    }
  }

  const selectedA = personas.find((p) => p.id === personaAId);
  const selectedB = personas.find((p) => p.id === personaBId);

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
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl"
          >
            Set Up Your{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Debate
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-lg text-slate-400"
          >
            Choose a motion, pick your debaters, and let the arguments fly.
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/5 bg-[#111827] p-6 shadow-2xl shadow-blue-500/5 sm:p-8"
        >
          {/* Motion Input */}
          <div className="mb-6">
            <label
              htmlFor="motion"
              className="mb-2 block text-sm font-semibold uppercase tracking-wider text-slate-300"
            >
              Motion
            </label>
            <textarea
              id="motion"
              rows={3}
              placeholder='e.g. "This house believes that AI will create more jobs than it destroys"'
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Persona Pickers */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="personaA"
                className="mb-2 block text-sm font-semibold uppercase tracking-wider text-blue-400"
              >
                Side A
              </label>
              <select
                id="personaA"
                value={personaAId}
                onChange={(e) => setPersonaAId(e.target.value)}
                disabled={loading}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" className="bg-gray-900">
                  {loading ? "Loading..." : "Select debater..."}
                </option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-900">
                    {p.name}
                  </option>
                ))}
              </select>
              <AnimatePresence>
                {selectedA && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-sm italic text-slate-400"
                  >
                    {selectedA.tagline}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label
                htmlFor="personaB"
                className="mb-2 block text-sm font-semibold uppercase tracking-wider text-purple-400"
              >
                Side B
              </label>
              <select
                id="personaB"
                value={personaBId}
                onChange={(e) => setPersonaBId(e.target.value)}
                disabled={loading}
                className="w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" className="bg-gray-900">
                  {loading ? "Loading..." : "Select debater..."}
                </option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id} className="bg-gray-900">
                    {p.name}
                  </option>
                ))}
              </select>
              <AnimatePresence>
                {selectedB && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 text-sm italic text-slate-400"
                  >
                    {selectedB.tagline}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Create New Persona */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/personas/create"
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm text-slate-400 transition-all hover:border-blue-500/40 hover:text-blue-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create New Persona
            </Link>
          </div>

          {/* Validation Message */}
          <AnimatePresence>
            {validationMessage && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-4 text-sm text-red-400"
              >
                {validationMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Mode Selector */}
          <div className="mb-8">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-slate-300">
              Mode
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  mode === "quick"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="text-base font-semibold">Quick</div>
                <div className="mt-0.5 text-xs opacity-70">9 stages, ~5 min</div>
              </button>
              <button
                type="button"
                disabled
                className="flex-1 cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-600"
              >
                <div className="text-base font-semibold">Pro</div>
                <div className="mt-0.5 text-xs opacity-70">Coming soon</div>
              </button>
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
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
                Creating Debate...
              </span>
            ) : (
              "Start Debate"
            )}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
}
