"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { ConceptMeta } from "@/lib/knowledge";
import { ChatMessage, messageText } from "./message";
import { ThinkingIndicator } from "./thinking-indicator";
import { ErrorState } from "./error-state";
import {
  Composer,
  ComposerBar,
  ComposerInput,
  ComposerToolbar,
  ComposerActions,
  ComposerSend,
} from "./composer";

const STARTERS = [
  "What has he actually built?",
  "Why move from infra to AI?",
  "What did he do at MotorQ?",
  "How do I reach him?",
];

export function ChatPanel({
  conceptCount,
  concepts,
}: {
  conceptCount: number;
  concepts: ConceptMeta[];
}) {
  const { messages, sendMessage, status, error, stop, regenerate, clearError } =
    useChat();
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [retryRequested, setRetryRequested] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const answerVisible =
    lastMessage?.role === "assistant" && messageText(lastMessage).length > 0;
  const thinking = busy && !answerVisible;
  const retrying = retryRequested && busy;
  const hasText = input.trim().length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // Elapsed seconds while the model is thinking, shown by the indicator.
  useEffect(() => {
    if (!thinking) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [thinking]);

  function autoresize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }

  useEffect(() => {
    autoresize();
  }, []);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    setRetryRequested(false);
    setElapsed(0);
    sendMessage({ text: trimmed });
    setInput("");
    requestAnimationFrame(autoresize);
  }

  function retry() {
    setRetryRequested(true);
    setElapsed(0);
    regenerate();
  }

  return (
    <section
      aria-label="Ask Bharathi's assistant"
      className="flex h-full flex-col"
    >
      {/* Title strip */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-5 sm:px-6 lg:px-8">
        <h2 className="font-mono text-xs text-ink">assistant</h2>
        <p className="font-mono text-[11px] text-ink-faint">
          grounded in <span className="text-accent-ink">.okf/</span> ·{" "}
          {conceptCount} concepts
        </p>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-6 lg:px-8"
      >
        {messages.length === 0 ? (
          <div className="flex h-full max-w-[30rem] flex-col justify-center gap-10">
            <p
              className="rise-in text-[15px] leading-relaxed"
              style={{ "--rise-index": 0 } as React.CSSProperties}
            >
              This assistant answers from a knowledgebase I keep in the
              site&rsquo;s repo. If something isn&rsquo;t in there, it says so
              instead of guessing. Ask it what you&rsquo;d ask me.
            </p>
            <div>
              <p
                className="rise-in font-mono text-[11px] text-ink-faint"
                style={{ "--rise-index": 1 } as React.CSSProperties}
              >
                try asking
              </p>
              <ul className="mt-2 divide-y divide-line">
                {STARTERS.map((starter, index) => (
                  <li
                    key={starter}
                    className="rise-in"
                    style={{ "--rise-index": index + 2 } as React.CSSProperties}
                  >
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
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  concepts={concepts}
                  streaming={busy && isLast && message.role === "assistant"}
                  onRegenerate={
                    !busy && isLast && message.role === "assistant"
                      ? retry
                      : undefined
                  }
                  regenerating={retrying}
                />
              );
            })}
            {thinking && (
              <ThinkingIndicator
                label="Reading the knowledgebase"
                elapsed={elapsed > 0 ? `${elapsed}s` : undefined}
              />
            )}
            {error && !busy && (
              <ErrorState
                title="The assistant hit a snag"
                detail="The model request failed. This is usually transient."
                retrying={retrying}
                onRetry={retry}
              />
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8">
        <Composer className="mx-auto max-w-[36rem]">
          <ComposerBar>
            <ComposerInput
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoresize();
              }}
              onSubmit={() => submit(input)}
              placeholder="Ask about Bharathi's work&hellip;"
              maxLength={2000}
              aria-label="Your question"
              className="max-h-40"
            />
            <ComposerToolbar>
              <p className="hidden ps-3 font-mono text-[11px] text-ink-faint select-none sm:block">
                &#9166; send&ensp;&#8679;&#9166; new line
              </p>
              <ComposerActions>
                <ComposerSend
                  streaming={busy}
                  idle={hasText}
                  disabled={!busy && !hasText}
                  onClick={busy ? () => stop() : () => submit(input)}
                />
              </ComposerActions>
            </ComposerToolbar>
          </ComposerBar>
        </Composer>
      </div>
    </section>
  );
}
