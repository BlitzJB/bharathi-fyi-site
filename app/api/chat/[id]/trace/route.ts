import { readTrace } from "@/lib/metrics";

/**
 * Compact trace summary for the in-chat trace strip: the highlights of an
 * answer's trip through the pipeline, safe to show the visitor who asked.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const trace = await readTrace(id);
  if (!trace) return new Response(null, { status: 404 });

  let chunkCount = 0;
  try {
    const raw = trace.retrievedChunks as unknown;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) chunkCount = parsed.length;
  } catch {
    // leave at zero
  }

  return Response.json(
    {
      runId: trace.runId ?? id,
      ttftMs: Number(trace.ttftMs) || null,
      durationMs: Number(trace.durationMs) || null,
      model: (trace.modelUsed ?? trace.model ?? "").split("/").pop() || null,
      totalTokens: Number(trace.totalTokens) || null,
      costMicros: Number(trace.costMicros) || 0,
      guardCategory: trace.guardCategory ?? null,
      retrievalMode: trace.retrievalMode ?? null,
      chunkCount,
      citationsVerified:
        trace.citationsVerified === undefined
          ? null
          : trace.citationsVerified === "yes",
      finishReason: trace.finishReason ?? null,
    },
    { headers: { "cache-control": "private, max-age=300" } },
  );
}
