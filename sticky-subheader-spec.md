# Debate Page — Sticky Subheader Redesign

## Overview

Redesign the `/debate/[id]/page.tsx` layout so that the **debater profiles, pictures, status, momentum bar, and debate question/motion** are consolidated into a **sticky subheader** that pins below the main site header. The **debate content** (openings, rebuttals, closings, judge decision, scorecard) scrolls freely beneath it.

This eliminates the current 3-column layout (left sidebar + center + right sidebar) in favor of a single-column scrollable debate transcript with persistent context always visible.

## Reference: Working Prototype

A working CSS/JS prototype was injected into the running app at `localhost:3100/debate/896ae23f-...` and validated. The screenshots confirm sticky behavior, correct z-indexing, and clean layout. This spec documents exactly what to build in the real TSX.

---

## Current DOM Structure (observed from live app)

```
<header> — Site header with "Debater" logo + "History" button
<main class="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
  <div class="flex flex-col gap-6">

    {/* SECTION 1: Motion + Voice toggle */}
    <div class="text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Motion</p>
      <h1 class="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">"are european parliamentary systems better than american?"</h1>
      <button>Voice Off</button>
    </div>

    {/* SECTION 2: Progress bar + stage indicators */}
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Progress bar (h-2 gradient), stage count, "Complete" badge */}
      {/* 9 stage indicators: MOD SETUP, A OPEN, B OPEN, A CHALLENGE, B COUNTER, A COUNTER, B CLOSE, A CLOSE, JUDGE */}
      {/* Each stage has a colored circle icon + label */}
    </div>

    {/* SECTION 3: Momentum bar */}
    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3>Momentum</h3>
      {/* Gradient bar showing score split (e.g., 46.67% / 53.33%) */}
      {/* "Donald Trump (4.0)" on left, "Angela Merkel (3.5)" on right */}
      {/* "Side A leads" label */}
    </div>

    {/* SECTION 4: 3-column debate layout */}
    <div class="flex flex-col gap-4 lg:flex-row lg:gap-6">

      {/* LEFT SIDEBAR — Debater A card (sticky top-24) */}
      <div class="hidden w-52 shrink-0 lg:block">
        <div class="sticky top-24">
          <div class="rounded-xl border bg-white p-4 text-center border-blue-200 shadow-sm">
            <img class="h-24 w-24 object-contain" src="..." alt="Donald Trump">
            <h3 class="text-sm font-bold text-gray-900">Donald Trump</h3>
            <p class="mt-1 text-xs text-gray-500">The golden age of America begins right now.</p>
          </div>
        </div>
      </div>

      {/* CENTER — Debate content */}
      <div class="min-w-0 flex-1">
        <div class="space-y-4">
          {/* Debate cards: MOD Setup, Side A Opening, Side B Opening, etc. */}
          {/* Each card: colored border-l-4, header with speaker badge + stage label, body text, question block, word count */}
        </div>
        <div class="mt-8 space-y-6">
          {/* Winner announcement, Scorecard table, Ballot Reasons, Best Moments */}
          {/* Rematch / Export / Copy buttons */}
        </div>
      </div>

      {/* RIGHT SIDEBAR — Debater B card (sticky top-24) */}
      <div class="hidden w-52 shrink-0 lg:block">
        <div class="sticky top-24">
          <div class="rounded-xl border bg-white p-4 text-center border-purple-200 shadow-sm">
            <img class="h-24 w-24 object-contain" src="..." alt="Angela Merkel">
            <h3 class="text-sm font-bold text-gray-900">Angela Merkel</h3>
            <p class="mt-1 text-xs text-gray-500">We can do this. -- Wir schaffen das.</p>
          </div>
        </div>
      </div>
    </div>

    {/* SECTION 5: Mobile debater row (lg:hidden) */}
    <div class="flex gap-4 lg:hidden">
      {/* Simplified debater cards for mobile */}
    </div>

    {/* FAB button (fixed bottom-right) */}
    <button class="fixed bottom-6 right-6 z-40 ...">
  </div>
</main>
```

---

## Target Layout

```
<header> — Unchanged

{/* NEW: Sticky Subheader */}
<div class="sticky top-[header-height] z-30 ...">
  ┌─────────────────────────────────────────────────────────────────┐
  │  [Photo] Debater A    │    Motion Text      │   Debater B [Photo] │
  │         Name          │  ●●●●●●●●● ━━━━━━  │      Name           │
  │         Tagline        │  Momentum  ✓COMPLETE│      Tagline        │
  └─────────────────────────────────────────────────────────────────┘
  {/* Subtle gradient accent line at bottom */}
</div>

<main>
  {/* Single column, centered, max-w ~760px */}
  {/* All debate cards scroll freely */}
  {/* Winner, Scorecard, Ballot at bottom */}
</main>
```

