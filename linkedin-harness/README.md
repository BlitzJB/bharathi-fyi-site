# linkedin-harness

A Claude Code harness for high-performing LinkedIn posts. Built from research, not vibes: every rule traces to large-sample data or a vouched community asset — see `research/`.

## What's inside

| Piece | What | Provenance |
|---|---|---|
| `.claude/skills/linkedin-skills/` | 11 LinkedIn skills: post-writer (20 hook formulas w/ engagement data), humanizer V3, hook-extractor, repurposer, content-planner, comment-drafter, profile-optimizer… | Vendored from [sergebulaev/linkedin-skills](https://github.com/sergebulaev/linkedin-skills) (~1.1k★, MIT, built from a 100k+ post corpus) |
| `.claude/skills/humanizer/` | The canonical anti-AI-slop pass (35 pattern categories, voice-sample calibration) | Vendored from [blader/humanizer](https://github.com/blader/humanizer) (~44k★, by Siqi Chen) |
| `.claude/commands/` | `/voice-setup` `/ideate` `/draft` `/hooks` `/critique` `/repurpose` `/plan` `/calibrate` — the pipeline, wiring the skills to Welsh/Ship 30/Acosta/Alić/Kao frameworks | This repo (grounded in `research/creator-frameworks.md`) |
| `.claude/agents/post-critic.md` | Adversarial 100-point reviewer every draft must pass | This repo |
| `.claude/scripts/slop-check.py` + hook | Deterministic lint on every write to `posts/` (banned phrases, question-hooks, em-dash density, links-in-body, markdown leaks) — exit-2 feedback makes Claude fix violations immediately | This repo |
| `.mcp.json` | Exa (semantic research) + Typefully (ToS-safe draft/schedule queue), both remote OAuth | See `research/mcp-servers.md` |
| `research/` | The evidence base: algorithm data (evidence-tiered), creator frameworks, community-skill survey, MCP survey | 4 deep research sweeps, 2026-09 |

## Setup

1. **Start Claude Code in this directory.** Approve the project `.mcp.json` servers when prompted, then run `/mcp` to OAuth into Exa and Typefully (both optional — the harness works without them; drafts are handed over copy-paste).
2. **Run `/voice-setup`.** Nothing good happens before the voice profile is filled. Bring 5–10 of your real posts (with rough numbers) into `voice/samples/`.
3. **Write:** `/ideate` → `/draft <topic>` → pick a hook → post it yourself (or queue via Typefully) → reply to every comment for 60–90 min → `/calibrate` with the numbers a few days later.

### Optional power-ups

- **Read-side LinkedIn access** (study your feed/competitors): `claude mcp add linkedin -- uvx linkedin-mcp-server` — [stickerdaniel/linkedin-mcp-server](https://github.com/stickerdaniel/linkedin-mcp-server) (3.4k★). ⚠️ Uses your session cookie; LinkedIn ToS prohibits automation — reads only, sparingly, at your own risk.
- **Auto-publish via Publora** (the vendored skills' native backend, free 15 posts/mo): sign up at publora.com, put `PUBLORA_API_KEY` + `LINKEDIN_PLATFORM_ID` in `.env`, `pip install -r .claude/skills/linkedin-skills/requirements.txt`.
- **Apify read layer** for the comment-drafter/hook-extractor/engager-analytics skills: `APIFY_TOKEN` in `.env` (free $5/mo credit).

## Operating principles (the 20-second version)

Hook ≤140 chars, never a question, number-first. Body 900–1,300+ chars, 1/3/1 rhythm, one idea, specificity floor. No links in body, hashtags don't matter, carousels/images beat everything, never bare-reshare. 2–4 posts/week on 1–2 core topics. Humanize hard (LinkedIn's slop button costs flagged posts ~40% of views). Close with one conversation question. Then live in your comments for 90 minutes — that's where reach is decided.

Full rules with sources: `CLAUDE.md` and `research/`.
