import { redis } from "./redis";

/**
 * Redis-backed metrics and per-answer traces feeding the public /ops page.
 * Aggregates live in a per-day hash; latency samples in capped lists; each
 * answer gets a trace hash keyed by requestId with a runId alias.
 */

const TRACE_TTL = 60 * 60 * 24 * 7;
const SAMPLE_CAP = 500;
const RECENT_CAP = 40;

// All-time aggregates: this site is low-traffic by nature, so cumulative
// numbers tell the story and quiet weeks stay honest.
const ALL_KEY = "metrics:all";
const SINCE_KEY = "metrics:since";

export function metricsDay(offset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export type CounterField =
  | "requests"
  | "admitted"
  | "sheds"
  | "reattaches"
  | "singleFlightHits"
  | "finishes"
  | "errors"
  | "resumes"
  | "cacheHits"
  | "guardOffTopic"
  | "guardAbuse"
  | "guardFailedOpen"
  | "degradedAnswers"
  | "citationsBroken";

export async function bumpCounter(
  field: CounterField,
  by = 1,
): Promise<void> {
  await redis.hincrby(ALL_KEY, field, by);
}

export async function recordSample(
  kind: "ttft" | "duration",
  ms: number,
): Promise<void> {
  const key = `metrics:${kind}:all`;
  const pipeline = redis.pipeline();
  pipeline.lpush(key, Math.round(ms));
  pipeline.ltrim(key, 0, SAMPLE_CAP - 1);
  await pipeline.exec();
}

export async function recordTokens(total: number): Promise<void> {
  await redis.hincrby(ALL_KEY, "tokens", Math.round(total));
}

export async function recordCost(micros: number): Promise<void> {
  if (!micros) return;
  await redis.hincrby(ALL_KEY, "costMicros", Math.round(micros));
}

/** Merge fields into an answer's trace and index it for /ops. */
export async function traceWrite(
  requestId: string,
  fields: Record<string, string | number>,
): Promise<void> {
  const key = `trace:${requestId}`;
  const pipeline = redis.pipeline();
  pipeline.hset(key, fields);
  pipeline.expire(key, TRACE_TTL);
  await pipeline.exec();
}

export async function traceIndex(
  requestId: string,
  runId: string,
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(`trace:alias:${runId}`, requestId, { ex: TRACE_TTL });
  pipeline.lpush(`traces:recent`, `${requestId}:${runId}`);
  pipeline.ltrim(`traces:recent`, 0, RECENT_CAP - 1);
  await pipeline.exec();
}

export type TraceDoc = Record<string, string>;

export async function readTrace(id: string): Promise<TraceDoc | null> {
  // Accept either a requestId or a workflow run id.
  let requestId = id;
  if (id.startsWith("wrun_")) {
    const alias = await redis.get<string>(`trace:alias:${id}`);
    if (!alias) return null;
    requestId = alias;
  }
  const doc = await redis.hgetall<TraceDoc>(`trace:${requestId}`);
  return doc && Object.keys(doc).length > 0 ? doc : null;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

export type OpsSnapshot = {
  /** ISO date the all-time counters started accumulating. */
  since: string | null;
  counters: Record<string, number>;
  ttft: { p50: number | null; p95: number | null; samples: number };
  duration: { p50: number | null; p95: number | null; samples: number };
  queueDepth: number;
  recent: { requestId: string; runId: string }[];
  recentTraces: TraceDoc[];
  killSwitch: boolean;
  modelOverride: string | null;
  breakers: { primary: boolean; fallback: boolean };
  evals: { passed: number; total: number; rate: number; at: string } | null;
  canary: { status: string; elapsedMs: number; at: string } | null;
  /** Raw millisecond samples for distribution rendering, unsorted. */
  ttftSamples: number[];
  /** Tokens charged against today's global admission budget. */
  dailyBudgetUsed: number;
};

export async function readOpsSnapshot(): Promise<OpsSnapshot> {
  const [
    counters,
    ttftRaw,
    durationRaw,
    depth,
    recentRaw,
    killSwitch,
    evalsRaw,
    canaryRaw,
    override,
    breakerPrimary,
    breakerFallback,
    since,
    dailyBudgetUsed,
  ] = await Promise.all([
    redis.hgetall<Record<string, string>>(ALL_KEY),
    redis.lrange(`metrics:ttft:all`, 0, SAMPLE_CAP - 1),
    redis.lrange(`metrics:duration:all`, 0, SAMPLE_CAP - 1),
    redis.get<number>("queue:active-runs"),
    redis.lrange("traces:recent", 0, 11),
    redis.get<string | number>("flags:chat:disabled"),
    redis.get<OpsSnapshot["evals"]>("evals:latest"),
    redis.get<OpsSnapshot["canary"]>("canary:latest"),
    redis.get<string>("flags:chat:model"),
    redis.get<string>("breaker:primary:open"),
    redis.get<string>("breaker:fallback:open"),
    redis.get<string>(SINCE_KEY),
    redis.get<number>(`budget:tokens:global:${metricsDay()}`),
  ]);

  const recent = (recentRaw ?? []).map((entry) => {
    const [requestId, runId] = String(entry).split(":");
    return { requestId, runId };
  });
  const recentTraces = (
    await Promise.all(
      recent.slice(0, 10).map((r) => redis.hgetall<TraceDoc>(`trace:${r.requestId}`)),
    )
  ).filter((t): t is TraceDoc => Boolean(t && Object.keys(t).length > 0));

  const toSorted = (raw: unknown[]) =>
    raw.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const ttft = toSorted(ttftRaw ?? []);
  const duration = toSorted(durationRaw ?? []);

  const parsedCounters: Record<string, number> = {};
  for (const [k, v] of Object.entries(counters ?? {})) {
    parsedCounters[k] = Number(v) || 0;
  }

  return {
    since: since ?? null,
    counters: parsedCounters,
    ttft: {
      p50: percentile(ttft, 50),
      p95: percentile(ttft, 95),
      samples: ttft.length,
    },
    duration: {
      p50: percentile(duration, 50),
      p95: percentile(duration, 95),
      samples: duration.length,
    },
    queueDepth: Math.max(0, Number(depth) || 0),
    recent,
    recentTraces,
    killSwitch: Boolean(killSwitch),
    modelOverride: override ?? null,
    breakers: {
      primary: Boolean(breakerPrimary),
      fallback: Boolean(breakerFallback),
    },
    evals: evalsRaw ?? null,
    canary: canaryRaw ?? null,
    ttftSamples: (ttftRaw ?? []).map(Number).filter(Number.isFinite),
    dailyBudgetUsed: Math.max(0, Number(dailyBudgetUsed) || 0),
  };
}
