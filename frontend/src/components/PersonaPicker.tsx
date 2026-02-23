"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/api";

interface PersonaPickerProps {
  personas: Persona[];
  selected: Persona | undefined;
  onSelect: (persona: Persona) => void;
  side: "A" | "B";
  disabledId?: string;
  loading?: boolean;
  pickerLabel?: string;
}

/** Extract persona display data from v1 or v2 schema */
function usePersonaData(persona: Persona) {
  const raw = persona.personaJson as Record<string, unknown>;
  const identity = raw.identity as Record<string, unknown> | undefined;
  const rhetoric = raw.rhetoric as Record<string, unknown> | undefined;
  const positions = raw.positions as Record<string, unknown> | undefined;
  const biography = identity?.biography as Record<string, unknown> | undefined;

  const avatarUrl = (identity?.avatarUrl ?? raw.avatarUrl) as
    | string
    | undefined;
  const summary = (biography?.summary ?? raw.background) as string | undefined;
  const style = (rhetoric?.style ?? raw.style) as string | undefined;
  const tone = (rhetoric?.tone ?? raw.tone) as string | undefined;

  // Pull a few signature phrases for flavor
  const phrases = (rhetoric?.signaturePhrases ?? raw.signaturePhrases) as
    | string[]
    | undefined;

  // Pull priorities or known stances for context
  const priorities = (positions?.priorities ?? raw.priorities) as
    | string[]
    | undefined;

  return { avatarUrl, summary, style, tone, phrases, priorities };
}

function PersonaCard({
  persona,
  selected,
  disabled,
  accentColor,
  onClick,
  index,
}: {
  persona: Persona;
  selected: boolean;
  disabled: boolean;
  accentColor: string;
  onClick: () => void;
  index: number;
}) {
  const { avatarUrl, summary, tone, phrases } = usePersonaData(persona);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.03, 0.4),
        type: "spring",
        stiffness: 500,
        damping: 35,
      }}
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      className={`group relative w-full overflow-hidden rounded-xl border text-left transition-all ${
        selected
          ? accentColor === "blue"
            ? "border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/30"
            : "border-purple-500 bg-purple-50/80 ring-2 ring-purple-500/30"
          : disabled
            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
      }`}
    >
      <div className="flex gap-3.5 p-3.5">
        {/* Avatar — large and clear */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={persona.name}
            className="h-20 w-20 shrink-0 rounded-xl border border-gray-200/80 bg-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-2xl font-bold text-gray-300">
            {persona.name.charAt(0)}
          </div>
        )}

        {/* Text content */}
        <div className="min-w-0 flex-1">
          {/* Name + selected badge */}
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-gray-900 leading-tight">
              {persona.name}
            </span>
            {selected && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
                  accentColor === "blue" ? "bg-blue-500" : "bg-purple-500"
                }`}
              >
                Selected
              </span>
            )}
          </div>

          {/* Tagline */}
          <p className="mt-0.5 text-[13px] italic leading-snug text-gray-500 line-clamp-2">
            {persona.tagline}
          </p>

          {/* Summary */}
          {summary && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-400 line-clamp-3">
              {summary}
            </p>
          )}

          {/* Signature phrases as small pills */}
          {phrases && phrases.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {phrases.slice(0, 3).map((phrase) => (
                <span
                  key={phrase}
                  className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 leading-tight"
                >
                  &ldquo;{phrase.length > 30 ? phrase.slice(0, 30) + "…" : phrase}&rdquo;
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default function PersonaPicker({
  personas,
  selected,
  onSelect,
  side,
  disabledId,
  loading,
  pickerLabel = "debater",
}: PersonaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const accentColor = side === "A" ? "blue" : "purple";

  const { templates, custom } = useMemo(() => {
    const lower = search.toLowerCase();
    const filtered = personas.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.tagline.toLowerCase().includes(lower),
    );
    return {
      templates: filtered.filter((p) => p.isTemplate),
      custom: filtered.filter((p) => !p.isTemplate),
    };
  }, [personas, search]);

  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !loading && setIsOpen(true)}
        disabled={loading}
        className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
          selected
            ? accentColor === "blue"
              ? "border-blue-300 bg-blue-50"
              : "border-purple-300 bg-purple-50"
            : "border-gray-200 bg-white hover:border-gray-300"
        } ${loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        {loading ? (
          <span className="text-sm text-gray-400">Loading...</span>
        ) : selected ? (
          <div className="flex items-center gap-3">
            {(() => {
              const raw = selected.personaJson as Record<string, unknown>;
              const identity = raw.identity as
                | Record<string, unknown>
                | undefined;
              const avatarUrl = (identity?.avatarUrl ?? raw.avatarUrl) as
                | string
                | undefined;
              return avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={selected.name}
                  className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover"
                />
              ) : null;
            })()}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">
                {selected.name}
              </div>
              <div className="text-xs italic text-gray-500 line-clamp-1">
                {selected.tagline}
              </div>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
              />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Select {pickerLabel}...
            </span>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
              />
            </svg>
          </div>
        )}
      </button>

      {/* Modal — portaled to document.body to escape parent overflow/transform */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
                />

                {/* Panel */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                  className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-6xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col overflow-hidden sm:w-[calc(100vw-4rem)] lg:w-[90vw]"
                >
                  {/* Header */}
                  <div
                    className={`flex items-center justify-between border-b px-6 py-4 ${
                      accentColor === "blue"
                        ? "border-blue-100 bg-blue-50/50"
                        : "border-purple-100 bg-purple-50/50"
                    }`}
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Choose{" "}
                        {pickerLabel === "guest"
                          ? `Guest ${side === "A" ? "1" : "2"}`
                          : `Side ${side} Debater`}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {templates.length + custom.length} personas available
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search by name or topic..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {/* Templates section */}
                    {templates.length > 0 && (
                      <div className="mb-6">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Curated Personas
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            {templates.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {templates.map((p, i) => (
                            <PersonaCard
                              key={p.id}
                              persona={p}
                              selected={selected?.id === p.id}
                              disabled={p.id === disabledId}
                              accentColor={accentColor}
                              index={i}
                              onClick={() => {
                                onSelect(p);
                                setIsOpen(false);
                                setSearch("");
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom section */}
                    {(custom.length > 0 || templates.length > 0) && (
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Custom Personas
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            {custom.length}
                          </span>
                        </div>
                        {custom.length > 0 ? (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {custom.map((p, i) => (
                              <PersonaCard
                                key={p.id}
                                persona={p}
                                selected={selected?.id === p.id}
                                disabled={p.id === disabledId}
                                accentColor={accentColor}
                                index={templates.length + i}
                                onClick={() => {
                                  onSelect(p);
                                  setIsOpen(false);
                                  setSearch("");
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-center">
                            <p className="text-sm text-gray-400">
                              No custom personas yet
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {templates.length === 0 && custom.length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-sm text-gray-400">
                          No personas match &ldquo;{search}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
