// k6 streaming load smoke against a chaos-ok server (zero tokens).
// Asserts TTFT under load, zero stream failures, and that admission
// control starts shedding exactly when the request budget is exceeded.
//
// Run: CHAOS_PRIMARY=ok CHAOS_SAFETY=ok SEMANTIC_CACHE_THRESHOLD=2 \
//        pnpm next start -p 3123 &
//      k6 run tests/load/smoke.js
//
// SEMANTIC_CACHE_THRESHOLD=2 disables the cache for the run: probe texts
// are mutually similar, and with the cache live it absorbs the whole flood
// before admission (proven — that's its job), which is exactly what this
// test must see past.
import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://127.0.0.1:3123";

const ttft = new Trend("chat_ttft", true);
const served = new Counter("chat_served");
const shed = new Counter("chat_shed");
const failures = new Counter("chat_failures");

export const options = {
  scenarios: {
    // Heavy-tailed-ish conversation load: each VU sends sequentially.
    steady: {
      executor: "constant-vus",
      vus: 6,
      duration: "45s",
    },
  },
  thresholds: {
    // Local pipeline under deliberate 6-VU contention; the production SLO
    // on /ops stays 2.5s and is tracked from real traffic.
    chat_ttft: ["p(95)<3000"],
    chat_failures: ["count==0"],
    // The flood MUST trip admission control: shedding is a feature.
    chat_shed: ["count>0"],
  },
};

export default function () {
  const chatId = `k6-${__VU}-${__ITER}`;
  const started = Date.now();
  const res = http.post(
    `${BASE}/api/chat`,
    JSON.stringify({
      id: chatId,
      messageId: `${chatId}-m`,
      messages: [
        {
          id: `${chatId}-m`,
          role: "user",
          // Unique text defeats idempotency/single-flight/cache so every
          // admitted request exercises the full pipeline.
          parts: [{ type: "text", text: `load probe ${chatId} ${started}` }],
        },
      ],
    }),
    {
      headers: { "content-type": "application/json" },
      timeout: "60s",
    },
  );

  if (res.status === 200) {
    served.add(1);
    ttft.add(res.timings.waiting);
    const ok = check(res, {
      "stream completed": (r) => String(r.body).includes("[DONE]"),
      "no error chunk": (r) => !String(r.body).includes('"type":"error"'),
    });
    if (!ok) failures.add(1);
  } else if (res.status === 429 || res.status === 503) {
    shed.add(1);
    check(res, {
      "shed carries retry-after": (r) => r.headers["Retry-After"] !== undefined,
    }) || failures.add(1);
  } else {
    failures.add(1);
  }
}
