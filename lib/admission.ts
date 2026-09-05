import { Ratelimit } from "@upstash/ratelimit";
import { createHash } from "crypto";
import { redis } from "./redis";

/**
 * Admission control for the public chat endpoint, per the playbook's
 * reliability domain: dual budgets (requests AND tokens), a global daily
 * ceiling as the spend proxy, and a kill switch — all before anything
 * reaches the model.
 */

const RPM_LIMIT = Number(process.env.CHAT_RPM ?? 8);
const IP_TOKENS_PER_DAY = Number(process.env.CHAT_TOKENS_PER_DAY_IP ?? 50_000);
const GLOBAL_TOKENS_PER_DAY = Number(
  process.env.CHAT_TOKENS_PER_DAY_GLOBAL ?? 2_000_000,
);

export const KILL_SWITCH_KEY = "flags:chat:disabled";

const requestLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RPM_LIMIT, "1 m"),
  prefix: "rl:rpm",
});

/** Stable short identifier for a caller; never log raw IPs. */
export function callerId(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export type AdmissionVerdict =
  | { ok: true }
  | {
      ok: false;
      status: 429 | 503;
      reason: "kill-switch" | "rpm" | "ip-token-budget" | "global-token-budget";
      retryAfterSeconds: number;
      message: string;
    };

/**
 * Decide whether to admit a request that may consume up to `estimatedTokens`.
 * Token budgets are charged optimistically here; call settleTokenBudgets()
 * with actual usage afterwards to correct the estimate.
 */
export async function admit(
  caller: string,
  estimatedTokens: number,
): Promise<AdmissionVerdict> {
  const day = dayKey();
  const ipKey = `budget:tokens:ip:${caller}:${day}`;
  const globalKey = `budget:tokens:global:${day}`;

  const [disabled, ipUsed, globalUsed] = await Promise.all([
    redis.get<string | number>(KILL_SWITCH_KEY),
    redis.get<number>(ipKey),
    redis.get<number>(globalKey),
  ]);

  if (disabled) {
    return {
      ok: false,
      status: 503,
      reason: "kill-switch",
      retryAfterSeconds: 3600,
      message:
        "The assistant is switched off right now. The rest of the site still works, and you can reach Joshua through the links below.",
    };
  }

  if ((globalUsed ?? 0) + estimatedTokens > GLOBAL_TOKENS_PER_DAY) {
    return {
      ok: false,
      status: 503,
      reason: "global-token-budget",
      retryAfterSeconds: secondsUntilUtcMidnight(),
      message:
        "The assistant has hit its daily budget. It resets at midnight UTC.",
    };
  }

  if ((ipUsed ?? 0) + estimatedTokens > IP_TOKENS_PER_DAY) {
    return {
      ok: false,
      status: 429,
      reason: "ip-token-budget",
      retryAfterSeconds: secondsUntilUtcMidnight(),
      message:
        "You have hit today's usage budget for the assistant. It resets at midnight UTC.",
    };
  }

  const rpm = await requestLimiter.limit(caller);
  if (!rpm.success) {
    return {
      ok: false,
      status: 429,
      reason: "rpm",
      retryAfterSeconds: Math.max(1, Math.ceil((rpm.reset - Date.now()) / 1000)),
      message: "Too many messages at once. Give it a few seconds and try again.",
    };
  }

  await chargeTokens(caller, estimatedTokens);
  return { ok: true };
}

async function chargeTokens(caller: string, amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount === 0) return;
  const day = dayKey();
  const pipeline = redis.pipeline();
  pipeline.incrby(`budget:tokens:ip:${caller}:${day}`, Math.round(amount));
  pipeline.expire(`budget:tokens:ip:${caller}:${day}`, 60 * 60 * 48);
  pipeline.incrby(`budget:tokens:global:${day}`, Math.round(amount));
  pipeline.expire(`budget:tokens:global:${day}`, 60 * 60 * 48);
  await pipeline.exec();
}

/** Correct the optimistic charge once real usage is known. */
export async function settleTokenBudgets(
  caller: string,
  estimatedTokens: number,
  actualTokens: number,
): Promise<void> {
  await chargeTokens(caller, actualTokens - estimatedTokens);
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(60, Math.ceil((midnight - now.getTime()) / 1000));
}
