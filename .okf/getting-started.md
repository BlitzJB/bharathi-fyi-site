---
type: Reference
title: How this knowledgebase works
description: Purpose and maintenance guide for the bundle that grounds the bharathi.fyi site assistant.
tags:
  - meta
  - maintenance
status: stable
generated:
  by: claude-fable/5
  at: '2026-08-31T16:20:00Z'
---

# Purpose

This OKF bundle is the **single source of truth for the AI assistant on
bharathi.fyi**. At request time the site compiles every non-deprecated concept
here into the model's system prompt. Whatever is written here is what the
assistant can say; whatever is missing, it should decline to invent.

# Maintaining it

- One concept per file; the path (minus `.md`) is the concept ID.
- Every concept needs frontmatter with a non-empty `type`. Add `title`,
  `description`, and `tags`, since the compiler surfaces them to the model.
- Concepts still carrying `TODO(bharathi)` markers are `status: draft`.
  Flip to `status: stable` (or just remove the line; absent means stable)
  once the content is real.
- Mark outdated concepts `status: deprecated` instead of deleting them; the
  site compiler skips deprecated concepts.
- Update the relevant `index.md` and add a dated entry to `log.md` when the
  bundle changes.

# Map

- [profile/about](/profile/about.md): bio, skills, links
- [profile/journey](/profile/journey.md): the platform→AI story
- [projects/](/projects/index.md): one concept per project
- [faq](/faq.md): canonical answers for common visitor questions
