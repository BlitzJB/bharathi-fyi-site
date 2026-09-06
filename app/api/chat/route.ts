import { randomUUID, createHash } from "crypto";
import {
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { start, getRun } from "workflow/api";
import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { z } from "zod";
import { chatWorkflow } from "@/workflows/chat";
import {
  acquireRunSlot,
  admit,
  callerId,
  releaseRunSlot,
} from "@/lib/admission";
import { log } from "@/lib/log";
import { cacheLookup } from "@/lib/retrieval";
import { createErrorHoldback } from "@/lib/stream-taps";
import {
  bumpCounter,
  recordSample,
  traceIndex,
  traceWrite,
} from "@/lib/metrics";
import { promptVersion } from "@/lib/knowledge";
import { CHAT_MODEL } from "@/lib/model";
import { redis } from "@/lib/redis";

export const maxDuration = 300;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_TOKENS = 1024;

const bodySchema = z.object({
  id: z.string().max(128).optional(),
  messageId: z.string().max(128).optional(),
  trigger: z.string().max(64).optional(),
  messages: z
    .array(
      z.looseObject({
        id: z.string().max(128).optional(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z
          .array(
            z.looseObject({
              type: z.string().max(64),
              text: z.string().max(MAX_MESSAGE_CHARS * 4).optional(),
            }),
          )
          .max(32),
      }),
    )
    .min(1)
    .max(64),
});

function textLength(message: { parts: { type: string; text?: string }[] }) {
  return message.parts.reduce(
    (sum, part) => sum + (part.type === "text" ? (part.text?.length ?? 0) : 0),
    0,
  );
}

function messageText(message: { parts: { type: string; text?: string }[] }) {
  return message.parts
    .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
    .join(" ");
}

/** Serve a semantic-cache hit as an instant, badged UI chunk stream. */
function cachedResponse(answer: string, requestId: string) {
  const id = "cached-0";
  const chunks: UIMessageChunk[] = [
    { type: "start" },
    { type: "text-start", id },
    { type: "text-delta", id, delta: answer },
    { type: "text-end", id },
    { type: "data-cached", data: true } as UIMessageChunk,
    { type: "finish" },
  ];
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: { "x-workflow-run-id": "cache", "x-request-id": requestId },
  });
}

/** Stream an existing run's chunks to the client (used when reattaching). */
async function runResponse(runId: string, requestId: string) {
  const run = getRun(runId);
  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: { "x-workflow-run-id": runId, "x-request-id": requestId },
  });
}

