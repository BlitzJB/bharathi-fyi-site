---
description: Full drafting pipeline - substance gate, formula pick, draft, humanize, critic review, two drafts + hooks
---

Write a LinkedIn post about: $ARGUMENTS

Follow the pipeline in order. Do not skip gates.

1. **Voice gate.** Load `.claude/skills/linkedin-skills/references/voice-profile.md`. If not `filled: yes`, stop and run `/voice-setup` first.

2. **Substance gate** (hard, from samber/cc-skills). Confirm you have: a quantified metric or dated concrete fact · a counter-intuitive insight · a mechanism in ≤3 steps · one clear CTA target. Missing pieces → interview with scene-based questions (one at a time, ≤5 questions). Do not draft around the gaps.

3. **Verify facts.** WebSearch any external number, name, or claim. Flag anything unverifiable to the user.

4. **Goal & formula.** Ask or infer the engagement goal (comments / reposts / likes / saves), then use the `linkedin-skills` post-writer skill: shortlist 2–3 of its F1–F20 formulas by goal + topic (founder angles A1–A10 if the user is a founder). Recommend one; also recommend the post format with its 2026 reach data (document/carousel 1.39x, image 1.20x, text 1.07x — suggest a carousel or image when the content is tactical).

5. **Draft — body first, hook last (Welsh).** Apply the operating rules in CLAUDE.md: 900–1,300 chars (never trim substance below 1,000), 1/3/1 rhythm, specificity floor per 100 words, density rule, no links in body, 0–2 hashtags, close with a specific question + optional P.S. Check the draft's last line — if it's the power line, promote it to the hook (Alić). Run Wes Kao's MOO check: name the most obvious objection and pre-empt it in the text.

6. **Humanize.** Run the `humanizer` skill calibrated against `voice/samples/`, then the vendored `linkedin-humanizer --mode audit`. Both must pass.

7. **Critic.** Send the draft to the `post-critic` agent. Apply fixes for anything scored ≥ major. Re-run the critic if the rewrite was substantial.

8. **Deliver.** Save to `posts/drafts/YYYY-MM-DD-slug.md` (format in `posts/README.md`) with **two meaningfully different drafts** (e.g. different formula or angle, not a light rewrite) and **3–5 hook options each**, char counts, the formula used, and the critic's final score. Present hooks first, ask the user to pick, and remind them of the golden-window plan: post, then reply to every comment in the first 60–90 minutes.
