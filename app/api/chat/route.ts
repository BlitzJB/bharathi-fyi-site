import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildSystemPrompt } from "@/lib/knowledge";

export const maxDuration = 30;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 2000;
const MAX_BODY_BYTES = 64 * 1024;

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

  const result = streamText({
    model: process.env.CHAT_MODEL ?? "openai/gpt-oss-120b",
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages.slice(-MAX_MESSAGES)),
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse({
    onError: () => "The assistant is unavailable right now. Please try again in a moment.",
  });
}
