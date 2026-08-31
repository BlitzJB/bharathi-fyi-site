// Message rendering: streaming word-reveal, settled markdown with inline
// citations, and the hover action row. Adapted from assistant-ui Elements
// "message-pair" / "message-actions" / "inline-citation"
// (r.assistant-ui.com, MIT).
"use client";

import { useMemo, useState } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ConceptMeta } from "@/lib/knowledge";
import { ghostButton, iconSwap, iconSwapIn, iconSwapOut } from "./surfaces";
import { CheckIcon, CopyIcon, RefreshIcon } from "./icons";
import { Citation, type Source } from "./inline-citation";

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

const CITE_RE = /\[cite:([\w./-]+)\]/g;

/**
 * Turns `[cite:concept-id]` markers into markdown links (`[n](#cite:n)`)
 * that the renderer swaps for Citation markers, and collects the cited
 * concepts as sources in order of first appearance.
 */
function extractCitations(
  text: string,
  concepts: ConceptMeta[],
  streaming: boolean,
): { processed: string; sources: Source[] } {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const order: string[] = [];

  // While streaming, hide a citation marker that is still arriving.
  const input = streaming ? text.replace(/\[cite:[^\]]*$/, "") : text;

  const processed = input
    .replace(CITE_RE, (match, id: string) => {
      const concept = byId.get(id);
      if (!concept) return "";
      let index = order.indexOf(id);
      if (index === -1) {
        order.push(id);
        index = order.length - 1;
      }
      return `[${index + 1}](#cite:${index})`;
    })
    // drop any malformed leftover markers rather than showing them raw
    .replace(/\[cite:[^\]]*\]?/g, "");

  const sources = order.map((id) => {
    const concept = byId.get(id)!;
    return {
      domain: `.okf/${id}`,
      title: concept.title,
      snippet: concept.description,
    };
  });

  return { processed, sources };
}

export function ChatMessage({
  message,
  streaming,
  concepts,
  onRegenerate,
  regenerating,
}: {
  message: UIMessage;
  /** True while this message is still receiving tokens. */
  streaming: boolean;
  concepts: ConceptMeta[];
  /** Present only on the message that can be regenerated (the last reply). */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = messageText(message);
  const isAssistant = message.role === "assistant";

  const { processed, sources } = useMemo(
    () =>
      isAssistant
        ? extractCitations(text, concepts, streaming)
        : { processed: text, sources: [] as Source[] },
    [isAssistant, streaming, text, concepts],
  );

  if (!text) return null;

  if (!isAssistant) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl border border-line bg-surface px-3.5 py-2 text-sm leading-relaxed text-ink">
          {text}
        </p>
      </div>
    );
  }

  function copy() {
    navigator.clipboard
      .writeText(text.replace(CITE_RE, "").replace(/\[cite:[^\]]*\]?/g, ""))
      .catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group/message flex flex-col items-start">
      <div
        data-streaming={streaming || undefined}
        className="chat-markdown min-w-0 text-sm leading-relaxed"
      >
          <ReactMarkdown
            components={{
              a: ({ href, children }) => {
                if (href?.startsWith("#cite:")) {
                  const index = Number(href.slice("#cite:".length));
                  const source = sources[index];
                  if (!source) return null;
                  return <Citation index={index} source={source} />;
                }
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="u-link"
                  >
                    {children}
                  </a>
                );
              },
            }}
        >
          {processed}
        </ReactMarkdown>
      </div>

      {/* Action row: revealed on hover or focus, hidden while streaming */}
      {!streaming && (
        <div className="flex items-center gap-1 pt-1 opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none">
          <button
            type="button"
            aria-label={copied ? "Copied response" : "Copy response"}
            onClick={copy}
            className={cn(
              ghostButton,
              "grid size-7 place-items-center",
              copied && "text-accent-ink",
            )}
          >
            <CopyIcon
              className={cn(iconSwap, "size-3.5", copied ? iconSwapOut : iconSwapIn)}
            />
            <CheckIcon
              className={cn(iconSwap, "size-3.5", copied ? iconSwapIn : iconSwapOut)}
            />
          </button>
          {onRegenerate && (
            <button
              type="button"
              aria-label="Regenerate response"
              onClick={onRegenerate}
              className={cn(ghostButton, "size-7")}
            >
              <RefreshIcon
                className={cn(
                  "size-3.5",
                  regenerating && "animate-spin motion-reduce:animate-none",
                )}
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
