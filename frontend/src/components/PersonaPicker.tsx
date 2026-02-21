"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/api";

interface PersonaPickerProps {
  personas: Persona[];
  selected: Persona | undefined;
  onSelect: (persona: Persona) => void;
  side: "A" | "B";
  disabledId?: string;
  loading?: boolean;
}

function PersonaCard({
  persona,
  selected,
  disabled,
  accentColor,
  onClick,
}: {
  persona: Persona;
  selected: boolean;
  disabled: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const json = persona.personaJson as {
    style?: string;
    priorities?: string[];
    tone?: string;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? accentColor === "blue"
            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
            : "border-purple-500 bg-purple-50 ring-2 ring-purple-500/20"
          : disabled
            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-40"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
      }`}
    >
      {selected && (
        <span
          className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
            accentColor === "blue" ? "bg-blue-500" : "bg-purple-500"
          }`}
        >
          Selected
        </span>
      )}

      <div className="mb-1.5 text-sm font-semibold text-gray-900">
        {persona.name}
      </div>
      <div className="text-xs italic text-gray-500 line-clamp-2">
        {persona.tagline}
      </div>

      {/* Expanded details on hover */}
      <div className="mt-2 hidden space-y-1.5 group-hover:block">
        {json.style && (
          <div className="text-xs text-gray-600">
            <span className={`font-semibold ${accentColor === "blue" ? "text-blue-600" : "text-purple-600"}`}>
              Style:
            </span>{" "}
            {json.style.length > 80 ? json.style.slice(0, 80) + "..." : json.style}
          </div>
        )}
        {json.priorities && json.priorities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {json.priorities.slice(0, 3).map((p, i) => (
              <span
                key={i}
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  accentColor === "blue"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {p.length > 25 ? p.slice(0, 25) + "..." : p}
              </span>
            ))}
          </div>
        )}
      </div>

      {persona.isTemplate && (
        <span className="mt-2 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
          Template
        </span>
      )}
    </button>
  );
}

export default function PersonaPicker({
  personas,
  selected,
  onSelect,
  side,
  disabledId,
  loading,
}: PersonaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

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
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {selected.name}
              </div>
              <div className="text-xs italic text-gray-500 line-clamp-1">
                {selected.tagline}
              </div>
            </div>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Select debater...</span>
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        )}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:w-full"
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between border-b px-5 py-4 ${
                  accentColor === "blue" ? "border-blue-100 bg-blue-50/50" : "border-purple-100 bg-purple-50/50"
                }`}
              >
                <h3 className="text-base font-bold text-gray-900">
                  Choose Side {side} Debater
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="border-b border-gray-100 px-5 py-3">
                <input
                  type="text"
                  placeholder="Search personas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* List */}
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
                {/* Templates section */}
                {templates.length > 0 && (
                  <div className="mb-5">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Curated Templates
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        {templates.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {templates.map((p) => (
                        <PersonaCard
                          key={p.id}
                          persona={p}
                          selected={selected?.id === p.id}
                          disabled={p.id === disabledId}
                          accentColor={accentColor}
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
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {custom.map((p) => (
                        <PersonaCard
                          key={p.id}
                          persona={p}
                          selected={selected?.id === p.id}
                          disabled={p.id === disabledId}
                          accentColor={accentColor}
                          onClick={() => {
                            onSelect(p);
                            setIsOpen(false);
                            setSearch("");
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">
                        No custom personas yet
                      </p>
                    </div>
                  )}
                </div>

                {templates.length === 0 && custom.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">
                      No personas match &ldquo;{search}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
