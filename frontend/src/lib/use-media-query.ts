"use client";

import { useEffect, useState } from "react";

/**
 * Match a CSS media query client-side. Returns false on first render (SSR-safe),
 * then flips to the real value on mount. Subscribes to changes so viewport
 * rotation / DevTools resizing works too.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Tailwind's `md` breakpoint is 768px. Mobile = below that. */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}
