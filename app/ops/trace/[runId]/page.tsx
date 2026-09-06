import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readTrace, type TraceDoc } from "@/lib/metrics";
import { formatMicros } from "@/lib/pricing";
import { ChunkScores, Waterfall, type Span } from "@/components/ops/waterfall";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Answer trace — bharathi.fyi",
  robots: { index: false },
};

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function num(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== "" ? n : null;
}

function iso(value: string | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/** Upstash may hand JSON fields back already parsed; accept both shapes. */
function chunksOf(raw: unknown): { id: string; score: number }[] {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(value)) {
      return value.filter(
        (c): c is { id: string; score: number } =>
          typeof c?.id === "string" && typeof c?.score === "number",
      );
    }
  } catch {
    // malformed: render nothing
  }
  return [];
}

function dedupeCitations(raw: string | undefined): { id: string; count: number }[] {
  if (!raw || raw === "none") return [];
  const counts = new Map<string, number>();
  for (const id of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].map(([id, count]) => ({ id, count }));
}

function buildSpans(
  trace: TraceDoc,
): { spans: Span[]; totalMs: number; approximate: boolean } | null {
  const t0 = iso(trace.enqueuedAt);
  const tEnd = iso(trace.finishedAt);
  if (t0 === null || tEnd === null) return null;
  const totalMs = tEnd - t0;
  const guardMs = num(trace.guardMs);
  const retrievalMs = num(trace.retrievalMs);
  const spans: Span[] = [];

  const guardStart = iso(trace.guardStartedAt);
  const retrievalStart = iso(trace.retrievalStartedAt);
  const genStart = iso(trace.generationStartedAt);

  if (guardStart !== null || retrievalStart !== null || genStart !== null) {
    // Exact mode: the pipeline stamped stage starts into the trace.
    if (guardStart !== null && guardMs !== null) {
      spans.push({
        name: "Guardrail",
        startMs: guardStart - t0,
        endMs: guardStart - t0 + guardMs,
        note: trace.guardCategory,
      });
    }
    if (retrievalStart !== null && retrievalMs !== null) {
      spans.push({
        name: "Retrieval",
        startMs: retrievalStart - t0,
        endMs: retrievalStart - t0 + retrievalMs,
        note: trace.retrievalMode,
      });
    }
    if (genStart !== null) {
      spans.push({
        name: "Generation",
        startMs: genStart - t0,
        endMs: totalMs,
        note: (trace.modelUsed ?? "").split("/").pop() || undefined,
      });
    }
    const firstStart = Math.min(...spans.map((s) => s.startMs));
    if (firstStart > 20) {
      spans.unshift({
        name: "Queue",
        startMs: 0,
        endMs: firstStart,
        note: "enqueue + dispatch",
      });
    }
    // Tile the gaps: durable-workflow dispatch between steps is real time,
    // so it gets its own muted spans instead of blank space.
    spans.sort((a, b) => a.startMs - b.startMs);
    const tiled: Span[] = [];
    for (const span of spans) {
      const prev = tiled[tiled.length - 1];
      if (prev && span.startMs - prev.endMs > 30) {
        tiled.push({
          name: "Dispatch",
          startMs: prev.endMs,
          endMs: span.startMs,
          note: "step handoff",
          kind: "overhead",
        });
      }
      tiled.push(span);
    }
    return { spans: tiled, totalMs, approximate: false };
  }

  // Older traces lack stage starts: chain the known durations in pipeline
  // order and let generation take the remainder.
  if (guardMs === null && retrievalMs === null) return null;
  let cursor = 0;
  if (guardMs !== null) {
    spans.push({ name: "Guardrail", startMs: cursor, endMs: cursor + guardMs, note: trace.guardCategory });
    cursor += guardMs;
  }
  if (retrievalMs !== null) {
    spans.push({ name: "Retrieval", startMs: cursor, endMs: cursor + retrievalMs, note: trace.retrievalMode });
    cursor += retrievalMs;
  }
  if (totalMs > cursor) {
    spans.push({
      name: "Generation",
      startMs: cursor,
      endMs: totalMs,
      note: (trace.modelUsed ?? "").split("/").pop() || undefined,
    });
  }
  return { spans, totalMs, approximate: true };
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.85em] text-ink">{children}</span>;
}

