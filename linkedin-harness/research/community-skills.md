# Research: Community Claude Code skills & harnesses for LinkedIn/content writing

> Compiled 2026-09-06. Star counts verified via GitHub API at research time.

## TIER 1 — Vouched / high-signal (adopt from these)

### 1. sergebulaev/linkedin-skills — THE LinkedIn-specific find
- https://github.com/sergebulaev/linkedin-skills (MIT, Apr 2026). **1,136 stars, 172 forks.** Author Serge Bulaev / "Creative Content Crafts"; skills derived from processing 100k+ LinkedIn posts. Matching bundles exist for X/Instagram/YouTube/TikTok. Passed a third-party security audit (agentskillshub.top).
- 11 skills: post-writer, humanizer, hook-extractor, comment-drafter, reply-handler, content-planner, thread-monitor, engager-analytics, profile-optimizer, repurposer, employee-advocacy. Plus `references/` (hook-formulas.md, algorithm-heuristics.md, voice-profile.md, voice-rules.md, etc.) and `lib/` Python utilities (Apify read, Publora publish).
- Key techniques in `linkedin-post-writer`:
  - 8-step workflow: load voice profile → gather inputs → pick formula by engagement goal → draft → humanizer pass → audit → optional image → approval → publish.
  - **20 named hook formulas with engagement numbers** (e.g. F7 "Odd-Precision Money Ledger" 9.4x, F2 "R.I.P. Obituary", F15 "Explain-to-Kids" save-heavy). Formulas mapped to goals: comments→F17/F10/F4/F12/F9; reposts→F14/F2/F8; likes→F11/F13/F16; saves→F15/F7/F8.
  - Opening-line rules (first 210 chars): never open with a question (−34% median likes; question at close = +3%); number-first preferred (+34%); no "Here's what/how", no "Stop X, start Y", no all-caps.
  - Density rules: max one contrast + one triple per post; ban reveal bridges ("The result?", "Plot twist:"); em dashes ≤1/100 words; 1–2-sentence paragraphs.
  - Length: 900–1,300 chars sweet spot; 1,000+ chars = 1.18x reach (AuthoredUp); don't trim substantive posts below 1,000.
  - Close: specific question at end; one-line P.S. +7.5%; 0–2 hashtags; links in first comment, never body.
  - **Specificity floor per 100 words: ≥1 specific number, ≥1 named entity, ≥1 first-person concrete detail.**
  - `linkedin-humanizer` V3 4-pass system: SCRUB (vocab tells; "-ing" sentence openers at 5.3x human rate) → RHYTHM (fix machine-flat sentence-length variance; ≤2 staccato fragments) → ADD (odd-precision numbers, sensory detail, one uncomfortable fact stated flat) → SELF-CHECK (over-scrubbing). Hard bans: negative parallelism ("It's not X, it's Y" = −4.9% reach), sincerity announcements, stacked parallel triads.

### 2. blader/humanizer — the canonical anti-AI-slop skill
- https://github.com/blader/humanizer — **43,758 stars, 3.7k forks.** Author Siqi Chen (Runway CEO). Most-vouched writing-quality skill in the ecosystem. `npx skills add blader/humanizer`.
- 35 pattern categories from Wikipedia's "Signs of AI writing": inflated importance, "serves as", "not X but Y", forced rule-of-three, synonym cycling, false ranges, em/en dashes banned unless in the writer's sample, bold mini-heading lists, decorative emojis, fake-candid openings, fake revelations, hedging, chatbot residue.
- Process: mark patterns → rewrite (structure not fixed) → two-question audit ("What still sounds AI-generated?" + "Did the rewrite add/remove facts, names, numbers, dates, quotes, claims?") → finalize.
- Voice calibration: a writing sample takes priority over style rules — match quirks including dash frequency.

### 3. coreyhaines31/marketingskills — vouched marketing mega-pack
- https://github.com/coreyhaines31/marketingskills — **47,229 stars, 7.3k forks.** Corey Haines (Swipe Files, Conversion Factory).
- 49 skills; relevant: `skills/social` — content-pillars (30% insights / 25% BTS / 25% educational / 15% personal / 5% promo), four hook families, platform table (LinkedIn: 3–5x/week, carousels + stories), "content atoms" repurposing taxonomy, `carousel-frameworks.md` (5 slide-by-slide architectures: Value-Stack, Problem-Proof, Hack List, Rant Callout, Demo Walkthrough). Also `copywriting`, `copy-editing`, `content-strategy` skills. Advisory/strategic — complements sergebulaev's execution rules.

