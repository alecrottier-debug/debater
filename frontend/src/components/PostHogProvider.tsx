"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

/**
 * Side-effect component that initializes PostHog on the client and captures
 * pageviews on App Router navigation. Mount once in the root layout.
 *
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY isn't set, so local development never
 * pollutes real analytics.
 */
export default function PostHogProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (typeof window === "undefined") return;
    if (posthog.__loaded) return;
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: false, // Manual below — Next App Router doesn't emit navigation events the SDK listens to.
      capture_pageleave: true,
      autocapture: true,
      persistence: "localStorage",
      person_profiles: "identified_only",
    });
  }, []);

  useEffect(() => {
    if (!posthog.__loaded) return;
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
