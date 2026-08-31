import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { LanderChrome } from "@/components/lander-chrome";
import { SectionNav } from "@/components/section-nav";
import { SocialLinks } from "@/components/social-links";
import { getAllPosts } from "@/lib/blog";
import { listConceptMeta } from "@/lib/knowledge";

const WORK: Array<{ year: string; org: string; role: string; line: string }> = [
  {
    year: "2025–",
    org: "Motorq",
    role: "Software Development Engineer",
    line: "A year as an intern, then full-time. I led the zero-downtime migration of a customer-facing API onto a new event queue, and rebuilt multi-tenant monitoring on VictoriaMetrics with a GitOps rule pipeline.",
  },
  {
    year: "2024",
    org: "Miniture",
    role: "SDE intern",
    line: "Notification service, data ingest, downstream analytics, and a big share of the company's React Native app.",
  },
  {
    year: "2024",
    org: "Dexio Designs",
    role: "SDE intern",
    line: "Rebuilt the company site with heavy animation work, and wired webhooks so enquiries pinged the team instantly.",
  },
  {
    year: "2022",
    org: "Blitz Design & Development",
    role: "founder",
    line: "My freelance studio through college. E-commerce backends, billing, CRMs, and fleet management for 20+ clients across India.",
  },
];


export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 4);
  const conceptMeta = listConceptMeta();

  return (
    <main className="relative mx-auto w-full max-w-7xl flex-1 px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,40%)] lg:px-8">
      <LanderChrome />

      {/* Left: scrolling column */}
      <div className="pt-12 pb-16 lg:pt-14 lg:pr-16 lg:pb-20">
        {/* Wordmark: hero-scale in flow, sticks and scales into the bar */}
        <a
          href="#intro"
          className="wordmark-dock rise-in z-50 mb-12 inline-block font-mono text-[20px] leading-none text-ink"
          style={{ "--rise-index": 0 } as React.CSSProperties}
        >
          bharathi<span className="text-ink-faint">.fyi</span>
        </a>

        <div className="max-w-[38rem]">
          <div id="intro" className="scroll-mt-24">
          <h1
            className="rise-in font-display text-5xl leading-[1.02] font-semibold tracking-tight text-ink sm:text-6xl"
            style={{ "--rise-index": 0 } as React.CSSProperties}
          >
            I build AI systems that hold up in production.
          </h1>

          <p
            className="rise-in mt-8 max-w-[40ch] text-xl leading-snug font-medium text-ink"
            style={{ "--rise-index": 1 } as React.CSSProperties}
          >
            Hi, I&rsquo;m Joshua Bharathi, an AI engineer from Chennai. I
            build agents and the systems that keep LLM products running.
          </p>

          <p
            className="rise-in mt-4 max-w-[46ch] leading-relaxed text-ink-soft"
            style={{ "--rise-index": 2 } as React.CSSProperties}
          >
            I come from platform engineering, and I hold AI systems to the
            same standard as any other production infrastructure.
          </p>

          <div
            className="rise-in mt-9"
            style={{ "--rise-index": 3 } as React.CSSProperties}
          >
            <SocialLinks className="gap-x-7 gap-y-2 text-[13px]" />
          </div>
          </div>

          {/* Work */}
          <section
            id="work"
            className="rise-in mt-16 scroll-mt-24"
            style={{ "--rise-index": 4 } as React.CSSProperties}
          >
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              Work
            </h2>
            <ul className="mt-5 border-t border-line-strong">
              {WORK.map((job) => (
                <li
                  key={`${job.org}-${job.role}`}
                  className="flex gap-5 border-b border-line py-4"
                >
                  <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-ink-faint tabular-nums">
                    {job.year}
                  </span>
                  <div>
                    <p className="text-[15px] leading-snug">
                      <span className="font-medium text-ink">{job.org}</span>
                      <span className="text-ink-faint">, {job.role}</span>
                    </p>
                    <p className="mt-1 max-w-[52ch] text-sm leading-relaxed">
                      {job.line}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Writing */}
          {recentPosts.length > 0 && (
            <section
              id="writing"
              className="rise-in mt-16 scroll-mt-24"
              style={{ "--rise-index": 5 } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Writing
                </h2>
                <Link href="/blog" className="u-link text-sm">
                  All posts
                </Link>
              </div>
              <ul className="mt-5 border-t border-line-strong">
                {recentPosts.map((post) => (
                  <li key={post.slug} className="border-b border-line">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-baseline gap-5 py-4 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:translate-x-0.5 motion-reduce:transition-none"
                    >
                      <time
                        dateTime={post.date}
                        className="w-12 shrink-0 font-mono text-xs text-ink-faint tabular-nums"
                      >
                        {post.date.slice(0, 4)}
                      </time>
                      <span className="min-w-0">
                        <span className="block text-[15px] leading-snug font-medium text-ink transition-colors group-hover:text-accent-ink">
                          {post.title}
                        </span>
                        <span className="mt-1 block max-w-[52ch] text-sm leading-relaxed text-ink-soft">
                          {post.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Landing footer lives in the left column so the chat pane runs
              to the bottom edge on desktop */}
          <footer className="mt-20 hidden flex-wrap items-baseline justify-between gap-3 border-t border-line pt-6 font-mono text-xs text-ink-faint lg:flex">
            <p>&copy; {new Date().getFullYear()} Joshua Bharathi &middot; Chennai</p>
            <SocialLinks className="gap-6 text-xs" />
          </footer>
        </div>
      </div>

      {/* Section rail: hugs the viewport's left edge on wide screens */}
      <div
        className="rise-in fixed top-1/2 left-6 z-30 hidden -translate-y-1/2 2xl:block"
        style={{ "--rise-index": 3 } as React.CSSProperties}
      >
        <SectionNav
          sections={[
            { id: "intro", label: "Intro" },
            { id: "work", label: "Work" },
            { id: "writing", label: "Writing" },
          ]}
        />
      </div>

      {/* Right: full-height assistant pane */}
      <aside
        id="chat"
        className="h-[85dvh] border-t border-line lg:sticky lg:top-0 lg:h-dvh lg:border-t-0 lg:border-l lg:border-line"
      >
        <ChatPanel concepts={conceptMeta} />
      </aside>

      <footer className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line py-6 font-mono text-xs text-ink-faint lg:hidden">
        <p>&copy; {new Date().getFullYear()} Joshua Bharathi &middot; Chennai</p>
        <SocialLinks className="gap-6 text-xs" />
      </footer>

      {/* End-of-page sentinel for the section rail's bottom pin */}
      <div id="page-end" aria-hidden className="h-px w-px" />
    </main>
  );
}
