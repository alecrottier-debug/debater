"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Drawer } from "vaul";
import { X, Search } from "lucide-react";
import type { Persona } from "@/lib/api";
import { useIsMobile } from "@/lib/use-media-query";

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
  const { avatarUrl, summary, style, tone, phrases, priorities } =
    usePersonaData(persona);

  const ring = selected
    ? accentColor === "blue"
      ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50/70"
      : "border-purple-400 ring-2 ring-purple-200 bg-purple-50/70"
    : "border-gray-200 bg-white hover:border-gray-300";

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className={`relative flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all sm:p-4 ${ring} ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer"
      }`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={persona.name}
          className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover sm:h-14 sm:w-14"
        />
      ) : (
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white sm:h-14 sm:w-14 ${
            accentColor === "blue"
              ? "bg-gradient-to-br from-blue-500 to-blue-700"
              : "bg-gradient-to-br from-purple-500 to-purple-700"
          }`}
        >
          {persona.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-gray-900 sm:text-base">
          {persona.name}
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs italic text-gray-500">
          {persona.tagline}
        </div>
        {summary && (
          <div className="mt-1 hidden line-clamp-2 text-[11px] leading-snug text-gray-400 sm:block">
            {summary}
          </div>
        )}
        {phrases && phrases.length > 0 && (
          <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
            {phrases.slice(0, 2).map((p, i) => (
              <span
                key={i}
                className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
              >
                &ldquo;{p.length > 35 ? p.slice(0, 35) + "…" : p}&rdquo;
              </span>
            ))}
          </div>
        )}
        {(style || tone) && !phrases?.length && (
          <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
            {style && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                {style.length > 40 ? style.slice(0, 40) + "…" : style}
              </span>
            )}
          </div>
        )}
        {priorities && priorities.length > 0 && (
          <div className="mt-1 hidden text-[10px] text-gray-400 sm:block">
            {priorities.slice(0, 2).join(" · ")}
          </div>
        )}
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
  const isMobile = useIsMobile();

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

  const totalCount = templates.length + custom.length;

  const triggerButton = (
    <button
      type="button"
      disabled={loading}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        accentColor === "blue"
          ? "focus-visible:ring-blue-500"
          : "focus-visible:ring-purple-500"
      } ${
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
            const identity = raw.identity as Record<string, unknown> | undefined;
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
          <span className="text-sm text-gray-400">Select {pickerLabel}...</span>
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
  );

  const titleText =
    pickerLabel === "guest"
      ? `Guest ${side === "A" ? "1" : "2"}`
      : side === "A"
      ? "For Side Debater"
      : "Against Side Debater";

  /** Inner body of the picker — identical for both sheet and dialog. */
  const body = (
    <>
      {/* Search */}
      <div className="border-b border-gray-100 px-4 py-3 sm:px-6">
        <div className="relative">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus={!isMobile /* on mobile autofocus pops the keyboard, worse UX */}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-base text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    </>
  );

  // Mobile: Vaul bottom sheet (drag handle, swipe-to-dismiss, uses full height).
  if (isMobile) {
    return (
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Trigger asChild>{triggerButton}</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-b-0 border-gray-200 bg-white shadow-2xl outline-none"
          >
            <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" />
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-4 py-3 ${
                accentColor === "blue"
                  ? "border-blue-100 bg-blue-50/50"
                  : "border-purple-100 bg-purple-50/50"
              }`}
            >
              <div>
                <Drawer.Title className="text-base font-bold text-gray-900">
                  Choose {titleText}
                </Drawer.Title>
                <p className="mt-0.5 text-xs text-gray-500">
                  {totalCount} personas available
                </p>
              </div>
              <Drawer.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <X aria-hidden className="h-5 w-5" />
                </button>
              </Drawer.Close>
            </div>
            {body}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: centered Radix Dialog.
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>{triggerButton}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-[fade-in_150ms] data-[state=closed]:animate-[fade-out_100ms]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-4rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl lg:w-[90vw] data-[state=open]:animate-[dialog-in_200ms] data-[state=closed]:animate-[dialog-out_150ms]"
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4 ${
              accentColor === "blue"
                ? "border-blue-100 bg-blue-50/50"
                : "border-purple-100 bg-purple-50/50"
            }`}
          >
            <div>
              <Dialog.Title className="text-lg font-bold text-gray-900">
                Choose {titleText}
              </Dialog.Title>
              <p className="mt-0.5 text-xs text-gray-500">
                {totalCount} personas available
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
