"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Section = { id: string; label: string };

export function SectionNav({ sections }: { sections: Section[] }) {
  const [bandActive, setBandActive] = useState(sections[0]?.id);
  const [endPinned, setEndPinned] = useState(false);

  useEffect(() => {
    // Track which section currently owns the reading line (upper third of
    // the viewport). IntersectionObserver, never scroll listeners.
    const band = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setBandActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) band.observe(el);
    }

    // A short final section near the page end never reaches the reading
    // band, so when it is essentially fully in view, pin it active.
    const lastEl = document.getElementById(sections[sections.length - 1]?.id ?? "");
    const end = new IntersectionObserver(
      ([entry]) => setEndPinned(entry.intersectionRatio >= 0.95),
      { threshold: [0.95] },
    );
    if (lastEl) end.observe(lastEl);

    return () => {
      band.disconnect();
      end.disconnect();
    };
  }, [sections]);

  const active = endPinned ? sections[sections.length - 1]?.id : bandActive;

  return (
    <nav aria-label="Sections" className="flex flex-col gap-3">
      {sections.map((section) => {
        const isActive = active === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => setBandActive(section.id)}
            className="group flex items-center gap-2.5 font-mono text-[11px]"
          >
            <span
              aria-hidden
              className={cn(
                "h-px transition-[width,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                isActive
                  ? "w-6 bg-accent"
                  : "w-3 bg-line-strong group-hover:w-5 group-hover:bg-ink-faint",
              )}
            />
            <span
              className={cn(
                "transition-colors duration-200",
                isActive
                  ? "text-ink"
                  : "text-ink-faint group-hover:text-ink-soft",
              )}
            >
              {section.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
