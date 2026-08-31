"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./message";

const STARTERS = [
  "What has he actually built?",
  "Why move from infra to AI?",
  "What did he do at MotorQ?",
  "How do I reach him?",
];

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 12.5v-9M4 7l4-3.5L12 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="4.5" y="4.5" width="7" height="7" rx="1" fill="currentColor" />
    </svg>
  );
}

export function ChatPanel({ conceptCount }: { conceptCount: number }) {
  const { messages, sendMessage, status, error, stop } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  function autoresize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput("");
    requestAnimationFrame(autoresize);
  }

  return (
    <section
      aria-label="Ask Bharathi's assistant"
      className="flex h-full flex-col bg-surface"
    >
      {/* Title strip */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5 sm:px-6">
        <h2 className="font-mono text-xs text-ink">assistant</h2>
        <p className="font-mono text-[11px] text-ink-faint">
          grounded in <span className="text-accent-ink">.okf/</span> ·{" "}
          {conceptCount} concepts
        </p>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        {messages.length === 0 ? (
          <div className="flex h-full max-w-[30rem] flex-col justify-center gap-10">
            <p className="text-[15px] leading-relaxed">
              This assistant answers from a knowledgebase I keep in the
              site&rsquo;s repo. If something isn&rsquo;t in there, it says so
              instead of guessing. Ask it what you&rsquo;d ask me.
            </p>
            <div>
              <p className="font-mono text-[11px] text-ink-faint">try asking</p>
              <ul className="mt-2 divide-y divide-line">
                {STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      onClick={() => submit(starter)}
                      className="group flex w-full items-baseline gap-3 py-3 text-left text-[15px] text-ink-soft transition-[color,transform] duration-150 hover:translate-x-0.5 hover:text-ink"
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
          </div>
        ) : (
          <div className="mx-auto max-w-[36rem] space-y-5">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <p className="font-mono text-xs text-ink-faint">
                <span className="inline-block animate-pulse">
                  reading the knowledgebase&hellip;
                </span>
              </p>
            )}
            {error && (
              <p className="border-l-2 border-accent pl-3 text-xs text-ink-soft">
                Something broke. Try again in a bit.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="mx-auto max-w-[36rem] rounded-xl border border-line-strong bg-surface shadow-[0_1px_2px_rgba(20,20,15,0.05),0_4px_16px_rgba(20,20,15,0.04)] transition-[border-color,box-shadow] duration-200 focus-within:border-ink-faint focus-within:shadow-[0_1px_2px_rgba(20,20,15,0.06),0_8px_28px_rgba(20,20,15,0.08)]"
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              autoresize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            placeholder="Ask about Bharathi's work&hellip;"
            maxLength={2000}
            aria-label="Your question"
            className="max-h-40 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <div className="flex items-center justify-between px-3 pb-2.5 pl-4">
            <p className="hidden font-mono text-[11px] text-ink-faint select-none sm:block">
              &#9166; send&ensp;&#8679;&#9166; new line
            </p>
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                aria-label="Stop generating"
                className="pressable flex size-8 items-center justify-center rounded-lg bg-ink text-paper transition-colors hover:bg-ink-soft"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="pressable flex size-8 items-center justify-center rounded-lg bg-ink text-paper transition-[background-color,opacity] hover:bg-ink-soft disabled:cursor-default disabled:bg-line-strong disabled:text-surface"
              >
                <SendIcon />
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
