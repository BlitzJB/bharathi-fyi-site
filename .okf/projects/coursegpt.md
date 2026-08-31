---
type: Project
title: CourseGPT
description: GenAI platform for generating large, structured courses. Runner-up at Envision '23.
tags:
  - project
  - genai
  - llm
resource: https://coursegpt.vercel.app/
status: stable
generated:
  by: claude-fable/5
  at: '2026-08-31T17:10:00Z'
sources:
  - id: resume-2025
    resource: 'résumé (LaTeX, provided by Joshua Bharathi, pre-AI-era snapshot)'
    title: Joshua Bharathi Résumé
    author: "human:joshua-bharathi"
---

# What it is

A GenAI-based platform for creating **large, structured courses**. Users
shape a course outline in a drag-and-drop editor, then an LLM pipeline
generates the full content. **Runner-up at Envision '23** (state-level
hackathon powered by Google, at SSN College of Engineering).

# What Bharathi built

- The **text-generation service**: an LLM (Llama 2) pipeline behind a **task
  queue** designed to absorb any level of incoming traffic **without data
  loss**, streaming results back over server-sent events.
- The **frontend**: an intuitive drag-and-drop UI for editing the course
  outline before kicking off generation.

# Stack

React, Python, Llama 2, Azure, Tesseract, Flask, SSE.

# Why it matters

He was engineering LLM features like infrastructure back in 2023, before
most of the current tooling existed. The generation pipeline had a queue so
it never lost a request, and it streamed results as they came.

# Related

- [awards](/profile/awards.md), [journey](/profile/journey.md)
