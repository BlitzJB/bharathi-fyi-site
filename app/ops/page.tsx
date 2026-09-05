import type { Metadata } from "next";
import Link from "next/link";
import { promptVersion } from "@/lib/knowledge";
import { readOpsSnapshot } from "@/lib/metrics";
import { CHAT_MODEL } from "@/lib/model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ops — bharathi.fyi",
  description:
    "Live operational metrics for this site's AI assistant: latency percentiles, queue depth, admission decisions, and per-answer traces.",
};

const TTFT_TARGET_MS = 2500;

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function fmtCount(n: number | undefined): string {
  return String(n ?? 0);
}

function Stat({
  label,
  value,
  detail,
  alert,
}: {
  label: string;
  value: string;
  detail?: string;
  alert?: boolean;
}) {
  return (
    <div className="border-t border-line py-4">
      <p className="font-mono text-[11px] tracking-wide text-ink-faint uppercase">
        {label}
      </p>
      <p
        className={`pt-1 font-display text-2xl font-semibold tracking-tight ${alert ? "text-red-700" : "text-ink"}`}
      >
        {value}
      </p>
      {detail && <p className="pt-0.5 text-xs text-ink-soft">{detail}</p>}
    </div>
  );
}

export default async function OpsPage() {
  const snapshot = await readOpsSnapshot();
  const c = snapshot.counters;
  const finishes = c.finishes ?? 0;
  const errors = c.errors ?? 0;
  const goodput =
    finishes + errors > 0
      ? ((finishes / (finishes + errors)) * 100).toFixed(1) + "%"
      : "—";
  const dedupHits = (c.reattaches ?? 0) + (c.singleFlightHits ?? 0);
  const globalBudget = Number(process.env.CHAT_TOKENS_PER_DAY_GLOBAL ?? 2_000_000);
  const tokens = c.tokens ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex items-baseline justify-between pb-10">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Engine room
          </h1>
          <p className="pt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            Live operational state of{" "}
            <Link href="/" className="u-link">
              this site&rsquo;s assistant
            </Link>
            . The serving path is deliberately overengineered — queue-fed
            generation on durable workflows, admission control, resumable
            streams — and this page is the glass. Refresh for fresh numbers.
          </p>
        </div>
      </header>

      <section aria-label="Service levels">
        <h2 className="pb-2 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Today (UTC) · {snapshot.day}
        </h2>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <Stat
            label="TTFT p50"
            value={fmtMs(snapshot.ttft.p50)}
            detail={`target ≤ ${TTFT_TARGET_MS / 1000}s`}
          />
          <Stat
            label="TTFT p95"
            value={fmtMs(snapshot.ttft.p95)}
            alert={(snapshot.ttft.p95 ?? 0) > TTFT_TARGET_MS}
            detail={`${snapshot.ttft.samples} samples`}
          />
          <Stat label="Answer p95" value={fmtMs(snapshot.duration.p95)} />
          <Stat
            label="Goodput"
            value={goodput}
            detail={`${finishes} ok / ${errors} failed`}
          />
        </div>
      </section>

      <section aria-label="Admission and queue" className="pt-10">
        <h2 className="pb-2 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Admission &amp; queue
        </h2>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <Stat
            label="Queue depth"
            value={String(snapshot.queueDepth)}
            detail="live active generations"
          />
          <Stat label="Requests" value={fmtCount(c.requests)} />
          <Stat
            label="Shed"
            value={fmtCount(c.sheds)}
            detail="rate limit / budget / capacity"
            alert={(c.sheds ?? 0) > 0}
          />
          <Stat
            label="Dedup hits"
            value={String(dedupHits)}
            detail="idempotent + single-flight"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <Stat
            label="Stream resumes"
            value={fmtCount(c.resumes)}
            detail="reloads that reattached"
          />
          <Stat
            label="Tokens"
            value={tokens.toLocaleString()}
            detail={`${((tokens / globalBudget) * 100).toFixed(1)}% of daily ceiling`}
          />
          <Stat
            label="Model"
            value={CHAT_MODEL.split("/")[1] ?? CHAT_MODEL}
            detail="via Vercel AI Gateway"
          />
          <Stat
            label="Prompt"
            value={promptVersion()}
            detail="system prompt content hash"
          />
        </div>
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <Stat
            label="Cache hits"
            value={fmtCount(c.cacheHits)}
            detail="semantic cache, no model call"
          />
          <Stat
            label="Guardrail"
            value={String((c.guardOffTopic ?? 0) + (c.guardAbuse ?? 0))}
            detail={`${fmtCount(c.guardOffTopic)} off-topic · ${fmtCount(c.guardAbuse)} abuse`}
          />
          <Stat
            label="Degraded"
            value={fmtCount(c.degradedAnswers)}
            detail="answered from raw KB"
            alert={(c.degradedAnswers ?? 0) > 0}
          />
          <Stat
            label="Broken citations"
            value={fmtCount(c.citationsBroken)}
            detail="failed verification"
            alert={(c.citationsBroken ?? 0) > 0}
          />
        </div>
        {snapshot.killSwitch && (
          <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-700">
            kill switch engaged — the assistant is answering in degraded mode
          </p>
        )}
      </section>

      <section aria-label="Recent answers" className="pt-10">
        <h2 className="pb-2 font-mono text-[11px] tracking-wide text-ink-faint uppercase">
          Recent answers
        </h2>
        {snapshot.recent.length === 0 ? (
          <p className="border-t border-line py-4 text-sm text-ink-soft">
            No answers traced yet today. Ask the assistant something.
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {snapshot.recent.map(({ requestId, runId }) => (
              <li key={requestId}>
                <Link
                  href={`/ops/trace/${runId}`}
                  className="flex items-baseline justify-between py-2.5 font-mono text-xs text-ink-soft transition-colors hover:text-ink"
                >
                  <span>{runId}</span>
                  <span className="text-ink-faint">view trace →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="pt-14">
        <p className="text-xs leading-relaxed text-ink-faint">
          Metrics reset daily (UTC). Traces are kept for seven days and never
          include visitor message content. How this is built:{" "}
          <Link href="/blog" className="u-link">
            the writing
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
