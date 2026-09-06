# Research: MCP servers for a LinkedIn content harness

> Compiled 2026-09-06 from ~20+ web searches. Evidence-rated. This file informs `.mcp.json` choices.

## Structural finding

**No single MCP covers the whole loop.** Reads (feed, profiles, competitor posts) only exist via cookie-scrapers or paid scraping APIs (LinkedIn ToS risk); writes are safe via the official API or scheduler SaaS but can't read anything. A sane harness pairs:
one safe writer + one risk-flagged reader + one research MCP.

There is **no official LinkedIn MCP** (confirmed by multiple 2026 sources, e.g. https://www.usecarly.com/blog/linkedin-mcp/). Official API posting is self-serve only for your own member posts (`w_member_social`, ~500 calls/day); everything richer is partner-gated.

## LinkedIn-specific servers

### stickerdaniel/linkedin-mcp-server — the vouched reader
- https://github.com/stickerdaniel/linkedin-mcp-server — **~3,400 stars**, 586 forks, actively maintained (v4.4.x), sponsored by Unipile. Clearly the most-used LinkedIn MCP.
- Read-only + messaging: `get_person_profile`, `get_company_profile`, `search_people`, `get_feed`, `get_job_details`, `get_inbox`, `send_message`. **Cannot post.**
- Auth: your logged-in browser session (Patchright Chromium, session cookie). Install: uvx (recommended), Docker, .mcpb bundle.
- Risk: README explicitly warns LinkedIn ToS prohibits automation; accounts can be restricted/banned; sessions expire. Use sparingly, reads only.

### Official-API posters (ToS-safe, but unproven repos)
- **souravdasbiswas/linkedin-mcp-server** (7 stars): create text/article/image posts, comment, react via official API (OAuth, own free dev app, `w_member_social`). The ToS-safe pattern, but young.
- **gacabartosz/linkedin-mcp-server** (5 stars): richest write side — 24 tools: post CRUD, scheduling w/ background publisher, media upload, 12 templates, Gemini image gen. Official OAuth, 60-day auto-refresh tokens. Very new, essentially untested — read the code before running.

### Skip / long tail
- **adhikasp/mcp-linkedin** (~206 stars): unmaintained since Jan 2025, repo 404s, raw email+password auth. Skip.
- **HorizonDataWave hdw-mcp-server** (~41 stars, rebranded Anysite): scraping-API-backed search/posts/messaging; paid ($49–$1,199/mo).
- **felipfr/linkedin-mcpserver** (~56 stars): profile/job search + messaging; not content-focused.
- **southleft/linkedin-mcp**: content-intelligence positioning but cookie auth expiring every 24–48h, small community.
- **Unipile-based** (bhaktatejas922/unipile-linkedin-mcp, Sundeepg98/mcp-server-unipile — 95 tools): paid managed session API, outreach/CRM-oriented.

### Hosted schedulers (ToS-safe publishing)
- **Typefully MCP** — https://mcp.typefully.com/mcp — official hosted remote MCP, OAuth. Create/edit/schedule drafts across LinkedIn/X/Threads/Bluesky/Mastodon, queue, media. `claude mcp add typefully --transport http --url "https://mcp.typefully.com/mcp"`. Drafts-first model fits human-in-the-loop.
- **Postiz MCP** — https://postiz.com/mcp — official; `https://api.postiz.com/mcp/YOUR_KEY`; ~11 tools, 30+ platforms; **open-source and self-hostable** (key advantage).
- **Buffer MCP** — https://buffer.com/mcp — official hosted, OAuth, free tier, queue approval.
- **Late** — https://github.com/htekdev/late-social-mcp — 47 tools, npm + LATE_API_KEY, paid API.
- **Composio LinkedIn toolkit** — https://composio.dev/toolkits/linkedin — ~22 tools, managed OAuth incl. company pages; SaaS dependency.
- Taplio / ContentIn hosted MCPs: fine if already a customer; lock-in otherwise.

## Adjacent MCPs

- **Exa** — https://github.com/exa-labs/exa-mcp-server; remote `https://mcp.exa.ai/mcp`; official Claude Code plugin (`claude plugin install exa@claude-plugins-official`). Semantic search — good for "find posts/articles like X". First-party, well maintained.
- **Firecrawl** — best-in-class page extraction + deep-research agent.
- **Tavily** (~$8/1k), **Perplexity** ($5/1k) — agent-tuned search / synthesized cited answers.
- Note: Claude Code has built-in WebSearch/WebFetch — a research MCP only earns its slot for semantic search (Exa) or hard-to-scrape pages (Firecrawl).
- Trends/listening: Octolens MCP (paid, 11 platforms incl. LinkedIn), Hacker News MCPs (free — great for dev-audience ideas), mcp-reddit, Google-Trends MCPs.
- Image gen: merlinrabens/image-gen-mcp-server (multi-provider), writingmate/imagegen-mcp; Canva hosted connector; Postiz MCP also exposes image/video gen.

## Recommended shortlist for `.mcp.json`

1. **Typefully MCP** (remote, OAuth) — publish/schedule path, zero ToS risk, drafts-first. Alternatives: Postiz (self-hostable) or Buffer (free tier).
2. **Exa MCP** (remote) — research/inspiration layer.
3. **stickerdaniel/linkedin-mcp-server** (uvx) — the only credible LinkedIn reader; flag as "reads only, cookie session, ToS risk".
4. Optional: an official-API poster (gacabartosz/souravdasbiswas — read code first) to skip scheduler SaaS; or a free Hacker News MCP for dev-audience trends.

## Wiring patterns seen in the wild

- Remote HTTP: `claude mcp add --transport http <name> <url>` then `/mcp` for OAuth.
- Local stdio: `.mcp.json` with `uvx`/`npx` command + env keys.
- Published pipelines (LinkedMash, "LinkedIn content engine" on Substack, Postiz blog) share one shape: research MCP → draft in repo files → scheduler MCP publishes, human approves via the scheduler's queue.

## Sources

stickerdaniel, gacabartosz, souravdasbiswas repos; ContentIn & Taplio MCP comparisons; usecarly.com (no official MCP); Typefully/Postiz/Buffer MCP docs; late-social-mcp; Exa docs+repo; contextbolt web-search MCP comparison; Octolens; Composio; HDW/Anysite; PulseMCP (adhikasp); southleft; Unipile MCPs; merlinrabens image-gen; LinkedMash pipeline; code.claude.com/docs/en/mcp.
