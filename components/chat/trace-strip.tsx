"use client";

import { useEffect, useState } from "react";

/**
 * The receipt under every answer: what the pipeline actually did, printed
 * where the visitor can see it. This is the enterprise pitch made ambient —
 * latency, model, retrieval, verification, and cost per answer, each
 * linking into the engine room.
 */

type Summary = {
  runId: string;
  ttftMs: number | null;
  durationMs: number | null;
  model: string | null;
  totalTokens: number | null;
  costMicros: number;
  retrievalMode: string | null;
  chunkCount: number;
  citationsVerified: boolean | null;
  finishReason: string | null;
};

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function fmtCost(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(5)}`;
}

const summaryCache = new Map<string, Summary>();

export function TraceStrip({ runId }: { runId: string }) {
  const [summary, setSummary] = useState<Summary | null>(
    () => summaryCache.get(runId) ?? null,
  );

  useEffect(() => {
    if (summaryCache.has(runId)) return;
    let cancelled = false;
    // The finalize step writes trace fields moments after the stream ends;
    // retry briefly so the strip fills in as soon as they land.
    async function load(attempt: number) {
      try {
        const res = await fetch(`/api/chat/${runId}/trace`);
        if (res.ok) {
          const data = (await res.json()) as Summary;
          if (data.durationMs !== null || attempt >= 3) {
            summaryCache.set(runId, data);
            if (!cancelled) setSummary(data);
            return;
          }
        }
      } catch {
        // fall through to retry
      }
      if (!cancelled && attempt < 3) setTimeout(() => load(attempt + 1), 1500);
    }
    load(0);
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const href = `/ops/trace/${runId}`;

  if (runId === "cache") {
    return (
      <p className="pt-1.5 font-mono text-[10px] leading-relaxed tracking-wide text-ink-faint">
        semantic cache · no model call · $0
      </p>
    );
  }

  if (!summary) {
    return (
      <p className="pt-1.5 font-mono text-[10px] tracking-wide text-ink-faint">
        tracing…
      </p>
    );
  }

  const refused = summary.finishReason?.startsWith("refused");
  const parts: string[] = [];
  if (refused) {
    parts.push("guardrail refusal", "no model call");
  } else {
    if (summary.ttftMs) parts.push(`${fmtMs(summary.ttftMs)} to first token`);
    if (summary.model) parts.push(summary.model);
    if (summary.retrievalMode === "hybrid" && summary.chunkCount > 0)
      parts.push(`${summary.chunkCount} passages retrieved`);
    if (summary.citationsVerified !== null)
      parts.push(summary.citationsVerified ? "citations verified" : "citation check failed");
    if (summary.costMicros > 0) parts.push(fmtCost(summary.costMicros));
  }

  return (
    <p className="pt-1.5 font-mono text-[10px] leading-relaxed tracking-wide text-ink-faint">
      {parts.join(" · ")}
      {parts.length > 0 && " · "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ink-soft underline decoration-line underline-offset-2 transition-colors hover:text-accent-ink hover:decoration-current"
      >
        full trace →
      </a>
    </p>
  );
}
