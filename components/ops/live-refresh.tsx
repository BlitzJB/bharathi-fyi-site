"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps the engine room live: re-fetches the server component tree every
 * 30 seconds. The dot breathes so the page reads as an instrument, not a
 * printout.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-accent motion-safe:animate-pulse"
      />
      live · 30s
    </span>
  );
}
