import { createUIMessageStreamResponse } from "ai";
import { getRun } from "workflow/api";
import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { log } from "@/lib/log";
import { bumpCounter } from "@/lib/metrics";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

/**
 * Reconnect endpoint for resumable streams. `id` is either a workflow run id
 * (mid-stream retry by the transport) or a chat id (page reload, where the
 * client no longer knows the run id) — chat ids are mapped to their latest
 * run in Redis. `startIndex` is the count of UI chunks the client already
 * has; the transform replays the durable stream and skips past them.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const startIndexParam = searchParams.get("startIndex");
  const uiStartIndex = Math.max(0, Number(startIndexParam ?? 0) || 0);

  let runId = id;
  if (!id.startsWith("wrun_")) {
    const mapped = await redis.get<string>(`chat:${id}:run`);
    if (!mapped) return new Response(null, { status: 204 });
    runId = mapped;
  }

  try {
    const run = getRun(runId);
    log("chat.resume", { runId, uiStartIndex });
    await bumpCounter("resumes");
    return createUIMessageStreamResponse({
      stream: run.readable.pipeThrough(
        createModelCallToUIChunkTransform({ uiStartIndex }),
      ),
      headers: { "x-workflow-run-id": runId },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
