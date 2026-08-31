import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The chat route reads the OKF knowledgebase from disk at request time;
  // make sure the bundle ships with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/chat": ["./.okf/**/*"],
  },
};

export default nextConfig;
