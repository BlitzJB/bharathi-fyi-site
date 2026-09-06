import type { Metadata } from "next";
import Link from "next/link";
import { promptVersion } from "@/lib/knowledge";
import { loadPolicy } from "@/lib/guardrail";
import { readOpsSnapshot, type TraceDoc } from "@/lib/metrics";
import { CHAT_MODEL } from "@/lib/model";
import { formatMicros } from "@/lib/pricing";
import { Meter, TtftHistogram } from "@/components/ops/charts";
import { Pipeline } from "@/components/ops/pipeline";
import { LiveRefresh } from "@/components/ops/live-refresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Engine room — bharathi.fyi",
  description:
    "Live operational state of this site's AI assistant: the serving pipeline, latency distribution, admission decisions, spend, and per-answer traces.",
};

const TTFT_TARGET_MS = 2500;

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
      {children}
    </h2>
  );
}

function statusSentence(args: {
  finishes: number;
  canaryUp: boolean | null;
  breakerOpen: boolean;
  killSwitch: boolean;
  queueDepth: number;
}): string {
  if (args.killSwitch)
    return "The kill switch is engaged: the assistant is answering in degraded mode while generation is paused.";
  if (args.breakerOpen)
    return "A circuit breaker is open: recent model failures are being routed around via the degradation ladder.";
  const canary =
    args.canaryUp === null
      ? "no canary probe yet"
      : args.canaryUp
        ? "the canary is green"
        : "the last canary probe failed";
  const load =
    args.queueDepth > 0
      ? `${args.queueDepth} generation${args.queueDepth === 1 ? "" : "s"} in flight`
      : "the queue is idle";
  return `All lanes nominal: ${canary}, ${load}, ${args.finishes.toLocaleString("en-US")} answer${args.finishes === 1 ? "" : "s"} served so far.`;
}

