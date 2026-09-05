import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ajv (pulled in by the workflow step handler) uses dynamic require and
  // breaks when bundled; load it from node_modules at runtime instead.
  serverExternalPackages: ["ajv"],
  // The chat workflow reads the OKF knowledgebase from disk at request time;
  // make sure the bundle ships with every serverless function that needs it
  // (workflow steps execute outside the /api/chat route's module graph).
  outputFileTracingIncludes: {
    "/**": ["./.okf/**/*"],
  },
};

export default withWorkflow(nextConfig);
