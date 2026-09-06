/**
 * Inline-SVG chart primitives for the engine room. One data hue (the
 * blueprint accent) on the paper surface; text stays in ink tokens; grid
 * and axes are recessive hairlines. Server-renderable, no libraries.
 */

const ACCENT = "var(--color-accent)";
const LINE = "var(--color-line)";
const LINE_STRONG = "var(--color-line-strong)";

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

/** Rounded-top column: 4px radius at the data end, square at the baseline. */
function column(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const bottom = y + h;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${bottom}`,
    "Z",
  ].join(" ");
}

export function TtftHistogram({
  samples,
  p50,
  p95,
  targetMs,
}: {
  samples: number[];
  p50: number | null;
  p95: number | null;
  targetMs: number;
}) {
  const W = 720;
  const H = 132;
  const plotH = 96;
  const baselineY = plotH + 8;

  if (samples.length === 0) {
    return (
      <p className="border-t border-line py-6 text-sm text-ink-soft">
        No latency samples yet today. Ask the assistant something and this
        distribution starts filling in.
      </p>
    );
  }

  const domain = Math.max(targetMs * 1.4, Math.max(...samples) * 1.05);
  const BINS = 36;
  const counts = new Array<number>(BINS).fill(0);
  for (const sample of samples) {
    const bin = Math.min(BINS - 1, Math.floor((sample / domain) * BINS));
    counts[bin] += 1;
  }
  const maxCount = Math.max(...counts);
  const slot = W / BINS;
  const gap = 2;
  const barW = Math.min(24, slot - gap);

  const xOf = (ms: number) => (ms / domain) * W;

  // When p50 and p95 sit close together their labels collide; merge them
  // into one label on a single marker pair.
  const merged =
    p50 !== null && p95 !== null && Math.abs(xOf(p95) - xOf(p50)) < 72;

  const marker = (ms: number, label: string, row = 0) => (
    <g>
      <line x1={xOf(ms)} x2={xOf(ms)} y1={0} y2={baselineY} stroke={LINE_STRONG} strokeWidth={1} />
      <text
        x={Math.min(xOf(ms) + 4, W - 4)}
        y={10 + row * 12}
        textAnchor={xOf(ms) > W - 96 ? "end" : "start"}
        className="fill-ink-soft font-mono text-[10px]"
      >
        {label}
      </text>
    </g>
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Distribution of time to first token across ${samples.length} answers today`}
    >
      {/* target line first, recessive */}
      <line x1={xOf(targetMs)} x2={xOf(targetMs)} y1={0} y2={baselineY} stroke={LINE} strokeWidth={1} />
      <text
        x={Math.min(xOf(targetMs) + 4, W - 4)}
        y={baselineY - 4}
        textAnchor={xOf(targetMs) > W - 80 ? "end" : "start"}
        className="fill-ink-faint font-mono text-[10px]"
      >
        target {fmtMs(targetMs)}
      </text>
      {counts.map((count, i) => {
        if (count === 0) return null;
        const h = Math.max(2, (count / maxCount) * plotH);
        const x = i * slot + (slot - barW) / 2;
        return (
          <path key={i} d={column(x, baselineY - h, barW, h)} fill={ACCENT}>
            <title>{`${fmtMs((i / BINS) * domain)}–${fmtMs(((i + 1) / BINS) * domain)}: ${count} answer${count === 1 ? "" : "s"}`}</title>
          </path>
        );
      })}
      <line x1={0} x2={W} y1={baselineY} y2={baselineY} stroke={LINE_STRONG} strokeWidth={1} />
      {merged && p50 !== null && p95 !== null ? (
        <>
          <line x1={xOf(p50)} x2={xOf(p50)} y1={0} y2={baselineY} stroke={LINE_STRONG} strokeWidth={1} />
          {p95 !== p50 && (
            <line x1={xOf(p95)} x2={xOf(p95)} y1={0} y2={baselineY} stroke={LINE_STRONG} strokeWidth={1} />
          )}
          <text
            x={Math.min(Math.max(xOf(p95), xOf(p50)) + 4, W - 4)}
            y={10}
            textAnchor={Math.max(xOf(p95), xOf(p50)) > W - 160 ? "end" : "start"}
            className="fill-ink-soft font-mono text-[10px]"
          >
            {`p50 ${fmtMs(p50)} · p95 ${fmtMs(p95)}`}
          </text>
        </>
      ) : (
        <>
          {p50 !== null && marker(p50, `p50 ${fmtMs(p50)}`)}
          {p95 !== null && p95 !== p50 && marker(p95, `p95 ${fmtMs(p95)}`)}
        </>
      )}
      <text x={0} y={H - 2} className="fill-ink-faint font-mono text-[10px]">
        0
      </text>
      <text x={W} y={H - 2} textAnchor="end" className="fill-ink-faint font-mono text-[10px]">
        {fmtMs(domain)}
      </text>
    </svg>
  );
}

export function DayColumns({
  points,
  formatValue,
  ariaLabel,
}: {
  points: { day: string; value: number }[];
  formatValue: (value: number) => string;
  ariaLabel: string;
}) {
  const W = 336;
  const H = 120;
  const plotH = 84;
  const baselineY = plotH + 14;
  const slot = W / points.length;
  const barW = Math.min(24, slot - 8);
  const max = Math.max(...points.map((p) => p.value), 1);
  const maxIndex = points.findIndex((p) => p.value === max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={ariaLabel}>
      <line x1={0} x2={W} y1={baselineY} y2={baselineY} stroke={LINE_STRONG} strokeWidth={1} />
      {points.map((point, i) => {
        const h = point.value === 0 ? 0 : Math.max(2, (point.value / max) * plotH);
        const x = i * slot + (slot - barW) / 2;
        const isLast = i === points.length - 1;
        const labeled = point.value > 0 && (isLast || i === maxIndex);
        return (
          <g key={point.day}>
            {h > 0 && (
              <path d={column(x, baselineY - h, barW, h)} fill={ACCENT} opacity={isLast ? 1 : 0.45}>
                <title>{`${point.day}: ${formatValue(point.value)}`}</title>
              </path>
            )}
            {labeled && (
              <text
                x={x + barW / 2}
                y={baselineY - h - 4}
                textAnchor="middle"
                className="fill-ink-soft font-mono text-[10px]"
              >
                {formatValue(point.value)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - 2}
              textAnchor="middle"
              className="fill-ink-faint font-mono text-[10px]"
            >
              {new Date(`${point.day}T00:00:00Z`).toLocaleDateString("en", {
                weekday: "narrow",
                timeZone: "UTC",
              })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Error-budget style meter: accent fill on a light step of the same hue. */
export function Meter({
  fraction,
  label,
}: {
  fraction: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div aria-label={label} role="img" className="w-full">
      <div className="h-1.5 w-full rounded-full bg-accent/15">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}
