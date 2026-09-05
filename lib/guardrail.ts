import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { generateText } from "ai";

/**
 * Input guardrail: gpt-oss-safeguard classifies the visitor's message
 * against our written policy (prompts/safety-policy.md). The policy is a
 * versioned artifact; its hash travels with every trace. Fails open — a
 * broken classifier must not take the assistant down.
 */

const SAFETY_MODEL =
  process.env.SAFETY_MODEL?.trim() || "openai/gpt-oss-safeguard-20b";

let cachedPolicy: { text: string; version: string } | null = null;

export function loadPolicy(): { text: string; version: string } {
  if (cachedPolicy && process.env.NODE_ENV === "production")
    return cachedPolicy;
  const text = fs.readFileSync(
    path.join(process.cwd(), "prompts", "safety-policy.md"),
    "utf8",
  );
  const version = createHash("sha256").update(text).digest("hex").slice(0, 12);
  cachedPolicy = { text, version };
  return cachedPolicy;
}

export type GuardVerdict = {
  category: "allow" | "off_topic" | "abuse";
  reason: string;
  policyVersion: string;
  failedOpen?: boolean;
};

export async function classifyMessage(message: string): Promise<GuardVerdict> {
  const policy = loadPolicy();
  try {
    const result = await generateText({
      model: SAFETY_MODEL,
      system: policy.text,
      prompt: `USER MESSAGE:\n${message.slice(0, 2000)}`,
      maxOutputTokens: 4096,
      maxRetries: 1,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        category?: string;
        reason?: string;
      };
      if (
        parsed.category === "allow" ||
        parsed.category === "off_topic" ||
        parsed.category === "abuse"
      ) {
        return {
          category: parsed.category,
          reason: String(parsed.reason ?? "").slice(0, 200),
          policyVersion: policy.version,
        };
      }
    }
  } catch {
    // fall through to fail-open
  }
  return {
    category: "allow",
    reason: "classifier unavailable, failed open",
    policyVersion: policy.version,
    failedOpen: true,
  };
}

export { REFUSALS } from "./refusals";
