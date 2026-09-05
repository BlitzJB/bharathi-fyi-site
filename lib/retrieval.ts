import { Index, QueryMode } from "@upstash/vector";
import { getKnowledge } from "./knowledge";

/**
 * Hybrid retrieval over the OKF knowledgebase (Upstash Vector: dense
 * text-embedding-3-small + BM25, fused server-side). The whole KB fits in
 * context, which is exactly why doing retrieval properly here is part of
 * the exhibit; full-context remains the documented fallback if the vector
 * store is unreachable.
 */

const TOP_K = 6;
const CACHE_NAMESPACE = "cache";
// Calibrated against text-embedding-3-small: true paraphrases of the same
// question score 0.87-0.89, unrelated questions ~0.67.
const CACHE_SIMILARITY_THRESHOLD = Number(
  process.env.SEMANTIC_CACHE_THRESHOLD ?? 0.85,
);
const CACHE_TTL_HINT_MS = 1000 * 60 * 60 * 24 * 3;

type ChunkMeta = {
  conceptId: string;
  title: string;
  heading: string;
  status: string;
};

export type RetrievedChunk = {
  id: string;
  score: number;
  conceptId: string;
  heading: string;
  text: string;
};

function index() {
  return Index.fromEnv();
}

export async function retrieveChunks(
  question: string,
): Promise<RetrievedChunk[] | null> {
  try {
    const hits = await index().query<ChunkMeta>({
      data: question,
      topK: TOP_K,
      includeMetadata: true,
      includeData: true,
    });
    return hits.map((hit) => ({
      id: String(hit.id),
      score: hit.score,
      conceptId: hit.metadata?.conceptId ?? String(hit.id).split("#")[0],
      heading: hit.metadata?.heading ?? "",
      text: hit.data ?? "",
    }));
  } catch {
    return null;
  }
}

/** Focused system-prompt knowledge block from retrieved chunks. */
export function knowledgeFromChunks(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk) =>
        `### From concept "${chunk.conceptId}" (cite as [cite:${chunk.conceptId}])\n${chunk.text}`,
    )
    .join("\n\n---\n\n");
}

/** Full-context fallback for when the vector store is unreachable. */
export function fullKnowledge(): string {
  return getKnowledge();
}

/**
 * Raw KB search for the last rung of the degradation ladder: when every
 * model is down, answer with the matching passages themselves.
 */
export function rawSearchAnswer(chunks: RetrievedChunk[]): string {
  const top = chunks.slice(0, 3);
  const passages = top
    .map(
      (chunk) =>
        `**${chunk.heading || chunk.conceptId}** [cite:${chunk.conceptId}]\n${chunk.text.split("\n\n").slice(0, 2).join("\n\n")}`,
    )
    .join("\n\n");
  return `The model is unavailable right now, so here is what the knowledgebase itself says:\n\n${passages}`;
}

/** Semantic cache over opening questions, in its own vector namespace. */
export async function cacheLookup(
  question: string,
): Promise<{ answer: string; score: number } | null> {
  try {
    const hits = await index()
      .namespace(CACHE_NAMESPACE)
      .query<{ answer: string; ts: number }>({
        data: question,
        topK: 1,
        includeMetadata: true,
        queryMode: QueryMode.DENSE,
      });
    const hit = hits[0];
    if (
      hit &&
      hit.score >= CACHE_SIMILARITY_THRESHOLD &&
      hit.metadata?.answer &&
      Date.now() - (hit.metadata.ts ?? 0) < CACHE_TTL_HINT_MS
    ) {
      return { answer: hit.metadata.answer, score: hit.score };
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheStore(
  question: string,
  answer: string,
): Promise<void> {
  try {
    await index()
      .namespace(CACHE_NAMESPACE)
      .upsert([
        {
          id: question.trim().toLowerCase().slice(0, 200),
          data: question,
          metadata: { answer: answer.slice(0, 8000), ts: Date.now() },
        },
      ]);
  } catch {
    // cache is best-effort
  }
}
