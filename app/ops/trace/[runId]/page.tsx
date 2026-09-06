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

function buildSpans(trace: TraceDoc): { spans: Span[]; totalMs: number } | null {
  const t0 = iso(trace.enqueuedAt);
  const tEnd = iso(trace.finishedAt);
  if (t0 === null || tEnd === null) return null;
  const totalMs = tEnd - t0;
  const spans: Span[] = [];

  const guardStart = iso(trace.guardStartedAt);
  const guardMs = num(trace.guardMs);
  if (guardStart !== null && guardMs !== null) {
    spans.push({
      name: "Guardrail",
      startMs: guardStart - t0,
      endMs: guardStart - t0 + guardMs,
      note: trace.guardCategory,
    });
  }
  const retrievalStart = iso(trace.retrievalStartedAt);
  const retrievalMs = num(trace.retrievalMs);
  if (retrievalStart !== null && retrievalMs !== null) {
    spans.push({
      name: "Retrieval",
      startMs: retrievalStart - t0,
      endMs: retrievalStart - t0 + retrievalMs,
      note: trace.retrievalMode,
    });
  }
  const genStart = iso(trace.generationStartedAt);
  if (genStart !== null) {
    spans.push({
      name: "Generation",
      startMs: genStart - t0,
      endMs: totalMs,
      note: (trace.modelUsed ?? "").split("/").pop() || undefined,
    });
  }
  if (spans.length === 0) return null;
  // Queue dispatch is everything before the first instrumented span.
  const firstStart = Math.min(...spans.map((s) => s.startMs));
  if (firstStart > 20) {
    spans.unshift({
      name: "Queue",
      startMs: 0,
      endMs: firstStart,
      note: "enqueue + dispatch",
    });
  }
  return { spans, totalMs };
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
          <h2 className="pb-5 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Timeline
          </h2>
          <Waterfall
            spans={waterfall.spans}
            totalMs={waterfall.totalMs}
            ttftMs={ttftMs}
          />
          <p className="pt-4 text-[11px] leading-relaxed text-ink-faint">
            Gaps between spans are durable-workflow dispatch: each stage is an
            independently retried step, and that safety costs a little time.
          </p>
        </section>
      )}

      {chunks.length > 0 && (
        <section aria-label="Retrieval" className="border-t border-line pt-6 pb-10">
          <div className="flex items-baseline justify-between pb-4">
            <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
              Retrieved chunks
            </h2>
            <p className="font-mono text-[11px] text-ink-faint">
              hybrid dense + BM25, fused
            </p>
          </div>
          <ChunkScores chunks={chunks} />
        </section>
      )}

      {(citations.length > 0 || trace.citationsVerified) && (
        <section aria-label="Verification" className="border-t border-line pt-6 pb-10">
          <h2 className="pb-4 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Citation verification
          </h2>
          {citations.length === 0 ? (
            <p className="text-sm text-ink-soft">
              The answer cited nothing, so there was nothing to verify.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
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
              <span
                className={`px-2 py-1 font-mono text-[11px] ${verified ? "text-ink-soft" : "text-red-700"}`}
              >
                {verified ? "✓ all resolve in the knowledgebase" : trace.citationsVerified}
              </span>
            </div>
          )}
        </section>
      )}

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
