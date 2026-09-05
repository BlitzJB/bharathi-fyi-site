import { getWritable } from "workflow";
import { convertToModelMessages, type UIMessage } from "ai";
import {
  WorkflowAgent,
  type ModelCallStreamPart,
} from "@ai-sdk/workflow";
import { buildSystemPrompt, promptVersion } from "@/lib/knowledge";
import { log } from "@/lib/log";
import {
  bumpCounter,
  recordSample,
  recordTokens,
  traceWrite,
} from "@/lib/metrics";
import { CHAT_MODEL } from "@/lib/model";
import { releaseRunSlot, settleTokenBudgets } from "@/lib/admission";

export type ChatJob = {
  requestId: string;
  caller: string;
  chatId: string;
  messages: UIMessage[];
  estimatedTokens: number;
  enqueuedAt: number;
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
  await traceWrite(job.requestId, {
    generateStartedAt: new Date().toISOString(),
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
  const durationMs = Date.now() - job.enqueuedAt;
  log("chat.workflow.finish", {
    requestId: job.requestId,
    caller: job.caller,
    chatId: job.chatId,
    finishReason: result.finishReason,
    totalTokens: result.totalTokens,
    durationMs,
  });
  const actualTokens = result.totalTokens ?? job.estimatedTokens;
  await Promise.all([
    releaseRunSlot(),
    bumpCounter("finishes"),
    recordSample("duration", durationMs),
    recordTokens(actualTokens),
    settleTokenBudgets(job.caller, job.estimatedTokens, actualTokens),
    traceWrite(job.requestId, {
      finishReason: result.finishReason,
      totalTokens: actualTokens,
      durationMs,
      finishedAt: new Date().toISOString(),
    }),
  ]);
}

async function recordRunError(job: ChatJob, error: string) {
  "use step";
  log(
    "chat.workflow.error",
    { requestId: job.requestId, caller: job.caller, chatId: job.chatId, error },
    "error",
  );
  await Promise.all([
    releaseRunSlot(),
    bumpCounter("errors"),
    traceWrite(job.requestId, {
      error: error.slice(0, 500),
      finishedAt: new Date().toISOString(),
    }),
  ]);
}
