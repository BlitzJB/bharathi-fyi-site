# Research: LinkedIn post performance — the data (2025–2026)

> Compiled 2026-09-06 from primary large-sample sources: Richard van der Blom's Algorithm Insights Reports (5th ed. 2024, ~1.5M posts; 6th ed. 2025, ~1.8M posts/400K profiles; 7th ed. 2026, ~1.3M posts), AuthoredUp (3M+ posts, Mar 2025–Feb 2026), Metricool (673,658 posts, 63,108 accounts), Socialinsider (1.3M company-page posts, 16,645 pages), LinkedIn's engineering blog and press statements.
>
> **Evidence tiers:** [A] = LinkedIn official, [B] = large-sample third-party study, [C] = practitioner claim / uncorroborated single source, [F] = folklore (circulates widely, no primary source, or contradicted by data).

## 1. The macro story: reach collapsed, and where it went

- **Views down ~50%, engagement down ~25%, follower growth down ~59% YoY** — van der Blom, Algorithm Insights 2025 (1.8M posts). [B]
- **Reach down ~60% for active creators over two years; engagement only down 20–25%** (so engagement *rate* per view improved); **casual creators up 10–15%** — reach redistributed away from power users. van der Blom, Creator Science podcast, 2026. [B]
- **AuthoredUp corroboration: 98% of tracked users saw reach decline; median impressions fell from 1,211/post (Jun 2024) to 636/post (May 2025), −47%.** [B]
- **Feed composition shifted toward big accounts and paid**: Top Creator content 15% of feed (2022) → 31% (2025); "other creators" 57% → 28%; organic company content ~2%; ~9–10% is algorithmic "Suggested Posts" from non-connections. [B]
- Company pages counterpoint: Socialinsider's 1.3M-post benchmark shows average engagement rate *rising* to **5.20% (+8% YoY)** in 2026 — up because impressions are down. [B]
- **Metricool (2025 vs 2026): likes −13%, comments −17%, shares −10%, but total engagement +14%** driven by "invisible interactions" (clicks, carousel swipes, video views). [B]

## 2. How the feed actually works

- **Three stages**: (1) instant spam/quality classification; (2) test to a sample of your network for roughly the first 60–90 minutes, measuring dwell + early engagement; (3) wider distribution if the test passes. Staged model well-documented directionally [A/B]; exact timings are estimates [C].
- **Dwell time is an explicit ranking input.** LinkedIn Engineering (2020, still current): two dwell types — "on feed" (≥half the post visible while scrolling) and "after the click"; clicks alone are "rare… binary… noisy," so they built a **P(skip) model** with a skip threshold used in ranking. [A]
- **2025–2026 architecture: 360Brew**, a 150B-parameter decoder-only foundation model (Mixtral 8x22 base) that ranks by reading profiles, posts and interaction history as *natural language* — it infers topic, expertise, and relevance semantically, not from hashtags/keywords. arXiv 2501.16450, Jan 2025. [A] Mechanical basis for "topic authority": post consistently on 1–2 topics aligned with your profile (van der Blom: ~80% of content on core topics). [B/C]
- **Relevancy over recency**: posts surface for days–weeks if topically relevant; Hootsuite reports 2–3 week visibility windows; van der Blom calls the interest-graph shift "the biggest change in 10 years." [B]
- **What LinkedIn says it rewards** (Entrepreneur interview, June 2023 — canonical official statement): content "grounded in **knowledge and advice**," in your demonstrated area of expertise, sparking **meaningful comments**. Dan Roth (Editor in Chief): virality "is not celebrated internally." Cited results: −80% complaints about irrelevant content, ~+40% out-of-network discovery of knowledge posts. [A]
- **Engagement bait & polls officially downranked** (2022): posts expressly asking for likes/reactions won't be promoted; "too many polls in the feed." [A]

## 3. Engagement signal hierarchy

