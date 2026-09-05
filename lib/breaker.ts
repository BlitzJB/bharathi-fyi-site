import { redis } from "./redis";

/**
 * Circuit breaker with Redis-shared state: one serverless instance's
 * discovery of a dead model protects the whole fleet. Failure counts live
 * in a rolling window; past the threshold the breaker opens and callers
 * skip straight to the next rung of the degradation ladder. The open state
 * expires on its own, which acts as the half-open probe: the first request
 * after expiry tries the model for real.
 */

const FAILURE_THRESHOLD = Number(process.env.BREAKER_FAILURES ?? 3);
const WINDOW_SECONDS = 60;
const OPEN_SECONDS = Number(process.env.BREAKER_OPEN_SECONDS ?? 60);

function failKey(target: string) {
  return `breaker:${target}:failures`;
}
function openKey(target: string) {
  return `breaker:${target}:open`;
}

export async function breakerOpen(target: string): Promise<boolean> {
  return Boolean(await redis.get(openKey(target)));
}

export async function recordFailure(target: string): Promise<void> {
  const key = failKey(target);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, WINDOW_SECONDS);
  const results = await pipeline.exec<[number, number]>();
  const failures = results[0];
  if (failures >= FAILURE_THRESHOLD) {
    await redis.set(openKey(target), "1", { ex: OPEN_SECONDS });
  }
}

export async function recordSuccess(target: string): Promise<void> {
  await redis.del(failKey(target), openKey(target));
}