/** One narrated stage of the journey: a node on the rail, a title, prose. */
function Chapter({
  index,
  title,
  last,
  alert,
  children,
}: {
  index: number;
  title: string;
  last: boolean;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pb-8 pl-8 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute top-5 bottom-0 left-[7px] w-px bg-line"
        />
      )}
      <span
        aria-hidden
        className={`absolute top-1 left-0 grid size-[15px] place-items-center rounded-full border text-[8px] font-medium ${
          alert
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-line-strong bg-surface text-ink-faint"
        }`}
      >
        {index}
      </span>
      <h3 className="text-[15px] leading-snug font-medium text-ink">{title}</h3>
      <div className="space-y-1 pt-1 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-1.5">
      <dt className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-mono text-[11px] break-all text-ink">
        {value}
      </dd>
    </div>
  );
}

export default async function TracePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const trace = await readTrace(runId);
  if (!trace) notFound();

  const failed = Boolean(trace.error);
  const refused = trace.finishReason?.startsWith("refused");
  const durationMs = num(trace.durationMs);
  const ttftMs = num(trace.ttftMs);
  const cost = num(trace.costMicros);
  const waterfall = buildSpans(trace);
  const chunks = chunksOf(trace.retrievedChunks);
  const citations = dedupeCitations(trace.citations);
  const verified = trace.citationsVerified === "yes";

  const summary = failed
    ? `This run failed: ${trace.error}`
    : refused
      ? `The guardrail refused this message (${trace.guardCategory?.replace("_", " ")}) before any model ran; the visitor got a scoped redirect in ${durationMs ? fmtMs(durationMs) : "under a second"}.`
      : [
          durationMs ? `Answered in ${fmtMs(durationMs)}` : "In flight",
          ttftMs ? `first token at ${fmtMs(ttftMs)}` : null,
          trace.totalTokens
            ? `${Number(trace.totalTokens).toLocaleString("en-US")} tokens`
            : null,
          cost ? `${formatMicros(cost)}` : null,
          citations.length > 0
            ? verified
              ? `${citations.length} verified citation${citations.length === 1 ? "" : "s"}`
              : "citation verification failed"
            : null,
        ]
          .filter(Boolean)
          .join(", ") + ".";

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="pb-10">
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          <Link href="/ops" className="transition-colors hover:text-ink">
            engine room
          </Link>{" "}
          / answer trace
        </p>
        <h1 className="pt-2 font-mono text-lg break-all text-ink">
          {trace.runId ?? runId}
        </h1>
        <p className={`pt-4 text-[15px] leading-relaxed ${failed ? "text-red-700" : "text-ink"}`}>
          {summary}
        </p>
        <p className="pt-2 text-xs leading-relaxed text-ink-faint">
          Visitor identity is a one-way hash; message content never enters
          traces.
        </p>
      </header>

      {waterfall && (
        <section aria-label="Timeline" className="border-t border-line-strong pt-6 pb-10">
          <div className="flex items-baseline justify-between pb-5">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
              Timeline
            </h2>
            {waterfall.approximate && (
              <p className="font-mono text-[11px] text-ink-faint">
                stage starts approximated (older trace)
              </p>
            )}
          </div>
          <Waterfall
            spans={waterfall.spans}
            totalMs={waterfall.totalMs}
            ttftMs={ttftMs}
          />
          {!waterfall.approximate && (
            <p className="pt-4 text-[11px] leading-relaxed text-ink-faint">
              The gray spans are durable-workflow dispatch: each stage is an
              independently retried, checkpointed step, and the handoffs are
              what that crash-safety costs.
            </p>
          )}
        </section>
      )}

      {/* The journey: each stage narrated with its evidence inline */}
      <section aria-label="Journey" className="border-t border-line pt-6 pb-4">
        <h2 className="pb-6 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          What happened
        </h2>
        <ol className="space-y-0">
          <Chapter
            index={1}
            title="Admitted at the edge"
            last={false}
          >
            <p>
              A {trace.inputChars ?? "?"}-character message from caller{" "}
              <Mono>{(trace.caller ?? "").slice(0, 8)}…</Mono> passed schema
              validation, the per-caller rate limit, and both token budgets
              {trace.estimatedTokens && (
                <>
                  {" "}
                  (charged an estimate of{" "}
                  {Number(trace.estimatedTokens).toLocaleString("en-US")}{" "}
                  tokens, settled later against actual usage)
                </>
              )}
              .
            </p>
          </Chapter>
          <Chapter index={2} title="Became a durable workflow" last={false}>
            <p>
              The endpoint never calls a model. At{" "}
              <Mono>{trace.enqueuedAt?.slice(11, 23)}</Mono> the request was
              enqueued as run <Mono>{(trace.runId ?? "").slice(0, 18)}…</Mono>;
              tokens stream into the run&rsquo;s persistent log, which is why
              a page reload can reattach mid-answer.
            </p>
          </Chapter>
          <Chapter
            index={3}
            title={
              trace.guardCategory === "allow"
                ? "Cleared the guardrail"
                : `Refused by the guardrail`
            }
            last={refused ?? false}
            alert={trace.guardCategory === "abuse"}
          >
            <p>
              gpt-oss-safeguard classified the message against policy{" "}
              <Mono>{trace.policyVersion}</Mono>
              {num(trace.guardMs) !== null && <> in {fmtMs(num(trace.guardMs)!)}</>}
              : <strong className="font-medium text-ink">{trace.guardCategory ?? "unknown"}</strong>.
            </p>
            {trace.guardReason && (
              <p className="border-l-0 pt-1 text-[13px] text-ink-soft italic">
                &ldquo;{trace.guardReason}&rdquo;
              </p>
            )}
            {refused && (
              <p className="pt-1">
                The visitor got a scoped redirect; no retrieval ran and no
                generation was paid for.
              </p>
            )}
          </Chapter>
          {!refused && (
            <Chapter index={4} title="Pulled its evidence" last={false}>
              <p>
                {trace.retrievalMode === "hybrid" ? (
                  <>
                    Hybrid search (dense embeddings fused with BM25) returned{" "}
                    {chunks.length || "its"} passages
                    {num(trace.retrievalMs) !== null && (
                      <> in {fmtMs(num(trace.retrievalMs)!)}</>
                    )}
                    ; only these entered the model&rsquo;s context.
                  </>
                ) : (
                  <>
                    The vector store was unreachable, so the full
                    knowledgebase went into context as the documented
                    fallback.
                  </>
                )}
              </p>
              {chunks.length > 0 && (
                <div className="pt-3">
                  <ChunkScores chunks={chunks} />
                </div>
              )}
            </Chapter>
          )}
          {!refused && (
            <Chapter
              index={5}
              title={
                trace.finishReason === "degraded-raw"
                  ? "Every model failed; the knowledgebase answered"
                  : "Generated"
              }
              last={false}
              alert={Boolean(trace["ladder:primary"] || trace["ladder:fallback"])}
            >
              {trace["ladder:primary"] && (
                <p className="text-red-700">
                  Primary rung failed: {trace["ladder:primary"].slice(0, 140)}
                </p>
              )}
              {trace["ladder:fallback"] && (
                <p className="text-red-700">
                  Fallback rung failed: {trace["ladder:fallback"].slice(0, 140)}
                </p>
              )}
              <p>
                {trace.finishReason === "degraded-raw" ? (
                  <>
                    The degradation ladder bottomed out and the answer was
                    assembled from raw knowledgebase passages, with citations,
                    at no model cost.
                  </>
                ) : (
                  <>
                    <Mono>{trace.modelUsed ?? trace.model}</Mono>
                    {trace.modelOverride && <> (via runtime override flag)</>}{" "}
                    streamed the answer
                    {ttftMs !== null && <>, first token {fmtMs(ttftMs)} in</>}
                    {trace.inputTokens !== undefined ? (
                      <>
                        , spending{" "}
                        {Number(trace.inputTokens).toLocaleString("en-US")}{" "}
                        tokens in /{" "}
                        {Number(trace.outputTokens ?? 0).toLocaleString("en-US")}{" "}
                        out
                      </>
                    ) : (
                      trace.totalTokens && (
                        <>
                          , spending{" "}
                          {Number(trace.totalTokens).toLocaleString("en-US")}{" "}
                          tokens
                        </>
                      )
                    )}
                    {cost !== null && cost > 0 && <> ({formatMicros(cost)})</>}.
                  </>
                )}
              </p>
            </Chapter>
          )}
          {!refused && (
            <Chapter
              index={6}
              title={verified ? "Verified and settled" : "Verification flagged this answer"}
              last
              alert={Boolean(trace.citationsVerified) && !verified}
            >
              <p>
                {citations.length === 0 ? (
                  <>The answer cited nothing, so there was nothing to verify. </>
                ) : verified ? (
                  <>
                    Every citation was checked against the concept registry
                    and resolves.{" "}
                  </>
                ) : (
                  <>{trace.citationsVerified}. </>
                )}
                Token budgets were settled against actual usage and this
                trace was written.
              </p>
              {citations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3">
                  {citations.map((citation) => (
                    <span
                      key={citation.id}
                      className="rounded border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink"
                    >
                      {citation.id}
                      {citation.count > 1 && (
                        <span className="text-ink-faint"> ×{citation.count}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </Chapter>
          )}
        </ol>
      </section>

      <section aria-label="Record" className="border-t border-line-strong pt-6">
        <h2 className="pb-4 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          Record
        </h2>
        <dl>
          <Row label="Status" value={failed ? "failed" : trace.finishReason ? `finished (${trace.finishReason})` : "in flight"} />
          <Row label="Error" value={trace.error} />
          <Row label="Admission" value={trace.admission} />
          <Row label="Guardrail reason" value={trace.guardReason} />
          <Row
            label="Tokens in / out"
            value={
              trace.inputTokens !== undefined
                ? `${Number(trace.inputTokens).toLocaleString("en-US")} / ${Number(trace.outputTokens ?? 0).toLocaleString("en-US")}`
                : trace.totalTokens
                  ? `${Number(trace.totalTokens).toLocaleString("en-US")} total (estimated ${Number(trace.estimatedTokens ?? 0).toLocaleString("en-US")})`
                  : undefined
            }
          />
          <Row label="Cost" value={cost !== null ? formatMicros(cost) : undefined} />
          <Row label="Primary rung" value={trace["ladder:primary"]} />
          <Row label="Fallback rung" value={trace["ladder:fallback"]} />
          <Row label="Model" value={trace.modelUsed ?? trace.model} />
          <Row label="Model override" value={trace.modelOverride} />
          <Row label="Prompt version" value={trace.promptVersion} />
          <Row label="Policy version" value={trace.policyVersion} />
          <Row label="Input size" value={trace.inputChars && `${trace.inputChars} chars`} />
          <Row label="Caller (hashed)" value={trace.caller} />
          <Row label="Request id" value={trace.requestId} />
          <Row label="Enqueued" value={trace.enqueuedAt} />
          <Row label="Finished" value={trace.finishedAt} />
        </dl>
      </section>
    </main>
  );
}
