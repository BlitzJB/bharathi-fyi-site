# Posts

- `drafts/YYYY-MM-DD-slug.md` — work in progress
- `published/` — shipped posts; add real performance numbers to frontmatter as they come in (`/calibrate` mines these)
- `plan-YYYY-WW.md` — weekly plans

## Draft file format

```markdown
---
status: draft | review | approved | published
format: text | image | carousel | video
formula: F7            # from the hook-formulas library
goal: comments | reposts | likes | saves
topic: one line
critic_score: 87
hook_chosen: 2
# after publishing:
posted_at: 2026-09-10
impressions:
reactions:
comments:
saves:
---

# Hook options
1. ...
2. ...
3. ...

# Post

<paste-ready body: real line breaks, NO markdown - LinkedIn renders none.
Chosen hook as the first line.>

# Post (variant B)

<the second, meaningfully different draft>

# First comment (optional)
<link / bonus / extra context>

# Notes
<formula rationale, critic findings, what to watch>
```
