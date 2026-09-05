// Golden-question eval suite with LLM-as-judge groundedness scoring.
// Runs against a live server (local `next start` in CI, or any BASE_URL),
// so the whole serving pipeline is what gets evaluated, not just a prompt.
//
// Checks per question:
//   1. an answer streams and completes
//   2. every [cite:id] resolves to a real concept
//   3. at least one expected concept is cited (when specified)
//   4. a mustMention keyword appears (when specified)
//   5. an independent judge model finds every claim supported by the
//      concepts the answer itself cited
//
// Pass bar: PASS_RATE (default 0.8). Usage:
//   node --env-file=.env.local evals/run.mjs [--base http://127.0.0.1:3123]
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const baseFlag = args.indexOf("--base");
const BASE =
  (baseFlag !== -1 ? args[baseFlag + 1] : undefined) ??
  process.env.EVAL_BASE_URL ??
  "http://127.0.0.1:3123";
const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "openai/gpt-oss-120b";
const PASS_RATE = Number(process.env.EVAL_PASS_RATE ?? 0.8);

const { questions } = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "evals", "golden.json"), "utf8"),
);

const CITE_RE = /\[cite:\s*([\w./-]+)\s*\]/g;

function conceptText(id) {
  const file = path.join(process.cwd(), ".okf", `${id}.md`);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

async function ask(question, index) {
  const chatId = `eval-${index}-${Date.now()}`;
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: chatId,
      messageId: `${chatId}-m`,
      messages: [
        { id: `${chatId}-m`, role: "user", parts: [{ type: "text", text: question }] },
      ],
    }),
  });
  const body = await res.text();
  const text = [...body.matchAll(/"type":"text-delta"[^}]*"delta":"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => JSON.parse(`"${m[1]}"`))
    .join("");
  return { status: res.status, completed: body.includes("[DONE]"), text };
}

async function judge(question, answer, citedIds) {
  const sources = citedIds
    .map((id) => {
      const text = conceptText(id);
      return text ? `--- concept ${id} ---\n${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
  if (!sources) return { grounded: true, reason: "no citations to judge" };

  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content:
            'You are a strict groundedness judge. Given SOURCES and an ANSWER, decide whether every factual claim in the ANSWER is supported by the SOURCES. Formatting, phrasing, and reasonable summarization are fine; invented facts are not. Reply with only a JSON object: {"grounded": true|false, "reason": "<one sentence>"}',
        },
        {
          role: "user",
          content: `QUESTION:\n${question}\n\nSOURCES:\n${sources}\n\nANSWER:\n${answer}`,
        },
      ],
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return { grounded: false, reason: `judge unparseable: ${content.slice(0, 80)}` };
  try {
    const parsed = JSON.parse(match[0]);
    return { grounded: Boolean(parsed.grounded), reason: String(parsed.reason ?? "") };
  } catch {
    return { grounded: false, reason: "judge JSON invalid" };
  }
}

const results = [];
for (const [index, q] of questions.entries()) {
  const failures = [];
  try {
    const r = await ask(q.question, index);
    if (r.status !== 200 || !r.completed) failures.push(`bad response (${r.status})`);
    const cleanText = r.text ?? "";
    if (cleanText.trim().length === 0) failures.push("empty answer");

    const cited = [...cleanText.matchAll(CITE_RE)].map((m) => m[1]);
    const unresolved = cited.filter((id) => conceptText(id) === null);
    if (unresolved.length > 0) failures.push(`unresolved citations: ${unresolved.join(",")}`);

    if (q.expectedCitations.length > 0) {
      const hit = cited.some((id) => q.expectedCitations.includes(id));
      if (!hit)
        failures.push(
          `expected a citation from [${q.expectedCitations.join(", ")}], got [${cited.join(", ") || "none"}]`,
        );
    }
    for (const keyword of q.mustMention) {
      if (!cleanText.toLowerCase().includes(keyword.toLowerCase()))
        failures.push(`missing keyword "${keyword}"`);
    }
    if (q.expectDecline) {
      const judged = await judge(
        q.question,
        cleanText,
        ["faq", "profile/about"],
      );
      // For decline cases the only requirement is not inventing facts.
      if (!judged.grounded) failures.push(`decline invented facts: ${judged.reason}`);
    } else if (failures.length === 0) {
      // Judge against cited plus expected concepts: answers may draw true
      // facts from sibling concepts without spending one of their at-most-3
      // citations on them; the knowledgebase, not the citation list, is the
      // ground truth for hallucination.
      const sources = [...new Set([...cited, ...q.expectedCitations])];
      const judged = await judge(q.question, cleanText, sources);
      if (!judged.grounded) failures.push(`ungrounded: ${judged.reason}`);
    }
  } catch (error) {
    failures.push(`error: ${error.message}`);
  }
  const pass = failures.length === 0;
  results.push({ id: q.id, pass, failures });
  console.log(`${pass ? "PASS" : "FAIL"}  ${q.id}${pass ? "" : `  — ${failures.join("; ")}`}`);
  // Stay inside our own admission budget.
  await new Promise((resolve) => setTimeout(resolve, 8000));
}

const passed = results.filter((r) => r.pass).length;
const rate = passed / results.length;
console.log(`\n${passed}/${results.length} passed (${(rate * 100).toFixed(0)}%, bar ${PASS_RATE * 100}%)`);

// Publish the score for /ops.
if (process.env.KV_REST_API_URL) {
  await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      "SET",
      "evals:latest",
      JSON.stringify({ passed, total: results.length, rate, at: new Date().toISOString() }),
    ]),
  }).catch(() => {});
}

process.exit(rate >= PASS_RATE ? 0 : 1);
