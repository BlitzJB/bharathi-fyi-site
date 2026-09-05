import { randomUUID } from "crypto";
import { after } from "next/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { propagateAttributes } from "@langfuse/tracing";
import { z } from "zod";
import { langfuseSpanProcessor } from "@/instrumentation";
import { admit, callerId, settleTokenBudgets } from "@/lib/admission";
import { buildSystemPrompt, promptVersion } from "@/lib/knowledge";
import { log } from "@/lib/log";
import { CHAT_MODEL } from "@/lib/model";

export const maxDuration = 60;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_OUTPUT_TOKENS = 1024;

const bodySchema = z.object({
  messages: z
    .array(
      z.looseObject({
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

export async function POST(req: Request) {
  const requestId = randomUUID();
  const caller = callerId(req);
  const startedAt = Date.now();

  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    log("chat.reject", { requestId, caller, reason: "body-too-large" }, "warn");
    return Response.json({ error: "Request too large." }, { status: 413 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(JSON.parse(body));
  } catch {
    log("chat.reject", { requestId, caller, reason: "malformed" }, "warn");
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const messages = parsed.messages.slice(-MAX_MESSAGES) as unknown as UIMessage[];
  const last = messages[messages.length - 1];
  if (last.role !== "user" || textLength(last) > MAX_MESSAGE_CHARS) {
    log("chat.reject", { requestId, caller, reason: "bad-last-message" }, "warn");
    return Response.json(
      { error: "Message missing or too long." },
      { status: 400 },
    );
  }

  // Chars/4 is a coarse token estimate; settled against real usage below.
  const inputChars = messages.reduce((sum, m) => sum + textLength(m), 0);
  const estimatedTokens = Math.ceil(inputChars / 4) + MAX_OUTPUT_TOKENS;

  const verdict = await admit(caller, estimatedTokens);
  if (!verdict.ok) {
    log(
      "chat.shed",
      { requestId, caller, reason: verdict.reason, status: verdict.status },
      "warn",
    );
    return Response.json(
      { error: verdict.message },
      {
        status: verdict.status,
        headers: { "retry-after": String(verdict.retryAfterSeconds) },
      },
    );
  }

  const version = promptVersion();
  log("chat.start", {
    requestId,
    caller,
    model: CHAT_MODEL,
    promptVersion: version,
    messages: messages.length,
    inputChars,
  });

  return propagateAttributes(
    {
      traceName: "chat",
      sessionId: caller,
      metadata: { requestId, promptVersion: version, model: CHAT_MODEL },
    },
    async () => {
      const result = streamText({
        model: CHAT_MODEL,
        system: buildSystemPrompt(),
        messages: await convertToModelMessages(messages),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        experimental_telemetry: { isEnabled: true, functionId: "chat" },
        onFinish: async ({ totalUsage, finishReason }) => {
          const actualTokens = totalUsage.totalTokens ?? estimatedTokens;
          log("chat.finish", {
            requestId,
            caller,
            finishReason,
            durationMs: Date.now() - startedAt,
            inputTokens: totalUsage.inputTokens,
            outputTokens: totalUsage.outputTokens,
            totalTokens: actualTokens,
          });
          await settleTokenBudgets(caller, estimatedTokens, actualTokens);
        },
        onError: ({ error }) => {
          log(
            "chat.error",
            {
              requestId,
              caller,
              durationMs: Date.now() - startedAt,
              error: error instanceof Error ? error.message : String(error),
            },
            "error",
          );
        },
      });

      after(() => langfuseSpanProcessor.forceFlush());

      return result.toUIMessageStreamResponse({
        headers: { "x-request-id": requestId },
        onError: () =>
          "The assistant is unavailable right now. Please try again in a moment.",
      });
    },
  );
}