function TraceRow({ trace, today }: { trace: TraceDoc; today: string }) {
  const failed = Boolean(trace.error);
  const refused = trace.finishReason?.startsWith("refused");
  const time = trace.finishedAt ?? trace.enqueuedAt;
  const sameDay = time?.slice(0, 10) === today;
  return (
    <tr className="group">
      <td className="py-2 pr-4 font-mono text-[11px] whitespace-nowrap text-ink-faint">
        {time ? (sameDay ? time.slice(11, 19) : `${time.slice(5, 10)} ${time.slice(11, 16)}`) : "—"}
      </td>
      <td className="py-2 pr-4 text-[13px] whitespace-nowrap text-ink">
        {failed
          ? "failed"
          : refused
            ? trace.finishReason?.replace("refused-", "refused: ").replace("_", " ")
            : (trace.modelUsed ?? trace.model ?? "—").split("/").pop()}
      </td>
      <td className="py-2 pr-4 text-right font-mono text-[11px] tabular-nums whitespace-nowrap text-ink-soft">
        {trace.ttftMs ? fmtMs(Number(trace.ttftMs)) : "—"}
      </td>
      <td className="py-2 pr-4 text-right font-mono text-[11px] tabular-nums whitespace-nowrap text-ink-soft">
        {trace.durationMs ? fmtMs(Number(trace.durationMs)) : "—"}
      </td>
      <td className="hidden py-2 pr-4 text-right font-mono text-[11px] tabular-nums whitespace-nowrap text-ink-soft sm:table-cell">
        {trace.totalTokens ? Number(trace.totalTokens).toLocaleString() : "—"}
      </td>
      <td className="hidden py-2 pr-4 text-right font-mono text-[11px] tabular-nums whitespace-nowrap text-ink-soft sm:table-cell">
        {trace.costMicros ? formatMicros(Number(trace.costMicros)) : "—"}
      </td>
      <td className="py-2 pr-4 text-center font-mono text-[11px]">
        {trace.citationsVerified === undefined ? (
          <span className="text-ink-faint">—</span>
        ) : trace.citationsVerified === "yes" ? (
          <span className="text-ink-soft" title="Citations verified against the knowledgebase">
            ✓
          </span>
        ) : (
          <span className="text-red-700" title={trace.citationsVerified}>
            ✗
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {trace.runId && (
          <Link
            href={`/ops/trace/${trace.runId}`}
            className="font-mono text-[11px] text-ink-faint transition-colors group-hover:text-accent-ink hover:text-accent-ink"
          >
            trace →
          </Link>
        )}
      </td>
    </tr>
  );
}

export default async function OpsPage() {
  const snapshot = await readOpsSnapshot();
  const c = snapshot.counters;
  const finishes = c.finishes ?? 0;
  const errors = c.errors ?? 0;
  const goodput = finishes + errors > 0 ? finishes / (finishes + errors) : null;
  const dedupHits = (c.reattaches ?? 0) + (c.singleFlightHits ?? 0);
  const refused = (c.guardOffTopic ?? 0) + (c.guardAbuse ?? 0);
  const globalBudget = Number(process.env.CHAT_TOKENS_PER_DAY_GLOBAL ?? 2_000_000);
  const tokens = c.tokens ?? 0;
  const breakerOpen = snapshot.breakers.primary || snapshot.breakers.fallback;
  const canaryUp = snapshot.canary ? snapshot.canary.status === "up" : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="pb-4">
        <div className="flex items-baseline justify-between gap-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Engine room
          </h1>
          <LiveRefresh />
        </div>
        <p className="max-w-2xl pt-3 text-sm leading-relaxed text-ink-soft">
          The serving infrastructure behind{" "}
          <Link href="/" className="u-link">
            this site&rsquo;s assistant
          </Link>
          , deliberately overengineered and left visible. Every number below is
          real and current; every answer links to its own trace.
        </p>
        <p className="pt-4 text-[15px] leading-relaxed text-ink">
          {statusSentence({
            finishes,
            canaryUp,
            breakerOpen,
            killSwitch: snapshot.killSwitch,
            queueDepth: snapshot.queueDepth,
          })}
        </p>
      </header>

      {/* The pipeline schematic: the page's centerpiece */}
      <section aria-label="Serving pipeline" className="border-t border-line-strong pt-6 pb-2">
        <div className="flex items-baseline justify-between pb-6">
          <SectionLabel>Request pipeline · all time</SectionLabel>
          <p className="font-mono text-[11px] text-ink-faint">
            {snapshot.since ? `since ${snapshot.since}` : "since launch"}
          </p>
        </div>
        <Pipeline
          stages={[
            {
              name: "Requests",
              figure: String(c.requests ?? 0),
              note: "arrived at the edge",
            },
            {
              name: "Admission",
              figure: String(c.admitted ?? 0),
              note: "rate + token budgets",
              // Shedding is the system working, not an alert; cumulative
              // sheds are expected to be nonzero forever.
              exit: (c.sheds ?? 0) > 0 ? { label: "shed", value: c.sheds } : null,
            },
            {
              name: "Cache",
              figure: String(c.cacheHits ?? 0),
              note: "answered without a model",
              exit:
                dedupHits > 0 ? { label: "dedup reattached", value: dedupHits } : null,
            },
            {
              name: "Guardrail",
              figure: String(refused),
              note: "scoped refusals",
              exit:
                (c.guardFailedOpen ?? 0) > 0
                  ? { label: "failed open", value: c.guardFailedOpen }
                  : null,
            },
            {
              name: "Generate",
              figure: String(finishes),
              note: snapshot.breakers.primary
                ? "breaker open: primary"
                : snapshot.breakers.fallback
                  ? "breaker open: fallback"
                  : "durable workflow, ladder armed",
              exit:
                (c.degradedAnswers ?? 0) > 0
                  ? { label: "degraded to raw KB", value: c.degradedAnswers }
                  : null,
              alert: breakerOpen,
            },
            {
              name: "Verify",
              figure: String(finishes - (c.citationsBroken ?? 0)),
              note: "citations resolve",
              exit:
                (c.citationsBroken ?? 0) > 0
                  ? { label: "broken citations", value: c.citationsBroken }
                  : null,
              alert: (c.citationsBroken ?? 0) > 0,
            },
          ]}
        />
      </section>

      {/* Latency distribution */}
      <section aria-label="Latency" className="border-t border-line pt-6 pb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-4">
          <SectionLabel>Time to first token</SectionLabel>
          <p className="font-mono text-[11px] tabular-nums text-ink-soft">
            p50 {fmtMs(snapshot.ttft.p50)} · p95 {fmtMs(snapshot.ttft.p95)} ·{" "}
            {snapshot.ttft.samples} samples
          </p>
        </div>
        <TtftHistogram
          samples={snapshot.ttftSamples}
          p50={snapshot.ttft.p50}
          p95={snapshot.ttft.p95}
          targetMs={TTFT_TARGET_MS}
        />
        <div className="grid grid-cols-1 gap-x-10 gap-y-4 pt-8 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between pb-2">
              <SectionLabel>Goodput</SectionLabel>
              <p className="font-mono text-[11px] tabular-nums text-ink-soft">
                {goodput === null ? "—" : `${(goodput * 100).toFixed(1)}%`} ·{" "}
                {finishes} ok / {errors} failed
              </p>
            </div>
            <Meter
              fraction={goodput ?? 0}
              label={`Goodput ${goodput === null ? "unknown" : Math.round(goodput * 100) + " percent"}`}
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between pb-2">
              <SectionLabel>Full answer</SectionLabel>
              <p className="font-mono text-[11px] tabular-nums text-ink-soft">
                p50 {fmtMs(snapshot.duration.p50)} · p95 {fmtMs(snapshot.duration.p95)}
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              End-to-end through guardrail, retrieval, generation, and
              verification, measured inside the workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Lifetime ledger: totals that stay honest through quiet weeks */}
      <section aria-label="Ledger" className="border-t border-line pt-6 pb-10">
        <div className="pb-2">
          <SectionLabel>Ledger · all time</SectionLabel>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          {finishes.toLocaleString("en-US")} answer{finishes === 1 ? "" : "s"}{" "}
          served for{" "}
          <span className="font-medium text-ink">
            {formatMicros(c.costMicros ?? 0)}
          </span>{" "}
          in model spend
          {finishes > 0 && (
            <>
              {" "}
              ({formatMicros(Math.round((c.costMicros ?? 0) / finishes))} per
              answer)
            </>
          )}
          , {tokens.toLocaleString("en-US")} tokens through the gateway,{" "}
          {(c.cacheHits ?? 0) + dedupHits} request
          {(c.cacheHits ?? 0) + dedupHits === 1 ? "" : "s"} absorbed by the
          cache and dedup layers before spending anything.
        </p>
      </section>

      {/* Recent answers */}
      <section aria-label="Recent answers" className="border-t border-line pt-6 pb-10">
        <div className="pb-2">
          <SectionLabel>Recent answers</SectionLabel>
        </div>
        {snapshot.recentTraces.length === 0 ? (
          <p className="py-4 text-sm text-ink-soft">
            Nothing traced yet today. Ask the assistant something and its trip
            through the pipeline lands here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left">
                  {["time", "outcome", "ttft", "total", "tokens", "cost", "cited", ""].map(
                    (heading, i) => (
                      <th
                        key={i}
                        className={`py-2 pr-4 font-mono text-[10px] font-normal tracking-[0.12em] text-ink-faint uppercase ${
                          i >= 2 && i <= 5 ? "text-right" : ""
                        } ${i === 4 || i === 5 ? "hidden sm:table-cell" : ""} ${i === 6 ? "text-center" : ""}`}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snapshot.recentTraces.map((trace) => (
                  <TraceRow
                    key={trace.requestId}
                    trace={trace}
                    today={new Date().toISOString().slice(0, 10)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* The register: a datasheet footer */}
      <section aria-label="Configuration register" className="border-t border-line-strong pt-6">
        <div className="pb-4">
          <SectionLabel>Register</SectionLabel>
        </div>
        <dl className="grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
          {[
            ["primary model", snapshot.modelOverride ?? CHAT_MODEL],
            ["model override", snapshot.modelOverride ? "active (flag)" : "none"],
            ["prompt hash", promptVersion()],
            ["policy hash", loadPolicy().version],
            [
              "breaker · primary",
              snapshot.breakers.primary ? "open" : "closed",
            ],
            [
              "breaker · fallback",
              snapshot.breakers.fallback ? "open" : "closed",
            ],
            [
              "eval gate",
              snapshot.evals
                ? `${snapshot.evals.passed}/${snapshot.evals.total} · ${snapshot.evals.at.slice(0, 10)}`
                : "no run recorded",
            ],
            [
              "canary",
              snapshot.canary
                ? `${snapshot.canary.status} · ${(snapshot.canary.elapsedMs / 1000).toFixed(1)}s · ${snapshot.canary.at.slice(11, 16)} UTC`
                : "no probe yet",
            ],
            [
              "daily token ceiling",
              `${snapshot.dailyBudgetUsed.toLocaleString("en-US")} / ${globalBudget.toLocaleString("en-US")} (${((snapshot.dailyBudgetUsed / globalBudget) * 100).toFixed(1)}%)`,
            ],
            ["kill switch", snapshot.killSwitch ? "engaged" : "off"],
          ].map(([term, value]) => (
            <div
              key={term}
              className="flex items-baseline justify-between gap-6 border-b border-line py-1.5"
            >
              <dt className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-ink-faint uppercase">
                {term}
              </dt>
              <dd className="min-w-0 truncate text-right font-mono text-[11px] text-ink">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="pt-8 text-xs leading-relaxed text-ink-faint">
          Counters accumulate for the site&rsquo;s lifetime; latency
          distributions cover the last 500 answers; traces are kept for seven days
          and never contain visitor message content. The architecture behind
          this page is the subject of{" "}
          <Link href="/blog" className="u-link">
            the writing
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
