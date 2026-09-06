/**
 * Span waterfall for a single answer: each pipeline stage as a bar on a
 * shared time axis, gaps left visible (they are workflow dispatch overhead
 * and that is worth seeing). Accent hue carries the marks; text stays in
 * ink tokens.
 */

export type Span = {
  name: string;
  startMs: number;
  endMs: number;
  note?: string;
  /** "overhead" spans (workflow dispatch) render muted; work is accent. */
  kind?: "work" | "overhead";
};

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

export function Waterfall({
  spans,
  totalMs,
  ttftMs,
}: {
  spans: Span[];
  totalMs: number;
  ttftMs: number | null;
}) {
  const domain = Math.max(totalMs, ...spans.map((s) => s.endMs), 1);
  const pct = (ms: number) => `${Math.max(0, Math.min(100, (ms / domain) * 100))}%`;

  const ROW = "2.75rem";

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-4 sm:grid-cols-[9rem_1fr]">
      {/* labels */}
      <div>
        {spans.map((span) => (
          <div key={span.name} style={{ height: ROW }}>
            <p className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
              {span.name}
            </p>
            {span.note && (
              <p className="truncate pt-0.5 text-[11px] leading-snug text-ink-faint">
                {span.note}
              </p>
            )}
          </div>
        ))}
      </div>
      {/* bars share one coordinate space so the marker lines up */}
      <div className="relative">
        {ttftMs !== null && (
          <div
            aria-hidden
            className="absolute top-0 bottom-6 w-px bg-line-strong"
            style={{ left: pct(ttftMs) }}
          />
        )}
        {spans.map((span, i) => {
          const width = span.endMs - span.startMs;
          const overhead = span.kind === "overhead";
          return (
            <div key={`${span.name}-${i}`} className="relative" style={{ height: ROW }}>
              <div
                className={`absolute top-1 rounded-[2px] ${overhead ? "h-2 translate-y-0.5 bg-line-strong" : "h-3 bg-accent"}`}
                style={{
                  left: pct(span.startMs),
                  width: `max(2px, ${pct(width)})`,
                }}
                title={`${span.name}: ${fmtMs(span.startMs)} → ${fmtMs(span.endMs)}`}
              />
              <span
                className={`absolute top-0.5 font-mono text-[10px] tabular-nums whitespace-nowrap ${overhead ? "text-ink-faint" : "text-ink-soft"}`}
                style={
                  span.endMs / domain > 0.82
                    ? { right: `calc(${pct(domain - span.startMs)} + 6px)` }
                    : { left: `calc(${pct(span.endMs)} + 6px)` }
                }
              >
                {fmtMs(width)}
              </span>
            </div>
          );
        })}
        <div className="relative border-t border-line-strong pt-1">
          <span className="font-mono text-[10px] text-ink-faint">0</span>
          {ttftMs !== null && (
            <span
              className="absolute top-1 font-mono text-[10px] whitespace-nowrap text-ink-soft"
              style={
                ttftMs / domain > 0.75
                  ? { right: `calc(${pct(domain - ttftMs)} + 4px)` }
                  : { left: pct(ttftMs), transform: "translateX(4px)" }
              }
            >
              first token {fmtMs(ttftMs)}
            </span>
          )}
          <span className="absolute top-1 right-0 font-mono text-[10px] text-ink-faint">
            {fmtMs(domain)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Horizontal score bars for retrieved chunks. */
export function ChunkScores({
  chunks,
}: {
  chunks: { id: string; score: number }[];
}) {
  const max = Math.max(...chunks.map((c) => c.score), 0.0001);
  return (
    <ol className="space-y-2">
      {chunks.map((chunk) => (
        <li
          key={chunk.id}
          className="grid grid-cols-[11rem_1fr_3.5rem] items-center gap-3 sm:grid-cols-[14rem_1fr_3.5rem]"
        >
          <span className="truncate font-mono text-[11px] text-ink">
            {chunk.id}
          </span>
          <span className="h-1.5 rounded-full bg-accent/15">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${(chunk.score / max) * 100}%` }}
            />
          </span>
          <span className="text-right font-mono text-[10px] tabular-nums text-ink-faint">
            {chunk.score.toFixed(4)}
          </span>
        </li>
      ))}
    </ol>
  );
}
