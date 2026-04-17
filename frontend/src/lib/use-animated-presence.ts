"use client";

import { useEffect, useState } from "react";

/**
 * Replacement for framer-motion's AnimatePresence. Keeps an element mounted
 * briefly after `isPresent` flips to false so a CSS exit animation can play,
 * then unmounts.
 *
 * Returns `[shouldRender, isExiting]`:
 *   - shouldRender: whether the JSX should be rendered at all
 *   - isExiting: true once `isPresent` flipped to false, false while active
 *
 * Apply an enter class based on shouldRender && !isExiting, and an exit class
 * based on isExiting. Match the `exitDurationMs` to the CSS animation length.
 */
export function useAnimatedPresence(
  isPresent: boolean,
  exitDurationMs = 180,
): [boolean, boolean] {
  const [shouldRender, setShouldRender] = useState(isPresent);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isPresent) {
      setShouldRender(true);
      setIsExiting(false);
      return;
    }
    // Flipped to absent — play exit then unmount.
    if (shouldRender) {
      setIsExiting(true);
      const t = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, exitDurationMs);
      return () => clearTimeout(t);
    }
  }, [isPresent, exitDurationMs, shouldRender]);

  return [shouldRender, isExiting];
}
