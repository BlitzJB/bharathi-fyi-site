// Ported from assistant-ui Elements "streaming-text" (r.assistant-ui.com,
// MIT), adapted for live streams: instead of a controlled visibleWords
// counter, every word of the accumulated text is shown, so newly arrived
// words mount with the fade and the trailing pair carries the accent tint.
"use client";

import { useMemo, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The stream carries raw markdown and citation markers; showing those
 * characters word-by-word looks broken, so the streaming view flattens them.
 * The settled message swaps to the full markdown + citation renderer.
 */
function flatten(text: string): string {
  return (
    text
      // complete citation markers, then any partial one still arriving
      .replace(/\[cite:[^\]]*\]/g, "")
      .replace(/\[cite:[^\]]*$/g, "")
      // markdown links: keep the label
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // emphasis and code markers
      .replace(/[*_`#]/g, "")
  );
}

export function StreamingText({
  text,
  streaming,
  className,
  ...props
}: Omit<ComponentProps<"p">, "children"> & {
  text: string;
  streaming: boolean;
}) {
  const words = useMemo(
    () => flatten(text).split(/\s+/).filter(Boolean),
    [text],
  );

  return (
    <p
      data-slot="streaming-text"
      className={cn("text-sm leading-relaxed text-pretty", className)}
      {...props}
    >
      {words.map((word, i) => {
        const fresh = streaming && words.length - 1 - i < 2;
        return (
          <span key={i} className="word-in inline">
            <span
              className={cn(
                "transition-colors duration-700 motion-reduce:transition-none",
                fresh && "text-accent",
              )}
            >
              {word}
            </span>{" "}
          </span>
        );
      })}
      {streaming && words.length > 0 && (
        <span
          aria-hidden
          className="-mb-0.5 ml-0.5 inline-block h-4 w-0.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
        />
      )}
    </p>
  );
}
