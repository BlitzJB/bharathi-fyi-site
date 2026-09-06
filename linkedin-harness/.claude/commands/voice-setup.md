---
description: Ghostwriter-style voice interview + top-post reverse-engineering; fills the voice profile the skills depend on
---

Build or refresh the user's voice profile. Target file: `.claude/skills/linkedin-skills/references/voice-profile.md` (follow its template structure; set `filled: yes` when done). Input, if any: $ARGUMENTS

Two tracks — run both when possible:

## Track 1 — Data first (Ruben Hassid method, strongest evidence)

1. Ask the user for 5–15 of their past LinkedIn posts (pasted, or files dropped into `voice/samples/`), ideally with rough performance (impressions/reactions/comments) so winners are identifiable. Also accept posts from a role model they want to sound like — but keep those separate; we match *their* voice, not the role model's.
2. Save each sample into `voice/samples/` as its own file.
3. Analyze the corpus like a stylometrist: sentence length distribution and rhythm (punchy vs flowing, fragment frequency), vocabulary level and jargon, repeated intensifiers and signature phrases (collect 10–15), native metaphor domains, humor style, emotional register, em-dash/emoji/punctuation habits, how they open and close, story-mode vs explain-mode.
4. For the top-performing samples specifically: reverse-engineer WHY they worked (hook pattern, format, specificity, topic) and write the findings into `voice/swipe-file.md`.

## Track 2 — Interview (agency voice-bible process)

Ask ONE question at a time. Use scene-based prompts, never reflective ones — "Take me to the day you decided to X. Where were you?" not "What did you learn?". Chase sensory detail and verbatim phrasing. Avoid yes/no and leading questions. Cover:

1. Who are you professionally, and who is the ONE reader you're writing to? (role, seniority, what they're struggling with this month)
2. What outcome should LinkedIn produce — audience, leads, hires, investors, credibility? (This sets the goal-mix for formulas.)
3. Your 1–2 core topics. (360Brew rewards topic authority; ~80% of posts should live here.)
4. "What did you tell a client/colleague/investor last week that made them lean forward?" (the single best voice question — repeat variants of it)
5. Strong opinions others in your field would push back on.
6. Words/phrases you'd never use; words you overuse. Emoji tolerance. Em-dash tolerance.
7. How personal are you willing to get (failures, money numbers, health, family)? What's off-limits?

## Output

Fill `voice-profile.md` with: voice fingerprint (rhythm, vocabulary, tics — with 10+ verbatim example sentences from samples), never-say list, tone/emotional range, core topics + audience + goal mix, CTA/link style, personal-disclosure boundaries, brand fields.

Then write 3 short calibration snippets (2–3 sentences each) in slightly different registers and ask "Which sounds most like you? What words would you never say?" Adjust the profile from their answer.
