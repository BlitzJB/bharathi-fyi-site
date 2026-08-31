// Ported from assistant-ui Elements "inline-citation" (r.assistant-ui.com,
// MIT). Their version positions the preview with @base-ui/react; this port
// keeps the exact marker and card styling but positions the card with CSS
// (hover / focus-within), so it carries no dependency.
"use client";

import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface Source {
  domain: string;
  title: string;
  snippet: string;
}

export function Citation({
  index,
  source,
}: {
  index: number;
  source: Source;
}) {
  return (
    <span className="group/cite relative inline-block">
      <button
        type="button"
        aria-label={`Source ${index + 1}: ${source.title}`}
        className={cn(
          "mx-0.5 inline-flex h-4 min-w-4 translate-y-[-2px] cursor-default items-center justify-center rounded-[5px] px-1 align-middle font-mono text-[10px] font-medium tabular-nums transition-colors",
          "bg-ink/[0.06] text-ink-faint group-hover/cite:bg-ink group-hover/cite:text-paper group-focus-within/cite:bg-ink group-focus-within/cite:text-paper",
        )}
      >
        {index + 1}
      </button>
      <span
        role="tooltip"
        className={cn(
          paper,
          "invisible absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 scale-[0.97] rounded-2xl p-3.5 opacity-0 shadow-[0_8px_28px_rgba(20,20,15,0.10)]",
          "transition-[opacity,scale,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          "group-hover/cite:visible group-hover/cite:scale-100 group-hover/cite:opacity-100",
          "group-focus-within/cite:visible group-focus-within/cite:scale-100 group-focus-within/cite:opacity-100",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded bg-ink/[0.06] text-[9px] font-medium text-ink-faint">
            {source.domain[0]?.toUpperCase()}
          </span>
          <span className={cn(mono, "text-ink-faint")}>{source.domain}</span>
        </span>
        <span className="mt-2 block text-[13px] leading-snug font-medium text-ink">
          {source.title}
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
          {source.snippet}
        </span>
      </span>
    </span>
  );
}
