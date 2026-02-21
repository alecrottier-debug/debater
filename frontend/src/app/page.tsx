"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPersonas, createDebate, type Persona } from "@/lib/api";
import PersonaPicker from "@/components/PersonaPicker";
import PersonaPreview from "@/components/PersonaPreview";

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
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
          >
            Set Up Your{" "}
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Debate
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-lg text-gray-500"
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
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50 sm:p-8"
        >
          {/* Motion Input */}
          <div className="mb-6">
            <label
              htmlFor="motion"
              className="mb-2 block text-sm font-semibold uppercase tracking-wider text-gray-500"
            >
              Motion
            </label>
            <textarea
              id="motion"
              rows={3}
              placeholder='e.g. "This house believes that AI will create more jobs than it destroys"'
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Persona Pickers */}
          <div className="mb-6 grid gap-6 sm:grid-cols-2">
            {/* Side A */}
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-blue-500">
                Side A
              </label>
              <PersonaPicker
                personas={personas}
                selected={selectedA}
                onSelect={(p) => setPersonaAId(p.id)}
                side="A"
                disabledId={personaBId}
                loading={loading}
              />
              <AnimatePresence>
                {selectedA && <PersonaPreview persona={selectedA} side="A" />}
              </AnimatePresence>
            </div>

            {/* Side B */}
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-wider text-purple-500">
                Side B
              </label>
              <PersonaPicker
                personas={personas}
                selected={selectedB}
                onSelect={(p) => setPersonaBId(p.id)}
                side="B"
                disabledId={personaAId}
                loading={loading}
              />
              <AnimatePresence>
                {selectedB && <PersonaPreview persona={selectedB} side="B" />}
              </AnimatePresence>
            </div>
          </div>

          {/* Create New Persona */}
          <div className="mb-6 flex justify-center">
            <Link
              href="/personas/create"
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 transition-all hover:border-blue-400 hover:text-blue-500"
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
                className="mb-4 text-sm text-red-500"
              >
                {validationMessage}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Mode Selector */}
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
                <div className="mt-0.5 text-xs opacity-70">9 stages, ~5 min</div>
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
