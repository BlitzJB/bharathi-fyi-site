# bharathi.fyi

Personal site for Bharathi — platform engineer turned AI engineer. Next.js
App Router, an MDX blog, and a landing-page AI assistant grounded in a
curated knowledgebase.

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| Landing page | `app/page.tsx` | Split hero: positioning left, chat right |
| Blog | `content/blog/*.mdx` + `app/blog/` | File-based, frontmatter-driven |
| Chat API | `app/api/chat/route.ts` | Vercel AI SDK `streamText` via AI Gateway |
| Knowledgebase | `.okf/` | OKF v0.2 bundle — the chat's single source of truth |
| KB compiler | `lib/knowledge.ts` | Folds the bundle into the model's system prompt |

## Local development

```sh
pnpm install
cp .env.example .env.local   # add your AI_GATEWAY_API_KEY
pnpm dev
```

Everything except chat answers works without the key; without it the chat
shows a friendly error when asked.

## Writing a post

Add `content/blog/my-post.mdx`:

```yaml
---
title: "My post"
date: 2026-09-01
description: "One-sentence summary shown in lists and meta tags."
tags: [ai-engineering]
draft: false        # true hides it in production builds
---
```

The slug is the filename. Code blocks are highlighted with Shiki
(`vitesse-light`).

## Editing what the assistant knows

The assistant answers **only** from `.okf/`. Each markdown file there is one
concept with YAML frontmatter (`type` is required). Workflow:

1. Edit or add a concept (see `.okf/getting-started.md` for conventions).
2. Replace `TODO(bharathi)` markers with real content and flip
   `status: draft` to stable (or remove the line).
3. Update `.okf/index.md` and add a dated entry to `.okf/log.md`.
4. Concepts marked `status: deprecated` are excluded from the prompt.

In dev the bundle is re-read on every request; in production it's compiled
once per server instance, so redeploy after KB changes.

## Deploying (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Enable AI Gateway on the project (chat auth is automatic via OIDC), or set
   `AI_GATEWAY_API_KEY` as an environment variable.
3. Optionally set `CHAT_MODEL` (defaults to `openai/gpt-oss-120b`).

The chat route caps input length, history depth, and output tokens. For a
high-traffic site, add rate limiting (Vercel WAF or middleware) on
`/api/chat` — it spends your gateway credits.

## Remaining personalization

Search the repo for `TODO(bharathi)`: real bio/projects in `.okf/`, social
links in `components/site-footer.tsx` and `app/page.tsx`, and replace the
starter post in `content/blog/`.
