import { getWritable } from "workflow";
import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";
import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import {
  buildSystemPromptWith,
  listConceptMeta,
  promptVersion,
} from "@/lib/knowledge";
import { chaosMode, CHAOS_HEALTHY_TEXT, type ChaosMode } from "@/lib/chaos";
import { classifyMessage, type GuardVerdict } from "@/lib/guardrail";
import { REFUSALS } from "@/lib/refusals";
import { breakerOpen, recordFailure, recordSuccess } from "@/lib/breaker";
import {
  cacheStore,
  fullKnowledge,
  knowledgeFromChunks,
  rawSearchAnswer,
  retrieveChunks,
  type RetrievedChunk,
} from "@/lib/retrieval";
import { log } from "@/lib/log";
import {
  bumpCounter,
  recordCost,
  recordSample,
  recordTokens,
  traceWrite,
} from "@/lib/metrics";
import { CHAT_MODEL } from "@/lib/model";
import { costMicros } from "@/lib/pricing";
import {
  modelOverride,
  releaseRunSlot,
  settleTokenBudgets,
} from "@/lib/admission";

export type ChatJob = {
  requestId: string;
  caller: string;
  chatId: string;
  messages: UIMessage[];
  estimatedTokens: number;
  enqueuedAt: number;
  isOpening: boolean;
};

const MAX_OUTPUT_TOKENS = 1024;
const FALLBACK_MODEL =
  process.env.CHAT_FALLBACK_MODEL?.trim() || "openai/gpt-oss-120b";

function lastUserText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return "";
  return last.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

/**
 * The serving pipeline, one durable stage per concern:
 * guardrail → retrieve → generate (breaker + degradation ladder) → verify →
 * finalize. Tokens land in the run's persistent stream; every stage writes
 * its part of the public trace.
 */
export async function chatWorkflow(job: ChatJob) {
  "use workflow";

  const writable = getWritable<ModelCallStreamPart>();

  // 1. Guardrail: classify against the versioned safety policy.
  const guard = await guardrailStep(job);
  if (guard.category !== "allow") {
    await writeText(writable, REFUSALS[guard.category]);
    await verifyAndFinalize(job, {
      text: "",
      modelUsed: "none (guardrail refusal)",
      finishReason: `refused-${guard.category}`,
      totalTokens: 0,
      degraded: false,
    });
    await closeStream(writable);
    return;
  }

  // 2. Retrieve: hybrid search, falling back to the full knowledgebase.
  const retrieval = await retrieveStep(job);

  // 3. Generate, walking the ladder: primary model → fallback model →
  //    raw knowledgebase passages. The breaker skips known-dead rungs.
  const generated = await generateWithLadder(job, retrieval, writable);

  // 4. Verify citations + settle. (Runs even for degraded answers.)
  await verifyAndFinalize(job, generated);

  await closeStream(writable);
}

async function closeStream(writable: WritableStream<ModelCallStreamPart>) {
  "use step";
  const writer = writable.getWriter();
  await writer.close();
}

async function guardrailStep(job: ChatJob): Promise<GuardVerdict> {
  "use step";
  const started = Date.now();
  const verdict = await classifyMessage(lastUserText(job.messages));
  const fields: Record<string, string | number> = {
    guardCategory: verdict.category,
    guardReason: verdict.reason,
    policyVersion: verdict.policyVersion,
    guardMs: Date.now() - started,
  };
  const bumps: Promise<void>[] = [traceWrite(job.requestId, fields)];
  if (verdict.category === "off_topic") bumps.push(bumpCounter("guardOffTopic"));
  if (verdict.category === "abuse") bumps.push(bumpCounter("guardAbuse"));
  if (verdict.failedOpen) bumps.push(bumpCounter("guardFailedOpen"));
  await Promise.all(bumps);
  log("chat.guardrail", {
    requestId: job.requestId,
    category: verdict.category,
    failedOpen: verdict.failedOpen ?? false,
  });
  return verdict;
}

type Retrieval = {
  mode: "hybrid" | "full-context";
  /** Fully-built system prompt (built inside the step: needs Node APIs). */
  system: string;
  chunks: RetrievedChunk[];
};