- **Comments > saves/reposts > reactions** — well-supported directionally [A/B]. Circulating exact multipliers ("comments = 15x a like") have **no primary source** [F]. Best-sourced:
  - Comments weighted roughly **2x likes**; posts whose comments get **replies see ~2.4x reach** — AuthoredUp 2025. [B]
  - **Saves ≈ 5x the reach value of a like, ~2x a comment** — Hootsuite citing 3M+ post analysis, 2026. [B]
  - **Author replying to comments within 1–2h ≈ +20–30% additional reach**; adding 2–4 of your own replies after the first hour re-inserts the post into participants' feeds (~+25%) — van der Blom. [B/C]
  - First-hour comments weighted several times higher than late ones — practitioner consensus, no primary number. [C]
- **AI comment pollution**: van der Blom: ~80% of comments arriving in his first 5 minutes are AI-generated; claims LinkedIn pod/AI-comment detection ~97% accurate. [C→B]
- **Reshares without commentary are the worst format**: 0.29x reach, 0.22x engagement (AuthoredUp, 3M posts). [B]

## 4. Format reach multipliers

**AuthoredUp, 3M+ posts, personal profiles, Mar 2025–Feb 2026** [B]:

| Format | Reach | Engagement | Share of posts |
|---|---|---|---|
| Poll | 1.78x | **0.37x** | 1.2% |
| Document/carousel | 1.39x | 1.30x | 4.9% |
| Image | 1.20x | 1.33x | 57% |
| Text-only | 1.07x | 0.78x | 12% |
| Video | **0.86x** | 0.93x | 11% |
| Article | 0.69x | 0.44x | 6% |
| Reshare | 0.29x | 0.22x | 8% |

**Socialinsider, 1.3M company-page posts, 2026** [B]: native documents 7.00% ER (+14%), multi-image 6.45%, video 6.00%, image 5.30%, text 4.50%, poll 4.20%, **link posts 3.25% (worst)**.

**Metricool 2026** [B]: carousels get **17x the interactions of single images** and ~2.4x the impressions of video (1,451 vs 606 avg) — yet images are posted 6x more often. Video is now the *most-used* personal format while *underperforming* carousels/images.

Takeaways: **documents/carousels are the durable winner across every dataset since 2023**. **Polls = reach trick with dead engagement** (and officially disliked). **Video was pushed in 2024–25 (watch time +36% YoY [A]) but organic video reach regressed by 2026** (0.86x; Socialinsider video views −36% YoY). Videos >3 min slightly outperform (1.21x) vs 0–30s clips (0.96x) — AuthoredUp. [B]

## 5. Length, hooks, hashtags, links

- **Truncation ("see more")**: ~**210 chars / 3 lines desktop, ~140 chars mobile**, whichever runs out first; line breaks consume lines; Unicode bold counts double. ~72% of usage / ~91% of engagement is mobile → **budget the hook at ≤140 chars**. [B]
- **Hook A/B evidence is thin**: "7x reach from the opening line", "+40% CTR for mistake-framed hooks" circulate without methodology. [C/F] Solid part: truncation mechanics + dwell logic (the hook determines the see-more click, which is dwell). 
- **Length**: AuthoredUp (372K posts): **1,301–2,500 chars = +27% engagement** vs <400 chars. van der Blom 2025: **800–1,000 chars** reach sweet spot. Safe read: substantive 800–2,500 chars beats one-liners and essays; document-post captions short (<100 chars = 1.28x reach). [B]
- **Hashtags: dead.** No positive reach effect; 3–5 slightly negative; 6+ clearly negative; profile hashtags removed Feb 2024; 360Brew reads semantics. "3–5 optimal hashtags" is 2020-era folklore. [B/A; folklore = F]
- **External links**: best current number: **one link in body = −18.8% median reach** (van der Blom, 1.3M posts, 2026). [B] Older figures (−25–50%) are 2023–24 era. Van der Blom says the "link in first comment" hack is now unnecessary; comment links may themselves be de-emphasized. Claims like "4+ links give 3–5x reach" are AI-SEO garbage. [F]

