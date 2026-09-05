// Chaos suite: boots the built app with fault-injecting mock models
// (lib/chaos.ts) and asserts the resilience machinery actually engages.
// Zero tokens are spent: every model call is a mock.
//
// Prereq: `pnpm build` has run. Usage: node --env-file=.env.local tests/chaos/run.mjs
import { spawn } from "node:child_process";
import { Index } from "@upstash/vector";

const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let currentServer = null;

function assert(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition ? "" : `  — ${detail}`}`);
}

async function redisCall(...command) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(command),
  });
  return (await res.json()).result;
}

async function resetState() {
  for (const pattern of ["breaker:*", "idem:*", "sf:*", "rl:rpm*", "queue:*", "budget:tokens:*"]) {
    const keys = await redisCall("KEYS", pattern);
    if (Array.isArray(keys) && keys.length > 0) await redisCall("DEL", ...keys);
  }
  // The semantic cache would happily answer for a downed model — which is
  // correct in production and exactly wrong for a ladder test.
  await Index.fromEnv().namespace("cache").reset().catch(() => {});
}

function startServer(chaosEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["next", "start", "-p", String(PORT)], {
      env: { ...process.env, ...chaosEnv, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    currentServer = child;
    let ready = false;
    const onData = (buf) => {
      if (!ready && String(buf).includes("Ready")) {
        ready = true;
        setTimeout(() => resolve(child), 500);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      if (!ready) reject(new Error(`server exited early (${code})`));
    });
    setTimeout(() => !ready && reject(new Error("server start timeout")), 30000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!currentServer) return resolve();
    currentServer.on("exit", () => resolve());
    currentServer.kill("SIGTERM");
    setTimeout(resolve, 3000);
  });
}

async function chat(chatId, text, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        messageId: `${chatId}-m`,
        messages: [
          {
            id: `${chatId}-m`,
            role: "user",
            parts: [{ type: "text", text }],
          },
        ],
      }),
      signal: controller.signal,
    });
    const body = await res.text();
    return { status: res.status, body, runId: res.headers.get("x-workflow-run-id") };
  } finally {
    clearTimeout(timer);
  }
}

function textOf(body) {
  return [...body.matchAll(/"type":"text-delta"[^}]*"delta":"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => JSON.parse(`"${m[1]}"`))
    .join("");
}

// ---------------------------------------------------------------------------

console.log("\n== scenario 1: primary fails, fallback answers ==");
await resetState();
await startServer({ CHAOS_PRIMARY: "fail", CHAOS_FALLBACK: "ok", CHAOS_SAFETY: "ok" });
{
  const r = await chat(`cx1-${Date.now()}`, "What does he do?");
  const text = textOf(r.body);
  assert(
    "fallback rung answers",
    text.includes("platform engineering background") &&
      !text.includes("knowledgebase itself says"),
    text.slice(0, 120),
  );
  assert("no error chunk leaks to client", !r.body.includes('"type":"error"'), r.body.slice(-200));
  assert("stream completes", r.body.includes("[DONE]"));
}

console.log("\n== scenario 2: both models fail → raw knowledgebase answers ==");
{
  await resetState();
  await stopServer();
  await startServer({ CHAOS_PRIMARY: "fail", CHAOS_FALLBACK: "fail", CHAOS_SAFETY: "ok" });
  const r = await chat(`cx2-${Date.now()}`, "What did he do at Motorq?");
  const text = textOf(r.body);
  assert("raw KB rung answers", text.includes("knowledgebase itself says"), text.slice(0, 120));
  assert("raw answer carries passages", text.length > 200, `len=${text.length}`);
  assert("stream completes after degradation", r.body.includes("[DONE]"));
}

console.log("\n== scenario 3: breaker opens after repeated failures ==");
{
  for (let i = 0; i < 3; i++) await chat(`cx3-${i}-${Date.now()}`, `breaker test ${i}`);
  const open = await redisCall("GET", "breaker:primary:open");
  assert("primary breaker open after 3 failures", open === "1", String(open));
}

console.log("\n== scenario 4: truncated stream → fallback recovers, no client error ==");
{
  await resetState();
  await stopServer();
  await startServer({ CHAOS_PRIMARY: "truncate", CHAOS_FALLBACK: "ok", CHAOS_SAFETY: "ok" });
  const r = await chat(`cx4-${Date.now()}`, "Tell me about him");
  const text = textOf(r.body);
  assert(
    "recovers after mid-stream truncation",
    text.includes("platform engineering background") &&
      !text.includes("knowledgebase itself says"),
    text.slice(0, 150),
  );
  assert("truncation error held back from client", !r.body.includes('"type":"error"'));
}

console.log("\n== scenario 5: safety classifier down → fails open, still answers ==");
{
  await resetState();
  await stopServer();
  await startServer({ CHAOS_PRIMARY: "ok", CHAOS_FALLBACK: "ok", CHAOS_SAFETY: "fail" });
  const r = await chat(`cx5-${Date.now()}`, "What does he do?");
  assert(
    "guardrail fails open",
    textOf(r.body).includes("platform engineering background"),
  );
}

await stopServer();
await resetState();

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length > 0 ? 1 : 0);
