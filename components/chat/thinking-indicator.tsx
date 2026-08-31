// Ported from assistant-ui Elements "thinking-indicator" (r.assistant-ui.com,
// MIT), retinted to this site's palette.
"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { ShimmerLabel } from "./surfaces";

export function ThinkingIndicator({
  label,
  elapsed,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  label: string;
  elapsed?: string;
}) {
  return (
    <div
      data-slot="thinking-indicator"
      className={cn("flex items-center gap-2.5 text-sm", className)}
      {...props}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
      />
      <ShimmerLabel
        key={label}
        className="anim-rise-in relative inline-block leading-none"
      >
        {label}
      </ShimmerLabel>
      {elapsed !== undefined && (
        <span className="font-mono text-[11px] text-ink-faint/70 tabular-nums">
          {elapsed}
        </span>
      )}
    </div>
  );
}
