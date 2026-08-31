import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
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

const LINKS = [
  { label: "github", href: "https://github.com/BlitzJB" },
  { label: "linkedin", href: "https://www.linkedin.com/in/joshuabharathi/" },
  { label: "email", href: "mailto:joshuabharathi2k4@gmail.com" },
];

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 4);
  const conceptMeta = listConceptMeta();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,40%)] lg:px-8">
      {/* Left: scrolling column */}
      <div className="py-16 lg:py-20 lg:pr-16">
        <div className="max-w-[38rem]">
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
            className="rise-in mt-9 flex flex-wrap items-baseline gap-x-7 gap-y-2 font-mono text-[13px]"
            style={{ "--rise-index": 3 } as React.CSSProperties}
          >
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group text-ink-faint transition-colors hover:text-accent-ink"
              >
                {link.label}
                <span
                  aria-hidden
                  className="ml-1 inline-block transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                >
                  &#8599;
                </span>
              </a>
            ))}
          </div>

          {/* Work */}
          <section
            className="rise-in mt-16"
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
              className="rise-in mt-16"
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
                      className="group flex items-baseline gap-5 py-4"
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
          <footer className="mt-20 hidden border-t border-line pt-6 font-mono text-xs text-ink-faint lg:block">
            <p>&copy; {new Date().getFullYear()} Joshua Bharathi &middot; Chennai</p>
          </footer>
        </div>
      </div>

      {/* Right: full-height assistant pane */}
      <aside
        id="chat"
        className="h-[85dvh] border-t border-line lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-t-0 lg:border-l lg:border-line"
      >
        <ChatPanel conceptCount={conceptMeta.length} concepts={conceptMeta} />
      </aside>

      <footer className="border-t border-line py-6 font-mono text-xs text-ink-faint lg:hidden">
        <p>&copy; {new Date().getFullYear()} Joshua Bharathi &middot; Chennai</p>
      </footer>
    </main>
  );
}
