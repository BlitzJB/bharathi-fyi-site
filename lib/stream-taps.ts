import type { UIMessageChunk } from "ai";

/**
 * Holds back model error chunks: when a ladder rung fails, the agent writes
 * an error part into the durable stream, but a later rung usually recovers
 * and keeps streaming. An error is only real if nothing follows it — so
 * buffer it, drop it when more content arrives, and emit it at close if it
 * really was the end.
 */
export function createErrorHoldback(): TransformStream<
  UIMessageChunk,
  UIMessageChunk
> {
  let pendingError: UIMessageChunk | null = null;
  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type === "error") {
        pendingError = chunk;
        return;
      }
      if (pendingError) {
        if (chunk.type === "finish") {
          // Nothing recovered: the error really was the end.
          controller.enqueue(pendingError);
          pendingError = null;
        } else if (chunk.type !== "finish-step") {
          // A later rung is answering; swallow the error. (finish-step
          // belongs to the failed rung, so it keeps the error pending.)
          pendingError = null;
        }
      }
      controller.enqueue(chunk);
    },
    flush(controller) {
      if (pendingError) controller.enqueue(pendingError);
    },
  });
}
