import { Redis } from "@upstash/redis";

/**
 * Upstash Redis over REST. The Vercel Marketplace integration provisions the
 * credentials under KV_* names, so we can't use Redis.fromEnv().
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});
