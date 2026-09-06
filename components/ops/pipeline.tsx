/**
 * The serving pipeline as a schematic: a request travels left to right,
 * exits drop below the line. This is the page's hero image, drawn in the
 * site's hairline language rather than a chart library.
 */

type Stage = {
  name: string;
  figure: string;
  note?: string;
  exit?: { label: string; value: number } | null;
  alert?: boolean;
};

function StageNode({ stage, last }: { stage: Stage; last: boolean }) {
  return (
    <li className="relative flex-1">
      <div className="flex items-start">
        <div className="w-full max-w-[7.5rem] shrink-0 sm:w-auto">
          <p className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
            {stage.name}
          </p>
          <p
            className={`pt-1 font-display text-xl font-semibold tracking-tight tabular-nums ${stage.alert ? "text-red-700" : "text-ink"}`}
          >
            {stage.figure}
          </p>
          {stage.note && (
            <p className="pt-0.5 text-[11px] leading-snug text-ink-faint">{stage.note}</p>
          )}
          {stage.exit && (
            <p className="mt-2 border-t border-line pt-1.5 font-mono text-[10px] tracking-wide text-ink-faint">
              ↳ {stage.exit.value} {stage.exit.label}
            </p>
          )}
        </div>
        {!last && (
          <span
            aria-hidden
            className="mx-2 mt-[2.05rem] hidden h-px min-w-4 flex-1 bg-line-strong sm:block"
          />
        )}
      </div>
    </li>
  );
}

export function Pipeline({ stages }: { stages: Stage[] }) {
  return (
    <ol className="grid grid-cols-2 gap-x-6 gap-y-8 sm:flex sm:items-start sm:gap-0">
      {stages.map((stage, i) => (
        <StageNode key={stage.name} stage={stage} last={i === stages.length - 1} />
      ))}
    </ol>
  );
}