---

## Exact Implementation Changes

### 1. Create a new `DebateSubheader` component

Extract into a component (or inline in the page) that receives:
- `debaterA`: { name, tagline, imageUrl, score }
- `debaterB`: { name, tagline, imageUrl, score }
- `motion`: string (the debate question)
- `stages`: array of { label, completed }
- `momentum`: { percentA, percentB, leader }
- `status`: "in_progress" | "complete"

#### JSX Structure:

```tsx
<div className="sticky top-[64px] z-30 border-b border-gray-200/60 bg-white/92 backdrop-blur-xl">
  {/* Gradient accent line at bottom */}
  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30" />

  <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-2.5">

    {/* ── Left: Debater A ── */}
    <div className="flex items-center gap-3 min-w-[160px]">
      <img
        src={debaterA.imageUrl}
        alt={debaterA.name}
        className="h-12 w-12 shrink-0 rounded-full border-2 border-blue-400 object-contain"
      />
      <div>
        <div className="text-[13px] font-bold text-gray-900 leading-tight">{debaterA.name}</div>
        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{debaterA.tagline}</div>
      </div>
    </div>

    {/* ── Center: Motion + Progress + Momentum ── */}
    <div className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
      {/* Motion text */}
      <div className="text-[13px] font-bold text-gray-900 text-center leading-tight line-clamp-2 max-w-[500px]">
        "{motion}"
      </div>

      {/* Progress dots + Momentum bar row */}
      <div className="flex items-center gap-4 w-full max-w-[500px]">
        {/* Mini progress dots */}
        <div className="flex items-center gap-1">
          {stages.map((stage, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                stage.completed
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                  : 'bg-gray-200'
              }`}
              title={stage.label}
            />
          ))}
        </div>

        {/* Mini momentum bar */}
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            style={{ width: `${momentum.percentA}%` }}
          />
        </div>

        {/* Momentum label */}
        <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
          {momentum.leader}
        </span>

        {/* Status badge */}
        {status === 'complete' && (
          <span className="text-[9px] font-bold text-emerald-500 tracking-wider uppercase whitespace-nowrap">
            ✓ Complete
          </span>
        )}
      </div>
    </div>

    {/* ── Right: Debater B ── */}
    <div className="flex items-center gap-3 min-w-[160px] flex-row-reverse text-right">
      <img
        src={debaterB.imageUrl}
        alt={debaterB.name}
        className="h-12 w-12 shrink-0 rounded-full border-2 border-purple-400 object-contain"
      />
      <div>
        <div className="text-[13px] font-bold text-gray-900 leading-tight">{debaterB.name}</div>
        <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{debaterB.tagline}</div>
      </div>
    </div>
  </div>
</div>
```

**Sticky positioning note:** The `top-[64px]` value should match the height of the site `<header>`. Inspect the header and adjust if needed. The header appears to be ~48-64px tall. Use `top-12` (48px) or `top-16` (64px) as appropriate, or measure with `document.querySelector('header').offsetHeight`.

### 2. Remove the old sections from the main content

The following sections should be **removed from the scrollable area** since their data now lives in the subheader:

- **Section 1** (Motion + Voice toggle) — motion text moves to subheader center. The Voice toggle button can either move to the subheader (as a small icon button) or remain as a floating control.
- **Section 2** (Progress bar + stages) — replaced by mini progress dots in subheader.
- **Section 3** (Momentum bar) — replaced by mini momentum bar in subheader.
- **Left sidebar** (`hidden w-52 shrink-0 lg:block` with Debater A card) — removed, data in subheader.
- **Right sidebar** (`hidden w-52 shrink-0 lg:block` with Debater B card) — removed, data in subheader.
- **Section 5** (Mobile debater row `lg:hidden`) — removed, subheader handles all viewports.

### 3. Restructure the main content area

The 3-column `flex flex-col gap-4 lg:flex-row lg:gap-6` layout becomes a **single centered column**:

```tsx
{/* BEFORE: 3-column layout */}
<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
  <div className="hidden w-52 shrink-0 lg:block">...</div>  {/* LEFT SIDEBAR — REMOVE */}
  <div className="min-w-0 flex-1">                            {/* CENTER — KEEP */}
    <div className="space-y-4">{/* debate cards */}</div>
    <div className="mt-8 space-y-6">{/* results */}</div>
  </div>
  <div className="hidden w-52 shrink-0 lg:block">...</div>  {/* RIGHT SIDEBAR — REMOVE */}