export async function POST(req: Request) {
  const requestId = randomUUID();
  const caller = callerId(req);

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    log("chat.reject", { requestId, caller, reason: "body-too-large" }, "warn");
    return Response.json({ error: "Request too large." }, { status: 413 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(rawBody));
  } catch {
    log("chat.reject", { requestId, caller, reason: "malformed" }, "warn");
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  // Counted before dedup/cache short-circuits so the pipeline schematic's
  // "requests" really means everything that arrived well-formed.
  await bumpCounter("requests");

  const chatId = parsed.id ?? randomUUID();
  const messages = parsed.messages.slice(-MAX_MESSAGES) as unknown as UIMessage[];
  const last = messages[messages.length - 1];
  if (last.role !== "user" || textLength(last) > MAX_MESSAGE_CHARS) {
    log("chat.reject", { requestId, caller, reason: "bad-last-message" }, "warn");
    return Response.json(
      { error: "Message missing or too long." },
      { status: 400 },
    );
  }

  // Idempotency: a retried or double-clicked send reattaches to the run the
  // first attempt started instead of paying for a second generation.
  const messageKey = `idem:${chatId}:${parsed.messageId ?? last.id ?? "last"}`;
  const regenerating = parsed.trigger === "regenerate-message";
  const existingRun = regenerating
    ? null
    : await redis.get<string>(messageKey);
  if (existingRun) {
    log("chat.reattach", { requestId, caller, chatId, runId: existingRun });
    await bumpCounter("reattaches");
    return runResponse(existingRun, requestId);
  }

  // Single-flight: opening questions are identical across visitors, so an
  // in-flight run for the same first message is shared rather than repeated.
  const isOpening =
    !regenerating && messages.filter((m) => m.role === "user").length === 1;
  const flightKey = isOpening
    ? `sf:${createHash("sha256")
        .update(messageText(last).trim().toLowerCase())
        .digest("hex")
        .slice(0, 24)}`
    : null;
  if (flightKey) {
    const shared = await redis.get<string>(flightKey);
    if (shared) {
      log("chat.single-flight", { requestId, caller, chatId, runId: shared });
      await Promise.all([
        redis.set(messageKey, shared, { ex: 60 * 60 }),
        bumpCounter("singleFlightHits"),
      ]);
      return runResponse(shared, requestId);
    }
  }

  // Semantic cache: paraphrases of already-answered opening questions are
  // served straight from the cache, visibly badged, in milliseconds.
  if (isOpening) {
    const cached = await cacheLookup(messageText(last));
    if (cached) {
      log("chat.cache-hit", {
        requestId,
        caller,
        chatId,
        score: cached.score,
      });
      await bumpCounter("cacheHits");
      return cachedResponse(cached.answer, requestId);
    }
  }

  const inputChars = messages.reduce((sum, m) => sum + textLength(m), 0);
  const estimatedTokens = Math.ceil(inputChars / 4) + MAX_OUTPUT_TOKENS;

  const verdict = await admit(caller, estimatedTokens);
  if (!verdict.ok) {
    log(
      "chat.shed",
      { requestId, caller, reason: verdict.reason, status: verdict.status },
      "warn",
    );
    await bumpCounter("sheds");
    return Response.json(
      { error: verdict.message },
      {
        status: verdict.status,
        headers: { "retry-after": String(verdict.retryAfterSeconds) },
      },
    );
  }

  const slot = await acquireRunSlot();
  if (!slot.ok) {
    log("chat.shed", { requestId, caller, reason: "queue-depth", depth: slot.depth }, "warn");
    await bumpCounter("sheds");
    return Response.json(
      { error: "The assistant is at capacity right now. Try again in a few seconds." },
      { status: 503, headers: { "retry-after": "5" } },
    );
  }

  let run: Awaited<ReturnType<typeof start>>;
  try {
    run = await start(chatWorkflow, [
      {
        requestId,
        caller,
        chatId,
        messages,
        estimatedTokens,
        enqueuedAt: Date.now(),
        isOpening,
      },
    ]);
  } catch (error) {
    await releaseRunSlot();
    log(
      "chat.error",
      {
        requestId,
        caller,
        chatId,
        error: error instanceof Error ? error.message : String(error),
      },
      "error",
    );
    return Response.json(
      { error: "The assistant could not start. Please try again." },
      { status: 500 },
    );
  }

  const startedAt = Date.now();
  const pipeline = redis.pipeline();
  pipeline.set(messageKey, run.runId, { ex: 60 * 60 });
  pipeline.set(`chat:${chatId}:run`, run.runId, { ex: 60 * 60 * 24 });
  if (flightKey) pipeline.set(flightKey, run.runId, { ex: 120, nx: true });
  await pipeline.exec();

  await Promise.all([
    bumpCounter("admitted"),
    traceIndex(requestId, run.runId),
    traceWrite(requestId, {
      requestId,
      runId: run.runId,
      chatId,
      caller,
      model: CHAT_MODEL,
      promptVersion: promptVersion(),
      inputChars,
      estimatedTokens,
      enqueuedAt: new Date(startedAt).toISOString(),
      admission: "admitted",
    }),
  ]);

  log("chat.enqueue", { requestId, caller, chatId, runId: run.runId });

  // Tap the stream to measure time-to-first-token as the visitor saw it.
  let sawFirstChunk = false;
  const ttftTap = new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform: (chunk, controller) => {
      if (!sawFirstChunk) {
        sawFirstChunk = true;
        const ttftMs = Date.now() - startedAt;
        void Promise.all([
          recordSample("ttft", ttftMs),
          traceWrite(requestId, { ttftMs }),
        ]).catch(() => {});
      }
      controller.enqueue(chunk);
    },
  });

  return createUIMessageStreamResponse({
    stream: run.readable
      .pipeThrough(createModelCallToUIChunkTransform())
      .pipeThrough(createErrorHoldback())
      .pipeThrough(ttftTap),
    headers: { "x-workflow-run-id": run.runId, "x-request-id": requestId },
  });
}
