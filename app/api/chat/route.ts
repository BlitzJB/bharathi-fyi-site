import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { buildSystemPrompt } from "@/lib/knowledge";
import { resolveChatModels, reportModelFailure } from "@/lib/model";

export const maxDuration = 60;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 64 * 1024;

const UNAVAILABLE =
  "The assistant is unavailable right now. Please try again in a moment.";

function messageTextLength(message: UIMessage): number {
  return message.parts.reduce(
    (sum, part) => sum + (part.type === "text" ? part.text.length : 0),
    0,
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Request too large." }, { status: 413 });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = JSON.parse(body) as { messages: UIMessage[] });
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user" || messageTextLength(last) > MAX_MESSAGE_CHARS) {
    return Response.json(
      { error: "Message missing or too long." },
      { status: 400 },
    );
  }

  const { primary, fallbacks } = await resolveChatModels();
  const candidates = [primary, ...fallbacks];
  const system = buildSystemPrompt();
  const modelMessages = await convertToModelMessages(
    messages.slice(-MAX_MESSAGES),
  );

  // Walk the candidate chain ourselves. The gateway's own fallback doesn't
  // cover every failure class (free-tier rate limits, for one), so each
  // attempt is buffered until it produces visible text; an attempt that
  // errors before any text is silently replaced by the next candidate.
  const stream = createUIMessageStream({
    onError: () => UNAVAILABLE,
    async execute({ writer }) {
      for (let i = 0; i < candidates.length; i++) {
        const model = candidates[i];
        const isAnchor = i === candidates.length - 1;

        const result = streamText({
          model,
          system,
          messages: modelMessages,
          maxOutputTokens: 1024,
          // Same-model retries just add latency for the free candidates;
          // the anchor keeps them for resilience against network blips.
          maxRetries: isAnchor ? 2 : 0,
        });

        const buffered: UIMessageChunk[] = [];
        let committed = false;
        let failedBeforeText = false;

        const reader = result.toUIMessageStream().getReader();
        try {
          for (;;) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            if (committed) {
              writer.write(chunk);
              continue;
            }
            if (chunk.type === "error") {
              failedBeforeText = true;
              break;
            }
            buffered.push(chunk);
            if (chunk.type === "text-delta" && chunk.delta.length > 0) {
              committed = true;
              for (const held of buffered) writer.write(held);
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (committed) return;
        if (failedBeforeText) reportModelFailure(model);
      }

      writer.write({ type: "error", errorText: UNAVAILABLE });
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { "x-chat-models": candidates.join(",") },
  });
}
