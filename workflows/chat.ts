import { getWritable } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import {
  WorkflowAgent,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { buildSystemPrompt, promptVersion } from "@/lib/knowledge";
import { log } from "@/lib/log";
import { CHAT_MODEL } from "@/lib/model";
import { releaseRunSlot } from "@/lib/admission";

export type ChatJob = {
  requestId: string;
  caller: string;
  chatId: string;
  messages: UIMessage[];
};

const MAX_OUTPUT_TOKENS = 1024;

/**
 * The queue-fed serving path: POST /api/chat never talks to the model, it
 * starts this workflow. Each numbered stage is durable and independently
 * retried; tokens land in the run's persistent stream, which the SSE routes
 * tail (and re-tail after a reload).
 *
 * Guardrail, retrieval, and verification stages arrive in phase 4; the
 * pipeline shape exists now so they slot in as steps.
 */
export async function chatWorkflow(job: ChatJob) {
  "use workflow";

  const writable = getWritable<ModelCallStreamPart>();

  const system = await compileSystemPrompt(job);

  const agent = new WorkflowAgent({
    model: CHAT_MODEL,
    instructions: system,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  const modelMessages = await toModelMessages(job);

  await agent.stream({
    messages: modelMessages,
    writable,
    onFinish: async (event) => {
      await finalizeRun(job, {
        finishReason: String(event.finishReason ?? "unknown"),
        totalTokens: event.totalUsage?.totalTokens,
      });
    },
    onError: async (event) => {
      await recordRunError(job, String(event.error));
    },
    onAbort: async () => {
      await recordRunError(job, "aborted");
    },
  });
}

async function compileSystemPrompt(job: ChatJob): Promise<string> {
  "use step";
  log("chat.workflow.start", {
    requestId: job.requestId,
    caller: job.caller,
    chatId: job.chatId,
    model: CHAT_MODEL,
    promptVersion: promptVersion(),
  });
  return buildSystemPrompt();
}

async function toModelMessages(job: ChatJob) {
  "use step";
  return convertToModelMessages(job.messages);
}

async function finalizeRun(
  job: ChatJob,
  result: { finishReason: string; totalTokens?: number },
) {
  "use step";
  log("chat.workflow.finish", {
    requestId: job.requestId,
    caller: job.caller,
    chatId: job.chatId,
    finishReason: result.finishReason,
    totalTokens: result.totalTokens,
  });
  await releaseRunSlot();
}

async function recordRunError(job: ChatJob, error: string) {
  "use step";
  log(
    "chat.workflow.error",
    { requestId: job.requestId, caller: job.caller, chatId: job.chatId, error },
    "error",
  );
  await releaseRunSlot();
}
