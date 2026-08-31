"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./message";

const STARTERS = [
  "What does Bharathi do?",
  "Why the move from platform to AI engineering?",
  "What has Bharathi built?",
  "How do I get in touch?",
];

export function ChatPanel() {
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
      aria-label="Chat with Bharathi's assistant"
      className="flex h-[30rem] flex-col rounded-lg border border-line bg-surface sm:h-[34rem]"
    >
      <header className="flex items-center gap-2.5 border-b border-line px-5 py-3.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-accent" />
        </span>
        <h2 className="font-mono text-xs tracking-wide text-ink-soft uppercase">
          Ask my assistant
        </h2>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-4">
            <p className="text-sm leading-relaxed text-ink-soft">
              I&rsquo;m grounded in a knowledgebase Bharathi maintains — ask
              about their work, background, or how to get in touch.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => submit(starter)}
                  className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-xs text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <p className="animate-pulse font-mono text-xs text-ink-faint">
                thinking&hellip;
              </p>
            )}
            {error && (
              <p className="text-xs text-red-700">
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
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Bharathi&hellip;"
          maxLength={2000}
          aria-label="Your question"
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-ink px-3.5 py-2 text-sm text-paper transition-opacity disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
