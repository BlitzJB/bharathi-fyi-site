---
type: Project
title: Portfolio site with grounded AI chat
description: bharathi.fyi, a Next.js portfolio with an MDX blog and an AI assistant grounded in this knowledgebase.
tags:
  - project
  - ai-engineering
resource: https://bharathi.fyi
status: stable
generated:
  by: claude-fable/5
  at: '2026-08-31T16:20:00Z'
---

# What it is

This website. A statically-rendered Next.js site with two notable parts:

1. **MDX blog**: file-based writing, no CMS.
2. **Grounded AI chat**: the assistant on the landing page answers questions
   about Bharathi using exactly this knowledgebase (an Open Knowledge Format
   bundle checked into the site's repo). The bundle is compiled into the
   model's system prompt at request time, so updating a markdown file here
   updates what the assistant knows.

# Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- Vercel AI SDK with an open-weights model served through Vercel AI Gateway
- OKF v0.2 knowledge bundle as the single source of truth for the assistant

# Why it's on the list

It demonstrates the platform-to-AI positioning in miniature: a well-factored
content pipeline (platform instinct) feeding a grounded, cost-conscious LLM
feature (AI engineering instinct).

# Related

- [about](/profile/about.md), [journey](/profile/journey.md)
