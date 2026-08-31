"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type Section = { id: string; label: string };

export function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    // Track which section currently owns the reading line (upper third of
    // the viewport). IntersectionObserver, never scroll listeners.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sections" className="flex flex-col gap-3">
      {sections.map((section) => {
        const isActive = active === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={() => setActive(section.id)}
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
