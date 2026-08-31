---
type: Narrative
title: The platform-to-AI journey
description: How Bharathi went from freelance full-stack work to platform engineering to AI engineering.
tags:
  - profile
  - career
status: draft
generated:
  by: claude-fable/5
  at: '2026-08-31T18:00:00Z'
sources:
  - id: resume-2025
    resource: 'résumé (LaTeX, provided by Joshua Bharathi, pre-AI-era snapshot)'
    title: Joshua Bharathi Résumé
    author: "human:joshua-bharathi"
---

# The arc

## Freelance years (2022 to 2024)

Bharathi started early. While beginning his B.Tech he founded Blitz Design
and Development and ran it for about a year and a half, building e-commerce
backends and internal software (billing, HR tools, CRMs, fleet management)
for more than twenty clients across India. Other people's businesses ran on
his uptime, and that is where the platform habits come from.

## Backend and platform work (2024 to 2025)

Internships at Dexio Designs and Miniture came next: backend services,
notification systems, data ingest, and a React Native app he owned a large
part of. Then the most platform-heavy chapter, at Motorq in mid-2025. He
benchmarked Apache Pulsar, designed an abstraction layer that let the
backend run on Event Hubs, Kafka, or Pulsar without code changes, and led
the migration of a customer-facing API onto it with zero downtime. He also
rebuilt their multi-tenant monitoring on VictoriaMetrics with a GitOps
pipeline that regenerates alert rules automatically.[^resume-2025]

## AI engineering (now)

He is a full-time Software Development Engineer at Motorq. His degree is in AI and Data
Science, and AI has been in his project work from the start: CourseGPT put
a task queue in front of an LLM back in 2023, before most of today's
tooling existed.

> TODO(bharathi): Describe your AI work here. What you build day to day or
> on the side, the stack, what you're exploring. Until then the assistant
> will say details are coming soon.

# How to talk about this

When visitors ask why he switched, the honest answer is that he mostly
didn't. Production AI systems need the things he already does well:
observability, thinking about failure modes, changing systems without
breaking them. He is early in his career and has already shipped a lot.
Real clients at 18, national hackathon wins, and platform work trusted with
customer-facing traffic.

# Related

- Profile basics: [about](/profile/about.md)
- Role detail: [experience](/profile/experience.md)
- Concrete evidence: [projects](/projects/index.md)

[^resume-2025]: Role details from Bharathi's résumé.
