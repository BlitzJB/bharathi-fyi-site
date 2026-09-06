# LinkedIn Post Harness

This project exists to produce high-performing, high-quality LinkedIn posts. Every deliverable is a post (or a batch of posts) as markdown files under `posts/`.

## Non-negotiables

1. **Read `voice/voice-profile.md` before writing a single word.** If it still contains `TODO` placeholders, interview the user to fill it in before drafting — a post in the wrong voice is worthless no matter how well-crafted.
2. **Every draft goes through the critique loop.** Never hand over a first draft. Draft → self-critique against the rubric in the `linkedin-writing` skill → revise → run the slop linter (it runs automatically on save via hook) → only then present.
3. **One post = one idea.** If a draft contains two ideas, split it into two drafts.
4. **Specificity over polish.** Real numbers, real names, real failures. A rougher post with a concrete detail beats a smooth post full of abstractions.

## Workflow

| Command | What it does |
|---|---|
| `/ideate` | Generate post ideas from a topic, experience, or recent work |
| `/draft` | Write a post (picks format, writes 3 hook options, full body) |
| `/critique` | Score an existing draft against the rubric, list concrete fixes |
| `/hooks` | Generate 10 alternative hooks for a draft |
| `/repurpose` | Turn an article, README, changelog, or transcript into post(s) |
| `/polish` | Final pass: rhythm, whitespace, slop removal, mobile preview check |

## File layout

- `voice/voice-profile.md` — who is posting, their voice, audience, and topics. The source of truth.
- `voice/swipe-file.md` — posts (theirs and others') that worked, with notes on why. Add to it whenever the user shares a winner.
- `posts/drafts/YYYY-MM-DD-slug.md` — work in progress. Frontmatter tracks status, format, and hook variants.
- `posts/published/` — shipped posts. Move a draft here when the user says it's posted; record performance numbers in its frontmatter when the user reports them, and mine these for what works.
- `research/` — raw material: notes, links, transcripts to repurpose.

## Draft file format

```markdown
---
status: draft | review | approved | published
format: <one of the formats in the post-formats skill>
topic: <one line>
hook_chosen: 1
---

# Hook options
1. ...
2. ...
3. ...

# Post

<the post body, formatted exactly as it would be pasted into LinkedIn>

# Comment (optional)
<first comment: the link, the CTA, or extra context>
```

The `# Post` section must be paste-ready: real line breaks, no markdown syntax (LinkedIn renders none of it — no `**bold**`, no `#` headers, no `[links]()`).

## Skills in this harness

- `linkedin-writing` — the core craft: structure, rhythm, the critique rubric, the banned-slop list. Load for any drafting or editing.
- `linkedin-hooks` — hook patterns and the 210-character rule. Load when writing or fixing hooks.
- `post-formats` — the format library with skeletons. Load when choosing how to frame an idea.

## Research

Use WebSearch/WebFetch to fact-check any claim, number, or name before it goes in a post. A wrong stat on LinkedIn is a credibility wound. If the user has the Chrome extension connected, you can browse LinkedIn directly to study what's currently working in their feed or niche — but never post, comment, like, or send messages on their behalf without explicit per-action confirmation.
