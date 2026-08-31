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
  "What did he do at Motorq?",
  "How do I reach him?",
];

export function ChatPanel({ concepts }: { concepts: ConceptMeta[] }) {
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
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-6 lg:px-8 lg:pt-14"
      >
        {messages.length === 0 ? (
          <div className="flex h-full max-w-[30rem] flex-col justify-center gap-8">
            <h2
              className="rise-in font-display text-2xl font-semibold tracking-tight text-ink"
              style={{ "--rise-index": 0 } as React.CSSProperties}
            >
              Ask about my work.
            </h2>
            <div>
              <ul className="divide-y divide-line">
                {STARTERS.map((starter, index) => (
                  <li
                    key={starter}
                    className="rise-in"
                    style={{ "--rise-index": index + 1 } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      onClick={() => submit(starter)}
                      className="group -mx-3 flex w-[calc(100%+1.5rem)] items-baseline gap-3 rounded-lg px-3 py-3 text-left text-[15px] text-ink-soft transition-[background-color,color,scale] duration-150 hover:bg-ink/[0.035] hover:text-ink active:scale-[0.99] motion-reduce:transition-none"
                    >
                      <span
                        aria-hidden
                        className="inline-block font-mono text-xs text-ink-faint transition-[translate,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:text-accent-ink motion-reduce:transition-none"
                      >
                        &rarr;
                      </span>
                      <span className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5 motion-reduce:transition-none">
                        {starter}
                      </span>
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
              placeholder="Ask more about Joshua's work"
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
