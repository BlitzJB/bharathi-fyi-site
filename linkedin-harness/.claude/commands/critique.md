---
description: Score a draft with the post-critic agent and return concrete fixes
---

Critique this draft (a file path in posts/, or pasted text): $ARGUMENTS

1. Load the draft. If it's a file, read it; count characters of the `# Post` section only.
2. Send it to the `post-critic` agent for the full rubric score.
3. Additionally run the vendored `linkedin-humanizer --mode audit` for AI-tell and algorithm checks.
4. Report to the user: total score, the 3 highest-impact fixes first (with rewritten lines, not just descriptions), then the rest. If the hook is weak, include 3 replacement hooks from the formula library.
5. Only if the user asks, apply the fixes to the file.
