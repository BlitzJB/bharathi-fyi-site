import { registerTelemetry } from "ai";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

/**
 * Exported so route handlers can force-flush spans before the serverless
 * function freezes (via next/server `after`).
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor();

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // CI and other keyless environments run without tracing.
  if (!process.env.LANGFUSE_PUBLIC_KEY) return;
  const provider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });
  provider.register();
  // AI SDK v7 emits telemetry through registered integrations, not the
  // global OTel provider alone; this bridges streamText spans to Langfuse.
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
  console.log('{"event":"otel.registered","exporter":"langfuse"}');
}