### 4. samber/cc-skills → linkedin-ghostwriting — best interview/ghostwriting process
- https://github.com/samber/cc-skills (203 stars; Samuel Berthe of samber/lo fame).
- Strategic interview (8–14 questions): audience, business goal, exact before/after metrics with timeframes/sample sizes, mechanism (≤3 steps, action verbs), contrarian insight, credibility/cost/scene. **Hard gate: don't draft until you have (1) quantified metric, (2) counter-intuitive insight, (3) 2–3-step mechanism, (4) clear CTA.** Hook: "Reveal 80% (result), keep 20% (how)"; generate 3–5 hooks, user picks. Body: re-hook → ABT → maintained revelation rate → psychology lever → directive CTA; ≤2 visual lines per paragraph. Final humanization preserves the engineered hook.

### 5. anthropics/skills — architecture to copy
- https://github.com/anthropics/skills (~174k stars). No LinkedIn skill, but `internal-comms` is the canonical "house voice" pattern: **thin SKILL.md router + per-format guideline files + real writing samples.** Also `skill-creator` for authoring.

## TIER 2 — Smaller but content-rich

- **jalaalrd/anti-ai-slop-writing** (441 stars): 50+ banned words, 35+ banned phrases, 16 banned openers, 10 structural patterns. Cites Carnegie Mellon 2025, Buffer 52M-post analysis. Alt: Aboudjem/humanizer-skill (215 stars) — CLI scoring 0–100 on AI-tell signals.
- **WomenDefiningAI/claudecode-writer** (220 stars, MIT): best public **full .claude content workspace**: `.claude/` agents + commands (/research, /write), `context/` (writing samples for voice), `rawnotes/`, `drafts/`. Pipeline: ideas → themes → research → long-form → repurpose per platform.
- **attainmentlabs/linkedin-algorithm-skill** (5 stars but best-sourced): scoring weights Dwell 30% / Conversation 25% / Save-Share 20% / Format 15% / Safety 10%, every claim tagged CONFIRMED / LARGE-SCALE DATA / PRACTITIONER ESTIMATE. Sources: 5 arXiv papers, van der Blom, AuthoredUp, Buffer. Notables: "see more" click is a confirmed signal; comments of 15+ words rank higher; embeddings refresh ~30 min.
- **robertguss/claude-code-toolkit → ghost-writer** (113 stars): "Voice DNA Document" — refuses to draft without full voice profile; **always outputs 2 meaningfully different drafts** + 2–3 headlines each + confidence header + decision notes. "Collaborative partner, not order-taker."

## TIER 3 — Workflows worth copying (not repos)

- **Ruben Hassid** (claims +340k followers/yr organic): data-first voice pipeline — scrape your own/role-model posts (Apify) → CSV → Claude analyzes top-performer patterns → writes an SOP reverse-engineered from winners → SOP becomes a reusable skill. Strongest "vouched by results" methodology found. (ruben.substack.com/p/claude-linkedin)
- **Duncan Rogoff** (1,500→10k followers, 6k+ leads claimed): 3-skill system — trend research (Reddit/X/YouTube last-30-days) → lead-magnet generator with 3 variants (contrarian / pain-first / results-led) → voice-matched writer. Not open-sourced; replicate.
- **Every / Spiral 4.0** (Dan Shipper): ships MCP + CLI for Claude Code; "Style Engine" stylometry over past posts. Optional voice layer via MCP.

## TIER 4 — Noted, weaker evidence
- marian-kamenistak/linkedin-post-writing-skill (30 stars, honest practitioner, 6-step quality gate incl. read-aloud test); sociilabs/claude-content-writer (50 stars, verify gate with ≤4.0 violations/100 words for social); aplaceforallmystuff/the-antislop (28 stars); obra/superpowers `brainstorming` (one-question-at-a-time gate — same interview pattern as samber). Marketplaces (skills.sh, awesomeskill.ai, mcpmarket…) only mirror the above.

## Synthesis → what our harness adopts

**sergebulaev's post-writer rules + reference layout** (goal→formula mapping, opening/density/length/close rules, specificity floor) + **samber's interview gate** + **blader/humanizer as mandatory final pass with voice-sample calibration** + **anthropics internal-comms architecture** + **Ruben Hassid's bootstrap** (reverse-engineer SOP from your own top posts) + **robertguss's two-draft output format**. WomenDefiningAI/claudecode-writer is the closest full-harness skeleton.
