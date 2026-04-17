"use client";

import type { Turn, Speaker, TurnPayload } from "@/lib/api";

interface SpeechCardProps {
  turn: Turn;
  stageLabel: string;
  speakerName: string;
  avatarUrl?: string;
  isLatest: boolean;
}

type Tone = {
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  accentBorder: string;
  avatarRing: string;
  avatarFallback: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  rule: string;
  dropCap: string;
  quoteGlyph: string;
};

const toneMap: Record<Speaker, Tone> = {
  A: {
    cardBg: "bg-white",
    cardBorder: "border-blue-200",
    headerBg:
      "bg-gradient-to-r from-blue-50 via-blue-50/60 to-transparent",
    accentBorder: "border-l-blue-500",
    avatarRing: "ring-blue-300",
    avatarFallback: "bg-blue-100 text-blue-700",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    badgeLabel: "For",
    rule: "bg-blue-100",
    dropCap: "text-blue-600",
    quoteGlyph: "text-blue-300",
  },
  B: {
    cardBg: "bg-white",
    cardBorder: "border-purple-200",
    headerBg:
      "bg-gradient-to-r from-purple-50 via-purple-50/60 to-transparent",
    accentBorder: "border-l-purple-500",
    avatarRing: "ring-purple-300",
    avatarFallback: "bg-purple-100 text-purple-700",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    badgeLabel: "Against",
    rule: "bg-purple-100",
    dropCap: "text-purple-600",
    quoteGlyph: "text-purple-300",
  },
  MOD: {
    cardBg: "bg-white",
    cardBorder: "border-amber-200",
    headerBg:
      "bg-gradient-to-r from-amber-50 via-amber-50/60 to-transparent",
    accentBorder: "border-l-amber-500",
    avatarRing: "ring-amber-300",
    avatarFallback: "bg-amber-100 text-amber-800",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    badgeLabel: "Moderator",
    rule: "bg-amber-100",
    dropCap: "text-amber-700",
    quoteGlyph: "text-amber-300",
  },
  JUDGE: {
    cardBg: "bg-white",
    cardBorder: "border-emerald-200",
    headerBg:
      "bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-transparent",
    accentBorder: "border-l-emerald-500",
    avatarRing: "ring-emerald-300",
    avatarFallback: "bg-emerald-100 text-emerald-800",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    badgeLabel: "Judge",
    rule: "bg-emerald-100",
    dropCap: "text-emerald-700",
    quoteGlyph: "text-emerald-300",
  },
};

function firstWords(text: string, maxChars = 1000): { first: string; rest: string } {
  // Split off the first character so we can drop-cap it.
  const trimmed = text.trimStart();
  if (!trimmed) return { first: "", rest: "" };
  return { first: trimmed.slice(0, 1), rest: trimmed.slice(1, maxChars) };
}

export default function SpeechCard({
  turn,
  stageLabel,
  speakerName,
  avatarUrl,
  isLatest,
}: SpeechCardProps) {
  const tone = toneMap[turn.speaker];
  const payload = turn.payload as TurnPayload;

  const avatar = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={speakerName}
      className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${tone.avatarRing} shadow-sm sm:h-11 sm:w-11`}
    />
  ) : (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 sm:h-11 sm:w-11 ${tone.avatarRing} ${tone.avatarFallback}`}
    >
      {speakerName.charAt(0)}
    </div>
  );

  const narrative = payload.narrative ?? payload.lead ?? "";
  const hasDropCap = narrative.length > 40;
  const { first, rest } = firstWords(narrative);
  const paragraphs = narrative.split("\n\n");

  return (
    <article
      id={`stage-${turn.stageId}`}
      className={`enter-up group relative overflow-hidden rounded-2xl border-l-4 border-y border-r ${tone.cardBorder} ${tone.accentBorder} ${tone.cardBg} shadow-sm transition-shadow hover:shadow-md ${
        isLatest ? "ring-1 ring-black/5" : ""
      }`}
    >
      {/* Decorative corner ornament — subtle, picks up the tone color */}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-50 ${tone.headerBg}`}
      />

      {/* Header — avatar · byline · role badge */}
      <header
        className={`relative flex items-center gap-3 border-b ${tone.cardBorder} px-4 py-3 sm:px-5`}
      >
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="truncate text-[15px] font-bold leading-tight text-gray-900 sm:text-base">
              {speakerName}
            </h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-[var(--font-cinzel)] text-[9px] font-bold uppercase tracking-[0.12em] ${tone.badgeBg} ${tone.badgeText}`}
            >
              {tone.badgeLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.15em] text-gray-400">
            {stageLabel}
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="relative px-4 py-4 sm:px-6 sm:py-5">
        {/* Narrative prose */}
        {payload.narrative && (
          <div className="space-y-3 text-[15px] leading-[1.65] text-gray-800 sm:text-[16px]">
            {paragraphs.map((paragraph, i) => {
              if (i === 0 && hasDropCap) {
                const { first: f, rest: r } = firstWords(paragraph);
                return (
                  <p key={i} className="first-letter:font-[var(--font-playfair)]">
                    <span
                      className={`float-left mr-1.5 mt-[2px] font-[var(--font-playfair)] text-[48px] font-black leading-[0.85] sm:text-[56px] ${tone.dropCap}`}
                      aria-hidden
                    >
                      {f}
                    </span>
                    <span className="sr-only">{first}</span>
                    {r}
                  </p>
                );
              }
              return (
                <p key={i} className="text-gray-800">
                  {paragraph}
                </p>
              );
            })}
          </div>
        )}

        {/* Legacy: lead + bullets (no drop cap for these older turns) */}
        {!payload.narrative && payload.lead && (
          <>
            <p className="text-[15px] font-medium leading-[1.65] text-gray-800 sm:text-[16px]">
              {payload.lead}
            </p>
            {payload.bullets && payload.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {payload.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed text-gray-700"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        turn.speaker === "A"
                          ? "bg-blue-400"
                          : turn.speaker === "B"
                          ? "bg-purple-400"
                          : turn.speaker === "MOD"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Question block — elevated, with decorative open quote */}
        {payload.question && (
          <aside
            className={`relative mt-5 rounded-xl border ${tone.cardBorder} bg-gray-50/80 px-4 py-3 pl-8 sm:px-5 sm:pl-10`}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute left-2 top-0 select-none font-[var(--font-playfair)] text-[42px] leading-none ${tone.quoteGlyph} sm:left-3 sm:text-[56px]`}
            >
              &ldquo;
            </span>
            <p className="font-[var(--font-cinzel)] text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Question
            </p>
            <p className="mt-0.5 font-[var(--font-cormorant)] text-[17px] italic leading-snug text-gray-700 sm:text-[19px]">
              {payload.question}
            </p>
          </aside>
        )}

        {/* Question answered */}
        {payload.questionAnswered && (
          <aside className="mt-3 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-2.5">
            <p className="font-[var(--font-cinzel)] text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Answering
            </p>
            <p className="mt-0.5 text-sm text-gray-700">
              {payload.questionAnswered}
            </p>
          </aside>
        )}

        {/* Violations */}
        {turn.violations.length > 0 && (
          <div className="mt-3 space-y-1">
            {turn.violations.map((v, i) => (
              <p
                key={i}
                className="flex items-center gap-1.5 text-xs text-red-500/80"
              >
                <span aria-hidden>⚠</span>
                {v}
              </p>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
