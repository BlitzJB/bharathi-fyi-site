import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readTrace } from "@/lib/metrics";
import { formatMicros } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Answer trace — bharathi.fyi",
  robots: { index: false },
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-line py-2.5">
      <dt className="shrink-0 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-right font-mono text-xs break-all text-ink">
        {value}
      </dd>
    </div>
  );
}

function fmtMs(raw?: string): string | null {
  const ms = Number(raw);
  if (!Number.isFinite(ms) || raw === undefined) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <header className="pb-8">
        <p className="font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          <Link href="/ops" className="transition-colors hover:text-ink">
            engine room
          </Link>{" "}
          / answer trace
        </p>
        <h1 className="pt-2 font-display text-2xl font-semibold tracking-tight text-ink">
          {trace.runId ?? runId}
        </h1>
        <p className="pt-2 text-sm leading-relaxed text-ink-soft">
          One answer&rsquo;s trip through the pipeline: admission, the queue,
          durable generation steps, and settlement. Visitor identity is a
          one-way hash; message content stays out of traces.
        </p>
      </header>

      <section aria-label="Outcome">
        <h2 className="pb-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Outcome
        </h2>
        <dl>
          <Row
            label="Status"
            value={
              failed
                ? "failed"
                : trace.finishReason
                  ? `finished (${trace.finishReason})`
                  : "in flight"
            }
          />
          <Row label="Error" value={trace.error} />
          <Row label="Time to first token" value={fmtMs(trace.ttftMs)} />
          <Row label="Total duration" value={fmtMs(trace.durationMs)} />
          <Row
            label="Tokens"
            value={
              trace.totalTokens
                ? `${Number(trace.totalTokens).toLocaleString()} (estimated ${Number(trace.estimatedTokens || 0).toLocaleString()})`
                : undefined
            }
          />
          <Row
            label="Cost"
            value={
              trace.costMicros !== undefined
                ? formatMicros(Number(trace.costMicros))
                : undefined
            }
          />
        </dl>
      </section>

      <section aria-label="Pipeline" className="pt-8">
        <h2 className="pb-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Pipeline
        </h2>
        <dl>
          <Row label="Admission" value={trace.admission} />
          <Row label="Enqueued" value={trace.enqueuedAt} />
          <Row
            label="Guardrail"
            value={
              trace.guardCategory &&
              `${trace.guardCategory}${trace.guardMs ? ` (${trace.guardMs}ms)` : ""}`
            }
          />
          <Row label="Guardrail reason" value={trace.guardReason} />
          <Row label="Policy version" value={trace.policyVersion} />
          <Row
            label="Retrieval"
            value={
              trace.retrievalMode &&
              `${trace.retrievalMode}${trace.retrievalMs ? ` (${trace.retrievalMs}ms)` : ""}`
            }
          />
          <Row label="Generation started" value={trace.generateStartedAt} />
          <Row label="Model used" value={trace.modelUsed} />
          <Row label="Model override" value={trace.modelOverride} />
          <Row label="Primary rung" value={trace["ladder:primary"]} />
          <Row label="Fallback rung" value={trace["ladder:fallback"]} />
          <Row label="Finished" value={trace.finishedAt} />
        </dl>
        {trace.retrievedChunks && trace.retrievedChunks !== "[]" && (
          <div className="border-t border-line py-2.5">
            <p className="pb-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
              Retrieved chunks
            </p>
            <ul>
              {(() => {
                try {
                  const chunks = JSON.parse(trace.retrievedChunks) as {
                    id: string;
                    score: number;
                  }[];
                  return chunks.map((chunk) => (
                    <li
                      key={chunk.id}
                      className="flex justify-between font-mono text-xs text-ink-soft"
                    >
                      <span>{chunk.id}</span>
                      <span className="text-ink-faint">
                        {chunk.score.toFixed(4)}
                      </span>
                    </li>
                  ));
                } catch {
                  return null;
                }
              })()}
            </ul>
          </div>
        )}
      </section>

      <section aria-label="Verification" className="pt-8">
        <h2 className="pb-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Verification
        </h2>
        <dl>
          <Row label="Citations" value={trace.citations} />
          <Row label="Citations verified" value={trace.citationsVerified} />
        </dl>
      </section>

      <section aria-label="Configuration" className="pt-8">
        <h2 className="pb-1 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Configuration
        </h2>
        <dl>
          <Row label="Model" value={trace.model} />
          <Row label="Prompt version" value={trace.promptVersion} />
          <Row label="Input size" value={trace.inputChars && `${trace.inputChars} chars`} />
          <Row label="Caller (hashed)" value={trace.caller} />
          <Row label="Request id" value={trace.requestId} />
        </dl>
      </section>
    </main>
  );
}
