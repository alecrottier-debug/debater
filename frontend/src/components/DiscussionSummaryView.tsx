"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  rematchDebate,
  exportDebate,
  type Debate,
  type DiscussionWrapPayload,
  type Persona,
} from "@/lib/api";

function getAvatarUrl(persona: Persona): string | undefined {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  return (identity?.avatarUrl ?? raw.avatarUrl) as string | undefined;
}

interface DiscussionSummaryViewProps {
  debate: Debate;
}

export default function DiscussionSummaryView({
  debate,
}: DiscussionSummaryViewProps) {
  const router = useRouter();
  const [rematchLoading, setRematchLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const wrapTurn = debate.turns.find((t) => t.stageId === "MOD_WRAP");
  const wrapPayload = wrapTurn?.payload as DiscussionWrapPayload | undefined;

  async function handleRematch() {
    setRematchLoading(true);
    try {
      const newDebate = await rematchDebate(debate.id);
      router.push(`/debate/${newDebate.id}`);
    } catch (err) {
      console.error("Rematch failed:", err);
      setRematchLoading(false);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const markdown = await exportDebate(debate.id);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discussion-${debate.id.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleCopy() {
    try {
      const markdown = await exportDebate(debate.id);
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  }

  const modAvatar = debate.moderatorPersona
    ? getAvatarUrl(debate.moderatorPersona)
    : undefined;
  const avatarA = getAvatarUrl(debate.personaA);
  const avatarB = getAvatarUrl(debate.personaB);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3 py-2"
    >
      {/* Moderator's Narrative Summary */}
      {wrapPayload?.narrative && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-3">
            {modAvatar && (
              <img
                src={modAvatar}
                alt={debate.moderatorPersona?.name}
                className="h-12 w-12 rounded-full border-2 border-gray-200 object-cover shadow-sm"
              />
            )}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                Moderator&apos;s Summary
              </h3>
              {debate.moderatorPersona && (
                <p className="text-base font-bold text-gray-900">
                  {debate.moderatorPersona.name}
                </p>
              )}
            </div>
            {/* Guest avatars on the right */}
            <div className="ml-auto flex items-center -space-x-2">
              {avatarA && (
                <img
                  src={avatarA}
                  alt={debate.personaA.name}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover"
                />
              )}
              {avatarB && (
                <img
                  src={avatarB}
                  alt={debate.personaB.name}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover"
                />
              )}
            </div>
          </div>
          <p className="text-base leading-relaxed text-gray-700">
            {wrapPayload.narrative}
          </p>
        </motion.div>
      )}

      {/* Key Takeaways — narrative style */}
      {wrapPayload?.keyTakeaways && wrapPayload.keyTakeaways.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 px-6 py-5 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-blue-600">
            Key Takeaways
          </h3>
          <div className="space-y-3">
            {wrapPayload.keyTakeaways.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-start gap-3"
              >
                <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white shadow-sm">
                  {i + 1}
                </span>
                <p className="text-base leading-relaxed text-gray-800">
                  {item}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Agreement & Disagreement side by side */}
      <div className="grid gap-3 sm:grid-cols-2">
        {wrapPayload?.areasOfAgreement &&
          wrapPayload.areasOfAgreement.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 shadow-sm"
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Common Ground
              </h3>
              <div className="space-y-2">
                {wrapPayload.areasOfAgreement.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <p className="text-sm leading-relaxed text-gray-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        {wrapPayload?.areasOfDisagreement &&
          wrapPayload.areasOfDisagreement.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-5 py-4 shadow-sm"
            >
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-red-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Points of Tension
              </h3>
              <div className="space-y-2">
                {wrapPayload.areasOfDisagreement.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                    <p className="text-sm leading-relaxed text-gray-700">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
      </div>

      {/* Open Questions */}
      {wrapPayload?.openQuestions &&
        wrapPayload.openQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-purple-50/30 px-6 py-4 shadow-sm"
          >
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.15em] text-purple-600">
              Unresolved Questions
            </h3>
            <div className="space-y-2">
              {wrapPayload.openQuestions.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 + i * 0.08 }}
                  className="flex items-start gap-2.5"
                >
                  <span className="mt-0.5 text-lg font-bold leading-none text-purple-300">?</span>
                  <p className="text-sm italic leading-relaxed text-gray-700">
                    {item}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="flex items-center justify-center gap-3 border-t border-gray-200/60 pt-3"
      >
        <motion.button
          onClick={handleRematch}
          disabled={rematchLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rematchLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Starting...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              New Discussion
            </>
          )}
        </motion.button>

        <motion.button
          onClick={handleExport}
          disabled={exportLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportLoading ? "Exporting..." : "Export"}
        </motion.button>

        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
        >
          {copied ? (
            <span className="text-emerald-600">Copied!</span>
          ) : (
            "Copy"
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
