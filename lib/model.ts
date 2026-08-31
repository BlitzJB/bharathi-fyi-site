// The paid model that always anchors the chain. Nothing less capable than
// this can ever serve a request.
const PAID_MODEL = process.env.CHAT_MODEL ?? "zai/glm-5.3-flash";

// A free model qualifies only if it is the "-free" variant of a base model
// whose paid output price clears this bar (USD per million tokens). That
// filters for genuinely capable models being served free for a while, and
// excludes small models (and per-request-priced media models) that happen
// to report zero token pricing.
const MIN_BASE_OUTPUT_PER_MTOK = Number(
  process.env.FREE_MODEL_MIN_OUTPUT ?? 1,
);

const MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";
const MAX_FREE_CANDIDATES = 2;

type GatewayModel = {
  id: string;
  pricing?: { input?: string | number; output?: string | number } | null;
};

export type ResolvedModels = {
  /** Model that serves the request. */
  primary: string;
  /** Gateway-enforced fallbacks, tried in order if the primary fails. */
  fallbacks: string[];
};

let cache: { value: ResolvedModels; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function resolveChatModels(): Promise<ResolvedModels> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let resolved: ResolvedModels = { primary: PAID_MODEL, fallbacks: [] };

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(MODELS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const { data } = (await res.json()) as { data: GatewayModel[] };
        const byId = new Map(data.map((m) => [m.id, m]));

        const outputPerMTok = (id: string): number | null => {
          const pricing = byId.get(id)?.pricing;
          if (pricing?.output == null) return null;
          return Number(pricing.output) * 1_000_000;
        };
        const baseOf = (id: string) => id.slice(0, -"-free".length);

        const smartFree = data
          .filter((m) => {
            if (!m.id.endsWith("-free") || !m.pricing) return false;
            const isFree =
              Number(m.pricing.input ?? -1) === 0 &&
              Number(m.pricing.output ?? -1) === 0;
            if (!isFree) return false;
            const basePrice = outputPerMTok(baseOf(m.id));
            return basePrice !== null && basePrice >= MIN_BASE_OUTPUT_PER_MTOK;
          })
          .sort((a, b) => {
            const priceDiff =
              (outputPerMTok(baseOf(b.id)) ?? 0) -
              (outputPerMTok(baseOf(a.id)) ?? 0);
            // Tie-break toward the newer model name (e.g. m3 over m2.7).
            return priceDiff !== 0 ? priceDiff : b.id.localeCompare(a.id);
          })
          .slice(0, MAX_FREE_CANDIDATES)
          .map((m) => m.id);

        if (smartFree.length > 0) {
          resolved = {
            primary: smartFree[0],
            fallbacks: [...smartFree.slice(1), PAID_MODEL],
          };
        }
      }
    } catch {
      // Listing unavailable: serve straight from the paid model.
    }
  }

  cache = { value: resolved, at: Date.now() };
  return resolved;
}
