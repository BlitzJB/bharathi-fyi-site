// Message rendering with the hover action row, adapted from assistant-ui
// Elements "message-pair" / "message-actions" (r.assistant-ui.com, MIT).
"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ghostButton, iconSwap, iconSwapIn, iconSwapOut } from "./surfaces";
import { CheckIcon, CopyIcon, RefreshIcon } from "./icons";

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatMessage({
  message,
  streaming,
  onRegenerate,
  regenerating,
}: {
  message: UIMessage;
  /** True while this message is still receiving tokens. */
  streaming: boolean;
  /** Present only on the message that can be regenerated (the last reply). */
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = messageText(message);
  if (!text) return null;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl border border-line bg-surface px-3.5 py-2 text-sm leading-relaxed text-ink">
          {text}
        </p>
      </div>
    );
  }

  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
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
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="u-link"
              >
                {children}
              </a>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {/* Action row: revealed on hover or focus, hidden while streaming */}
      <div
        className={cn(
          "flex items-center gap-1 pt-1 opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none",
          streaming && "pointer-events-none",
        )}
      >
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
    </div>
  );
}
