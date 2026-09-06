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
import { TraceStrip } from "./trace-strip";
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

// Chat docs and their index live in localStorage so history survives across
// tabs and visits; the active-chat pointer is per tab (sessionStorage) so a
// reload resumes this tab's conversation while a new tab starts clean.
const INDEX_KEY = "bharathi-chats-v1";
const ACTIVE_KEY = "bharathi-active-chat-v1";
const MAX_CHATS = 30;

const chatKey = (id: string) => `bharathi-chat-v1:${id}`;

const emptySubscribe = () => () => {};

type SavedChat = { id: string; messages: UIMessage[] };
export type ChatIndexEntry = { id: string; title: string; updatedAt: number };

function loadIndex(): ChatIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatIndexEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // corrupted index: treat as empty
  }
  return [];
}

function loadChat(id: string): SavedChat | null {
  try {
    const raw = localStorage.getItem(chatKey(id));
    if (raw) {
      const parsed = JSON.parse(raw) as SavedChat;
      if (parsed.id && Array.isArray(parsed.messages)) return parsed;
    }
  } catch {
    // corrupted doc
  }
  return null;
}

function persistChat(chat: SavedChat): void {
  if (chat.messages.length === 0) return;
  try {
    localStorage.setItem(chatKey(chat.id), JSON.stringify(chat));
    const firstUser = chat.messages.find((m) => m.role === "user");
    const title =
      firstUser?.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .trim()
        .slice(0, 64) || "Untitled chat";
    const index = loadIndex().filter((entry) => entry.id !== chat.id);
    index.unshift({ id: chat.id, title, updatedAt: Date.now() });
    for (const pruned of index.slice(MAX_CHATS)) {
      localStorage.removeItem(chatKey(pruned.id));
    }
    localStorage.setItem(INDEX_KEY, JSON.stringify(index.slice(0, MAX_CHATS)));
    sessionStorage.setItem(ACTIVE_KEY, chat.id);
  } catch {
    // storage full or unavailable: history simply won't persist
  }
}

function bootChat(): SavedChat {
  try {
    const activeId = sessionStorage.getItem(ACTIVE_KEY);
    if (activeId) {
      const saved = loadChat(activeId);
      if (saved) return saved;
    }
  } catch {
    // fall through to a fresh chat
  }
  return { id: crypto.randomUUID(), messages: [] };
}

function EmptyState({ onPick }: { onPick?: (starter: string) => void }) {
  return (
    <div className="flex h-full max-w-[30rem] flex-col justify-center gap-8">
      <div
        className="rise-in"
        style={{ "--rise-index": 0 } as React.CSSProperties}
      >
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Ask about my work.
        </h2>
        <p className="pt-2 text-[13px] leading-relaxed text-ink-soft">
          Answers are grounded in a curated knowledgebase and served through
          a production-grade pipeline: admission control, durable workflows,
          guardrails, hybrid retrieval, and verified citations. Every answer
          comes with its own trace, and the whole system runs in the open in{" "}
          <a href="/ops" className="u-link">
            the engine room
          </a>
          .
        </p>
      </div>
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
  const [epoch, setEpoch] = useState(0);
  // epoch re-reads external storage whenever the active chat changes (new
  // chat, history jump) — an intentional extra dependency.
  const boot = useMemo<SavedChat | null>(
    () => (hydrated ? bootChat() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, epoch],
  );
  const history = useMemo<ChatIndexEntry[]>(
    () => (hydrated ? loadIndex() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hydrated, epoch],
  );

  function startNewChat() {
    try {
      sessionStorage.removeItem(ACTIVE_KEY);
    } catch {
      // storage unavailable: the new boot id resets the session anyway
    }
    setEpoch((n) => n + 1);
  }

  function openChat(id: string) {
    try {
      sessionStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // storage unavailable
    }
    setEpoch((n) => n + 1);
  }

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

  return (
    <ChatSession
      key={boot.id}
      boot={boot}
      concepts={concepts}
      history={history}
      onNewChat={startNewChat}
      onOpenChat={openChat}
    />
  );
}

function ChatSession({
  boot,
  concepts,
  history,
  onNewChat,
  onOpenChat,
}: {
  boot: SavedChat;
  concepts: ConceptMeta[];
  history: ChatIndexEntry[];
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const pastChats = history.filter((entry) => entry.id !== boot.id);

  // Clicking anywhere outside the dropdown (or pressing Escape) closes it.
  useEffect(() => {
    if (!historyOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!historyRef.current?.contains(event.target as Node)) {
        setHistoryOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setHistoryOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [historyOpen]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const answerVisible =
    lastMessage?.role === "assistant" && messageText(lastMessage).length > 0;
  const thinking = busy && !answerVisible;
  const retrying = retryRequested && busy;
  const hasText = input.trim().length > 0;

  // Persist the conversation so a reload can restore and resume it, and so
  // it lands in the history index. The still-streaming assistant message is
  // left out: after a reload the resume stream replays the whole answer,
  // and a saved partial copy would duplicate it.
  useEffect(() => {
    const trailingPartial =
      busy && messages[messages.length - 1]?.role === "assistant";
    const toSave = trailingPartial ? messages.slice(0, -1) : messages;
    persistChat({ id: boot.id, messages: toSave });
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
      className="relative flex h-full flex-col"
    >
      {/* top-14 clears the 48px fixed wordmark bar that overlays the
          viewport top once the page scrolls */}
      <div className="absolute top-14 right-5 z-10 flex items-center gap-1 sm:right-6 lg:right-8">
        <a
          href="/ops"
          className="rounded px-2 py-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink motion-reduce:transition-none"
        >
          engine room
        </a>
        {pastChats.length > 0 && (
          <div ref={historyRef} className="relative">
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              className="rounded px-2 py-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink motion-reduce:transition-none"
            >
              history
            </button>
            {historyOpen && (
              <div className="absolute top-full right-0 z-20 mt-1 w-64 rounded-lg border border-line bg-surface py-1 shadow-sm">
                <ul className="max-h-72 overflow-y-auto">
                  {pastChats.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryOpen(false);
                          onOpenChat(entry.id);
                        }}
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-ink/[0.035] motion-reduce:transition-none"
                      >
                        <span className="truncate text-[13px] text-ink">
                          {entry.title}
                        </span>
                        <span className="font-mono text-[10px] text-ink-faint">
                          {new Date(entry.updatedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {messages.length > 0 && !busy && (
          <button
            type="button"
            onClick={onNewChat}
            className="rounded px-2 py-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase transition-colors duration-150 hover:bg-ink/[0.04] hover:text-ink motion-reduce:transition-none"
          >
            + new chat
          </button>
        )}
      </div>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto px-5 pt-24 pb-6 sm:px-6 lg:px-8"
      >
        {messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <div className="mx-auto max-w-[36rem] space-y-5">
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              const isStreaming =
                busy && isLast && message.role === "assistant";
              // Align assistant messages with run ids from the end: the
              // newest answer maps to the newest run.
              let runId: string | undefined;
              if (message.role === "assistant") {
                const fromEnd = messages
                  .slice(index + 1)
                  .filter((m) => m.role === "assistant").length;
                runId = runIds[runIds.length - 1 - fromEnd];
              }
              return (
                <div key={message.id}>
                  <ChatMessage
                    message={message}
                    concepts={concepts}
                    streaming={isStreaming}
                    onRegenerate={
                      !busy && isLast && message.role === "assistant"
                        ? retry
                        : undefined
                    }
                    regenerating={retrying}
                  />
                  {message.role === "assistant" && !isStreaming && runId && (
                    <TraceStrip runId={runId} />
                  )}
                </div>
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