</div>

{/* AFTER: Single centered column */}
<div className="mx-auto max-w-3xl">
  <div className="space-y-4">{/* debate cards */}</div>
  <div className="mt-8 space-y-6">{/* results */}</div>
</div>
```

### 4. Adjust `<main>` padding

Since the subheader now sits between the header and main content:

```tsx
{/* Remove top padding from main — the subheader provides visual separation */}
<main className="relative z-10 mx-auto max-w-7xl px-4 pt-4 pb-6 sm:px-6 lg:px-8">
```

Reduce `py-6` to `pt-4 pb-6` (or similar) since the subheader already creates spacing at the top.

---

## Mobile Responsive Notes

The subheader should stack differently on small screens:

```tsx
{/* On mobile (sm and below), consider: */}
<div className="sticky top-[header-height] z-30 ...">
  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-5 px-4 sm:px-6 py-2 sm:py-2.5">

    {/* Mobile: debaters on same row, compact */}
    <div className="flex w-full items-center justify-between sm:hidden">
      <div className="flex items-center gap-2">
        <img className="h-8 w-8 rounded-full border-2 border-blue-400 object-contain" ... />
        <span className="text-xs font-bold">{debaterA.name}</span>
      </div>
      <span className="text-[10px] font-extrabold text-gray-300">VS</span>
      <div className="flex items-center gap-2 flex-row-reverse">
        <img className="h-8 w-8 rounded-full border-2 border-purple-400 object-contain" ... />
        <span className="text-xs font-bold">{debaterB.name}</span>
      </div>
    </div>

    {/* Mobile: motion + progress on second row */}
    <div className="text-center sm:hidden">
      <div className="text-[11px] font-bold text-gray-900 line-clamp-1">"{motion}"</div>
      <div className="flex items-center justify-center gap-2 mt-1">
        {/* mini dots + momentum */}
      </div>
    </div>

    {/* Desktop: full layout as described above (hidden on mobile) */}
    {/* ... the flex row layout from section 1 above, wrapped in "hidden sm:flex" */}
  </div>
</div>
```

---

## Data Flow

The subheader needs the same data the original sections used. In the existing page component, these values are likely already available from the debate data fetch:

- `debate.motion` → motion text
- `debate.debaterA` / `debate.debaterB` → name, image, tagline
- `debate.stages` → array with completion status
- `debate.momentum` → score split
- `debate.status` → "complete" or in-progress

Wire the subheader component using the same data source. No new API calls needed.

---

## Visual Design Details

- **Background:** `bg-white/92 backdrop-blur-xl` — frosted glass so the collage/decorative bg shows through subtly
- **Border:** Only bottom border, very subtle: `border-b border-gray-200/60`
- **Accent line:** 2px gradient line at the very bottom of the subheader: `from-blue-500 via-purple-500 to-pink-500` at 30% opacity
- **Debater photos:** 48×48px, circular, with colored border (blue for A, purple for B)
- **Progress dots:** 8×8px circles, completed = blue-to-purple gradient, incomplete = gray-200
- **Momentum bar:** 6px tall, same gradient as the main momentum bar but miniaturized
- **Typography:** Motion text 13px bold, debater names 13px bold, taglines 10px gray-400
- **Spacing:** The subheader should be compact — roughly 70-80px total height

---

## Files to Modify

1. **`src/app/debate/[id]/page.tsx`** — Main changes:
   - Add `DebateSubheader` component (inline or extracted)
   - Remove Sections 1, 2, 3 from the `flex flex-col gap-6` container
   - Remove left/right sidebar divs from the 3-column layout
   - Remove mobile debater row
   - Change center content wrapper to single centered column (`max-w-3xl mx-auto`)
   - Adjust main padding

2. **Optionally extract** `components/DebateSubheader.tsx` if the page file is already large.

3. **No new dependencies** required — this is pure Tailwind CSS positioning.

---

## Summary of What Moves Where

| Element | Before | After |
|---------|--------|-------|
| Motion text | Section 1 (scrolls away) | Subheader center (sticky) |
| Voice toggle | Section 1 | Keep as floating/FAB or add to subheader |
| Progress stages | Section 2 (full card) | Mini dots in subheader |
| Momentum bar | Section 3 (full card) | Mini bar in subheader |
| Debater A photo+name | Left sidebar (sticky within column) | Subheader left |
| Debater B photo+name | Right sidebar (sticky within column) | Subheader right |
| Debate cards | Center column | Full-width centered column (max-w-3xl) |
| Winner/Scorecard | Center column | Full-width centered column (max-w-3xl) |
| Mobile debater row | Separate section | Subheader handles all viewports |