async function retrieveStep(job: ChatJob): Promise<Retrieval> {
  "use step";
  const started = Date.now();
  const chunks = await retrieveChunks(lastUserText(job.messages));
  const mode = chunks && chunks.length > 0 ? "hybrid" : "full-context";
  await traceWrite(job.requestId, {
    retrievalMode: mode,
    retrievalMs: Date.now() - started,
    retrievedChunks: chunks
      ? JSON.stringify(
          chunks.map((c) => ({ id: c.id, score: Number(c.score.toFixed(4)) })),
        )
      : "[]",
  });
  return {
    mode,
    system: buildSystemPromptWith(
      mode === "hybrid" ? knowledgeFromChunks(chunks!) : fullKnowledge(),
    ),
    chunks: chunks ?? [],
  };
}

type Generated = {
  text: string;
  modelUsed: string;
  finishReason: string;
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  degraded: boolean;
};

async function generateWithLadder(
  job: ChatJob,
  retrieval: Retrieval,
  writable: WritableStream<ModelCallStreamPart>,
): Promise<Generated> {
  const modelMessages = await toModelMessages(job);
  const system = retrieval.system;
  const primaryModel = await resolvePrimaryModel(job);

  for (const rung of [
    { target: "primary" as const, model: primaryModel },
    { target: "fallback" as const, model: FALLBACK_MODEL },
  ]) {
    const skip = await isBreakerOpen(rung.target);
    if (skip) continue;
    const chaos = await chaosModeStep(rung.target);
    try {
      const result = chaos
        ? await chaosRung(chaos, writable)
        : await runAgent(rung.model, system, modelMessages, writable);
      await markSuccess(job, rung);
      return { ...result, modelUsed: rung.model, degraded: false };
    } catch (error) {
      await markFailure(job, rung, String(error));
    }
  }

  // Last rung: the knowledgebase answers for itself.
  const raw = await writeRawAnswer(job, retrieval, writable);
  return {
    text: raw,
    modelUsed: "none (raw knowledgebase)",
    finishReason: "degraded-raw",
    totalTokens: 0,
    degraded: true,
  };
}

async function toModelMessages(job: ChatJob): Promise<ModelMessage[]> {
  "use step";
  return convertToModelMessages(job.messages);
}

async function resolvePrimaryModel(job: ChatJob): Promise<string> {
  "use step";
  const override = await modelOverride();
  if (override) {
    await traceWrite(job.requestId, { modelOverride: override });
  }
  return override ?? CHAT_MODEL;
}

async function isBreakerOpen(target: string): Promise<boolean> {
  "use step";
  return breakerOpen(target);
}

function textFromMessages(messages: ModelMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "assistant");
  if (!last) return "";
  if (typeof last.content === "string") return last.content;
  return last.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

async function chaosModeStep(
  target: "primary" | "fallback",
): Promise<ChaosMode | null> {
  "use step";
  return chaosMode(target);
}

/**
 * Fault-injected rung for the chaos suite: reproduces the outcomes a model
 * can have (hard failure, mid-stream truncation, slow start, healthy
 * answer) without any provider call, so the ladder, breaker, and
 * error-holdback machinery are tested for real at zero token cost.
 */
async function chaosRung(
  mode: ChaosMode,
  writable: WritableStream<ModelCallStreamPart>,
): Promise<Omit<Generated, "modelUsed" | "degraded">> {
  "use step";
  if (mode === "fail") {
    throw new Error("chaos: simulated provider rate limit (429)");
  }
  if (mode === "truncate") {
    const writer = writable.getWriter();
    const id = `chaos-${Date.now()}`;
    await writer.write({ type: "text-start", id } as ModelCallStreamPart);
    await writer.write({
      type: "text-delta",
      id,
      text: "Bharathi is a Software ",
    } as ModelCallStreamPart);
    writer.releaseLock();
    throw new Error("chaos: stream truncated mid-answer");
  }
  if (mode === "slow") {
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }
  await writeTextToStream(writable, CHAOS_HEALTHY_TEXT);
  return { text: CHAOS_HEALTHY_TEXT, finishReason: "stop", totalTokens: 125 };
}

async function runAgent(
  model: string,
  system: string,
  messages: ModelMessage[],
  writable: WritableStream<ModelCallStreamPart>,
): Promise<Omit<Generated, "modelUsed" | "degraded">> {
  const agent = new WorkflowAgent({
    model,
    instructions: system,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: 1,
  });
  const result = await agent.stream({ messages, writable, preventClose: true });
  if ("error" in result) {
    throw new Error(
      result.error instanceof Error ? result.error.message : String(result.error),
    );
  }
  return {
    text: textFromMessages(result.messages),
    finishReason: String(result.finishReason),
    totalTokens: result.totalUsage?.totalTokens ?? 0,
    inputTokens: result.totalUsage?.inputTokens ?? 0,
    outputTokens: result.totalUsage?.outputTokens ?? 0,
  };
}

