"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./message";

const STARTERS = [
  "What has Bharathi actually shipped?",
  "Why platform engineering, then AI?",
  "What happened at MotorQ?",
  "How do I get in touch?",
];

export function ChatPanel({ conceptCount }: { conceptCount: number }) {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <section
      aria-label="Ask Bharathi's assistant"
      className="border border-line-strong bg-surface"
    >
      {/* Title strip */}
      <header className="flex items-baseline justify-between border-b border-line-strong px-4 py-2.5">
        <h2 className="font-mono text-xs text-ink">assistant</h2>
        <p className="font-mono text-[11px] text-ink-faint">
          grounded in{" "}
          <span className="text-accent-ink">.okf/</span> · {conceptCount}{" "}
          concepts
        </p>
      </header>

      <div
        ref={scrollRef}
        className="h-[24rem] space-y-4 overflow-y-auto px-4 py-4 sm:h-[27rem]"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-between">
            <p className="max-w-[38ch] text-sm leading-relaxed">
              Every answer comes from a knowledgebase checked into this
              site&rsquo;s repo — not the open internet. Ask about the work,
              the switch to AI, or how to reach him.
            </p>
            <ul className="border-t border-line">
              {STARTERS.map((starter) => (
                <li key={starter} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => submit(starter)}
                    className="group flex w-full items-baseline gap-3 py-2.5 text-left text-sm transition-colors hover:text-accent-ink"
                  >
                    <span
                      aria-hidden
                      className="font-mono text-xs text-ink-faint transition-colors group-hover:text-accent-ink"
                    >
                      &rarr;
                    </span>
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <p className="font-mono text-xs text-ink-faint">
                <span className="inline-block animate-pulse">reading the knowledgebase&hellip;</span>
              </p>
            )}
            {error && (
              <p className="border-l-2 border-accent pl-3 text-xs text-ink-soft">
                Something went wrong — try again in a moment.
              </p>
            )}
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-stretch border-t border-line-strong"
      >
        <span
          aria-hidden
          className="flex items-center pl-4 font-mono text-sm text-ink-faint"
        >
          &gt;
        </span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask about the work"
          maxLength={2000}
          aria-label="Your question"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="pressable m-1.5 bg-ink px-4 font-mono text-xs text-paper transition-colors disabled:opacity-35"
        >
          {busy ? "…" : "send"}
        </button>
      </form>
    </section>
  );
}
