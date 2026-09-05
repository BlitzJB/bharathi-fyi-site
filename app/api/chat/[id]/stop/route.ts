import { getRun } from "workflow/api";
import { releaseRunSlot } from "@/lib/admission";
import { log } from "@/lib/log";
import { redis } from "@/lib/redis";

/**
 * Cancellation propagation: the client's stop button aborts its fetch, and
 * this endpoint cancels the workflow run behind it so the generation stops
 * consuming tokens server-side too.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let runId = id;
  if (!id.startsWith("wrun_")) {
    const mapped = await redis.get<string>(`chat:${id}:run`);
    if (!mapped) return new Response(null, { status: 204 });
    runId = mapped;
  }

  try {
    await getRun(runId).cancel();
    await releaseRunSlot();
    log("chat.cancelled", { runId });
    return Response.json({ cancelled: runId });
  } catch {
    return new Response(null, { status: 204 });
  }
}
