import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import type { LanguageModel } from "ai";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";

/**
 * Fault injection at the model layer, playbook-style chaos engineering:
 * CHAOS_PRIMARY / CHAOS_FALLBACK / CHAOS_SAFETY select a failure mode per
 * ladder target, letting the chaos suite prove breakers, the degradation
 * ladder, and partial-response behavior without spending a single token.
 *
 * Modes: "fail" (throws like a 429), "truncate" (streams then dies
 * mid-answer), "slow" (long first-token delay, then answers), "ok"
 * (healthy canned answer with a real citation).
 */

export type ChaosMode = "fail" | "truncate" | "slow" | "ok";

/** Raw chaos mode for a ladder target (read inside steps only). */
export function chaosMode(
  target: "primary" | "fallback" | "safety",
): ChaosMode | null {
  const value = envFor(target);
  return value ? (value as ChaosMode) : null;
}

export const CHAOS_HEALTHY_TEXT =
  "Bharathi is a Software Development Engineer at Motorq with a platform engineering background. He designed the Event Queue Abstraction layer there. [cite:profile/experience]";

const HEALTHY_TEXT =
  "Bharathi is a Software Development Engineer at Motorq with a platform engineering background. [cite:profile/experience]";

function envFor(target: "primary" | "fallback" | "safety"): string | undefined {
  const map = {
    primary: process.env.CHAOS_PRIMARY,
    fallback: process.env.CHAOS_FALLBACK,
    safety: process.env.CHAOS_SAFETY,
  } as const;
  return map[target];
}

function healthyStream(delayInMs: number) {
  // Unique part id per stream: two rungs writing the same id into one run
  // stream would collide.
  const id = `chaos-${Math.random().toString(36).slice(2, 8)}`;
  return {
    stream: simulateReadableStream<LanguageModelV4StreamPart>({
      chunkDelayInMs: 5,
      initialDelayInMs: delayInMs,
      chunks: [
        { type: "stream-start" as const, warnings: [] },
        { type: "text-start" as const, id },
        ...HEALTHY_TEXT.split(/(?<=\s)/).map((delta) => ({
          type: "text-delta" as const,
          id,
          delta,
        })),
        { type: "text-end" as const, id },
        {
          type: "finish" as const,
          finishReason: { unified: "stop" as const, raw: "stop" },
          usage: {
            inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 25, text: 25, reasoning: 0 },
          },
        },
      ],
    }),
  };
}

function truncatedStream() {
  const id = `chaos-${Math.random().toString(36).slice(2, 8)}`;
  return {
    stream: simulateReadableStream<LanguageModelV4StreamPart>({
      chunkDelayInMs: 5,
      chunks: [
        { type: "stream-start" as const, warnings: [] },
        { type: "text-start" as const, id },
        { type: "text-delta" as const, id, delta: "Bharathi is " },
        { type: "text-delta" as const, id, delta: "a Software " },
        // Plain string: an Error instance would fail workflow serialization.
        { type: "error" as const, error: "chaos: stream truncated mid-answer" },
      ],
    }),
  };
}

export function chaosModelFor(
  target: "primary" | "fallback" | "safety",
): LanguageModel | null {
  const mode = envFor(target);
  if (!mode) return null;
  return new MockLanguageModelV4({
    provider: "chaos",
    modelId: `chaos-${target}-${mode}`,
    doStream: async () => {
      switch (mode as ChaosMode) {
        case "fail":
          throw Object.assign(
            new Error("chaos: simulated provider rate limit (429)"),
            { statusCode: 429, isRetryable: false },
          );
        case "truncate":
          return truncatedStream();
        case "slow":
          return healthyStream(8000);
        default:
          return healthyStream(0);
      }
    },
  });
}
