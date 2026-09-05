/**
 * Per-token prices in USD, from the AI Gateway models endpoint
 * (checked 2026-09-06). Used to stamp real cost on traces and /ops.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "zai/glm-5.3-flash": { input: 0.15e-6, output: 0.5e-6 },
  "openai/gpt-oss-120b": { input: 0.1e-6, output: 0.5e-6 },
  "openai/gpt-oss-safeguard-20b": { input: 0.07e-6, output: 0.2e-6 },
};

/** Cost in micro-dollars (integer) for a call; 0 when the model is unknown. */
export function costMicros(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = PRICES[model];
  if (!price) return 0;
  return Math.round(
    (inputTokens * price.input + outputTokens * price.output) * 1_000_000,
  );
}

export function formatMicros(micros: number): string {
  if (micros === 0) return "$0";
  if (micros < 10_000) return `$${(micros / 1_000_000).toFixed(5)}`;
  return `$${(micros / 1_000_000).toFixed(2)}`;
}
