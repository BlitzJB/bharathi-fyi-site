// One-shot: fold the per-day metric hashes into the all-time aggregate so
// nothing resets when the engine room switches to cumulative numbers.
// Run: node --env-file=.env.local scripts/migrate-metrics-alltime.mjs
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const dayKeys = (await redis.keys("metrics:2*")).filter((k) =>
  /^metrics:\d{4}-\d{2}-\d{2}$/.test(k),
);
dayKeys.sort();
console.log("day hashes found:", dayKeys);

const totals = {};
for (const key of dayKeys) {
  const hash = (await redis.hgetall(key)) ?? {};
  for (const [field, value] of Object.entries(hash)) {
    totals[field] = (totals[field] ?? 0) + (Number(value) || 0);
  }
}
if (Object.keys(totals).length > 0) {
  await redis.hset("metrics:all", totals);
}
console.log("all-time totals:", totals);

for (const kind of ["ttft", "duration"]) {
  const listKeys = (await redis.keys(`metrics:${kind}:2*`)).sort();
  const samples = [];
  for (const key of listKeys) {
    samples.push(...(await redis.lrange(key, 0, 499)));
  }
  if (samples.length > 0) {
    await redis.del(`metrics:${kind}:all`);
    await redis.lpush(`metrics:${kind}:all`, ...samples.slice(0, 500));
  }
  console.log(`${kind}: merged ${samples.length} samples from`, listKeys);
}

const since = dayKeys[0]?.slice(8) ?? new Date().toISOString().slice(0, 10);
await redis.set("metrics:since", since, { nx: true });
console.log("since:", await redis.get("metrics:since"));