## 6. Timing, frequency, golden hour

- **Golden window: first 60–90 minutes** decides the distribution test. [B, consistent with A] The "only ~5% of underperformers recover" claim is single-source. [C]
- **Warming**: engaging with others 15–30 min before/after posting ≈ +20% reach — van der Blom. [C]
- **Frequency**: optimal now **2–4 posts/week**; daily posting shows −26% average reach per post; 2–4x/week vs 1x adds ~1,200 impressions/post (van der Blom 2026 [B/C]). AuthoredUp: 4–5 posts/week best combo (2.60% ER, 870 median impressions). [B] More than once per ~18–24h cannibalizes the earlier post. [C]
- Best-time-of-day claims contradict each other across sources; with relevancy-over-recency, posting time matters less than ever. [F-ish]

## 7. 2025–2026 changes summary

1. **Interest graph replaces relationship graph** (360Brew, semantic topic authority) — the biggest shift. [A/B]
2. **Reach redistribution**: mega-creators −60%, casual posters +10–15%; more suggested/paid in feed. [B]
3. **Video: pushed in 2024–25, cooled in 2026** (organic video below average on personal profiles). [B]
4. **AI content**: no official AI-detection penalty [A-absence], but van der Blom's data: fully-AI posts get **~2.8x less reach / ~5x less engagement** — mechanism plausibly low dwell/no saves, not flagging. [B/C]
5. **Engagement shifting invisible**: clicks/swipes/saves/dwell up while likes/comments fall — optimize for saves and dwell, not applause. [B]
6. **Creator mode retired March 2024**; "creator mode boosts reach" is folklore. [A/F]
7. **Newsletters outperform**: van der Blom attributes ~80% of his conversions to newsletters; articles near-dead (0.69x). [B/C]

## Reliability warning

The 2026 LinkedIn-advice ecosystem is polluted by AI-generated SEO pages that invent precise-sounding numbers ("March 2026 Authenticity Update," "comments = 15x likes"). The load-bearing, defensible core:
**dwell time + early meaningful comments gate distribution [A]; documents/carousels and multi-image win, reshares and link-posts lose [B ×3 independent datasets]; ~140-char mobile hook budget [B]; −18.8% link penalty [B]; hashtags irrelevant [B]; 2–4 quality posts/week on 1–2 profile-aligned topics [B]; comments-with-replies ≈ 2.4x reach [B].**

## Sources

van der Blom AIR 2025 (linkedin.com/posts/richardvanderblom_chapter-1-algorithm-insights-report-2025-activity-7322514599126130688-Q895) · Creator Science #307 (podcast.creatorscience.com/richard-van-der-blom-2) · AuthoredUp: authoredup.com/blog/linkedin-algorithm, /best-performing-content-on-linkedin, /linkedin-character-limit · Metricool: metricool.com/press-release-linkedin-study-2026 · Socialinsider: socialinsider.io/social-media-benchmarks/linkedin · LinkedIn Engineering dwell time: linkedin.com/blog/engineering/feed/understanding-feed-dwell-time · 360Brew: arxiv.org/abs/2501.16450 · Entrepreneur algorithm interview: entrepreneur.com/science-technology/linkedin-changed-its-algorithms-heres-how-your-posts/454728 · SMT engagement-bait downrank: socialmediatoday.com/news/linkedin-updates-feed-algorithm-to-downrank-engagement-baiting-posts-and-po/623313 · SMT video push: socialmediatoday.com/news/linkedin-video-posting-tips-specs-2025/746552 · Hootsuite: blog.hootsuite.com/linkedin-algorithm · Buffer: buffer.com/resources/linkedin-algorithm · Writtenly Hub AIR-2025 summary · Mercer-Mackay AIR summary · SMT creator-mode removal · PostFormatter see-more cutoff.
