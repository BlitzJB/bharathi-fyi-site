"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@ai-sdk/workflow";
import type { UIMessage } from "ai";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

/**
 * Rejections carry a JSON body whose `error` field is written for humans
 * (rate limits, budgets, kill switch); the transport wraps it in prose, so
 * fish the JSON out. In-stream errors arrive as plain sentences.
 */
function serverErrorDetail(error: Error): string {
  const embedded = error.message.match(/\{[\s\S]*\}/);
  if (embedded) {
    try {
      const parsed = JSON.parse(embedded[0]) as { error?: string };
      if (typeof parsed.error === "string" && parsed.error.length > 0) {
        return parsed.error;
      }
    } catch {
      // fall through
    }
  }
  const message = error.message.trim();
  if (message.length > 0 && message.length < 200 && !/[<>{}]/.test(message)) {
    return message;
  }
  return "The model request failed. This is usually transient.";
}

const STARTERS = [
  "What has he actually built?",
  "Why move from infra to AI?",
  "What did he do at Motorq?",
  "How do I reach him?",
];

const STORAGE_KEY = "bharathi-chat-v1";

const emptySubscribe = () => () => {};

type SavedChat = { id: string; messages: UIMessage[] };

function loadSavedChat(): SavedChat {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedChat;
      if (parsed.id && Array.isArray(parsed.messages)) return parsed;
    }
  } catch {
    // corrupted state: start fresh
  }
  return { id: crypto.randomUUID(), messages: [] };
}

function EmptyState({ onPick }: { onPick?: (starter: string) => void }) {
  return (
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
                onClick={onPick ? () => onPick(starter) : undefined}
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
  );
}

export function ChatPanel({ concepts }: { concepts: ConceptMeta[] }) {
  // Saved chats live in sessionStorage, which the server render can't see.
  // useSyncExternalStore hydrates with the server snapshot first, then
  // re-renders on the client, where we can read storage safely.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const boot = useMemo<SavedChat | null>(
    () => (hydrated ? loadSavedChat() : null),
    [hydrated],
  );

  if (!boot) {
    return (
      <section
        aria-label="Ask Bharathi's assistant"
        className="flex h-full flex-col"
      >
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 py-6 sm:px-6 lg:px-8 lg:pt-14">
          <EmptyState />
        </div>
      </section>
    );
  }

  return <ChatSession key={boot.id} boot={boot} concepts={concepts} />;
}

function ChatSession({
  boot,
  concepts,
}: {
  boot: SavedChat;
  concepts: ConceptMeta[];
}) {
  // Run ids arrive as response headers, one per generation; assistant
  // messages align with them from the end (regenerations replace the last
  // message but append a new run).
  const [runIds, setRunIds] = useState<string[]>([]);

  const transport = useMemo(
    () =>
      new WorkflowChatTransport<UIMessage>({
        prepareSendMessagesRequest: ({
          id,
          messages,
          trigger,
          messageId,
          api,
          headers,
          body,
        }) => ({
          api,
          headers,
          body: { id, messageId, trigger, messages, ...body },
        }),
        onChatSendMessage: (response) => {
          const runId = response.headers.get("x-workflow-run-id");
          if (runId) setRunIds((prev) => [...prev, runId]);
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, regenerate, clearError } =
    useChat({
      id: boot.id,
      messages: boot.messages,
      transport,
      // Reattach to an in-flight generation after a reload. Persisted chats
      // end on a user message only when the answer never finished (the
      // in-flight assistant message is stripped before saving), so this
      // resumes exactly the interrupted case without replaying finished runs.
      resume: boot.messages[boot.messages.length - 1]?.role === "user",
    });
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

  // Persist the conversation so a reload can restore and resume it. The
  // still-streaming assistant message is left out: after a reload the
  // resume stream replays the whole answer, and a saved partial copy would
  // duplicate it.
  useEffect(() => {
    const trailingPartial =
      busy && messages[messages.length - 1]?.role === "assistant";
    const toSave = trailingPartial ? messages.slice(0, -1) : messages;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: boot.id, messages: toSave } satisfies SavedChat),
      );
    } catch {
      // storage full or unavailable: resume simply won't survive reload
    }
  }, [boot.id, messages, busy]);

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

  function stopGeneration() {
    stop();
    // Also cancel the workflow run so the server stops paying for tokens.
    fetch(`/api/chat/${boot.id}/stop`, { method: "POST" }).catch(() => {});
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
          <EmptyState onPick={submit} />
        ) : (
          <div className="mx-auto max-w-[36rem] space-y-5">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              // Align assistant messages with run ids from the end: the
              // newest answer maps to the newest run.
              let traceHref: string | undefined;
              if (message.role === "assistant") {
                const fromEnd = messages
                  .slice(index + 1)
                  .filter((m) => m.role === "assistant").length;
                const runId = runIds[runIds.length - 1 - fromEnd];
                // Cache-served answers have no run to trace.
                if (runId && runId.startsWith("wrun_"))
                  traceHref = `/ops/trace/${runId}`;
              }
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
                  traceHref={traceHref}
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
                detail={serverErrorDetail(error)}
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
                  onClick={busy ? stopGeneration : () => submit(input)}
                />
              </ComposerActions>
            </ComposerToolbar>
          </ComposerBar>
        </Composer>
      </div>
    </section>
  );
}