async function markSuccess(job: ChatJob, rung: { target: string; model: string }) {
  "use step";
  await Promise.all([
    recordSuccess(rung.target),
    traceWrite(job.requestId, { modelUsed: rung.model, ladderRung: rung.target }),
  ]);
}

async function markFailure(
  job: ChatJob,
  rung: { target: string; model: string },
  error: string,
) {
  "use step";
  log(
    "chat.ladder.failure",
    { requestId: job.requestId, rung: rung.target, model: rung.model, error },
    "warn",
  );
  await Promise.all([
    recordFailure(rung.target),
    traceWrite(job.requestId, {
      [`ladder:${rung.target}`]: `failed: ${error.slice(0, 300)}`,
    }),
  ]);
}

async function writeRawAnswer(
  job: ChatJob,
  retrieval: Retrieval,
  writable: WritableStream<ModelCallStreamPart>,
): Promise<string> {
  "use step";
  const text =
    retrieval.chunks.length > 0
      ? rawSearchAnswer(retrieval.chunks)
      : "Every model behind this assistant is unavailable right now, and no matching passages were found. The rest of the site still works; the links in the footer reach Joshua directly.";
  await Promise.all([
    writeTextToStream(writable, text),
    bumpCounter("degradedAnswers"),
  ]);
  return text;
}

/** Write a static answer into the run's stream as model-call parts. */
async function writeText(
  writable: WritableStream<ModelCallStreamPart>,
  text: string,
) {
  "use step";
  await writeTextToStream(writable, text);
}

async function writeTextToStream(
  writable: WritableStream<ModelCallStreamPart>,
  text: string,
) {
  const writer = writable.getWriter();
  const id = "static-0";
  await writer.write({ type: "text-start", id } as ModelCallStreamPart);
  for (const word of text.split(/(?<=\s)/)) {
    await writer.write({
      type: "text-delta",
      id,
      text: word,
    } as ModelCallStreamPart);
  }
  await writer.write({ type: "text-end", id } as ModelCallStreamPart);
  writer.releaseLock();
}

async function verifyAndFinalize(job: ChatJob, generated: Generated) {
  "use step";
  // Citation verification: every [cite:id] must resolve to a real concept.
  const validIds = new Set(listConceptMeta().map((c) => c.id));
  const cited = [...generated.text.matchAll(/\[cite:\s*([\w./-]+)\s*\]/g)].map(
    (m) => m[1],
  );
  const broken = cited.filter((id) => !validIds.has(id));
  const verified = broken.length === 0;

  const durationMs = Date.now() - job.enqueuedAt;
  const actualTokens = generated.totalTokens || job.estimatedTokens;
  const cost = costMicros(
    generated.modelUsed,
    generated.inputTokens ?? 0,
    generated.outputTokens ?? 0,
  );

  const work: Promise<unknown>[] = [
    releaseRunSlot(),
    bumpCounter("finishes"),
    recordSample("duration", durationMs),
    recordTokens(generated.totalTokens),
    settleTokenBudgets(job.caller, job.estimatedTokens, actualTokens),
    recordCost(cost),
    traceWrite(job.requestId, {
      finishReason: generated.finishReason,
      totalTokens: generated.totalTokens,
      costMicros: cost,
      durationMs,
      finishedAt: new Date().toISOString(),
      citations: cited.join(", ") || "none",
      citationsVerified: verified ? "yes" : `broken: ${broken.join(", ")}`,
      promptVersion: promptVersion(),
    }),
  ];
  if (!verified) work.push(bumpCounter("citationsBroken"));
  // Cache verified opening answers for the semantic cache rung.
  if (job.isOpening && verified && !generated.degraded && generated.text) {
    work.push(cacheStore(lastUserText(job.messages), generated.text));
  }
  await Promise.all(work);

  log("chat.workflow.finish", {
    requestId: job.requestId,
    caller: job.caller,
    chatId: job.chatId,
    finishReason: generated.finishReason,
    model: generated.modelUsed,
    totalTokens: generated.totalTokens,
    citationsVerified: verified,
    durationMs,
  });
}
