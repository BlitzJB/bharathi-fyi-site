import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAllPosts } from "@/lib/blog";
import { countConcepts } from "@/lib/knowledge";

const PROOF: Array<{ figure: string; detail: string }> = [
  { figure: "2×", detail: "national hackathon wins, at IIT Madras and NIT Trichy" },
  { figure: "0", detail: "downtime migrating MotorQ's customer-facing API to a new event queue" },
  { figure: "20+", detail: "freelance clients before I turned 20" },
];

const WORK: Array<{ year: string; org: string; role: string; line: string }> = [
  {
    year: "2025",
    org: "MotorQ",
    role: "SDE intern",
    line: "Benchmarked Apache Pulsar, then led a customer-facing API onto a new event queue with zero downtime. Rebuilt multi-tenant monitoring on VictoriaMetrics.",
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
  const concepts = countConcepts();

  return (
    <main className="flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,42%)]">
      {/* Left: scrolling column */}
      <div className="px-6 py-16 sm:px-10 lg:px-14 lg:py-24">
        <div className="max-w-[38rem]">
          <h1
            className="rise-in font-display text-5xl leading-[1.02] font-semibold tracking-tight text-ink sm:text-6xl"
            style={{ "--rise-index": 0 } as React.CSSProperties}
          >
            I make unreliable things dependable.
          </h1>

          <p
            className="rise-in mt-8 max-w-[38ch] text-xl leading-snug font-medium text-ink"
            style={{ "--rise-index": 1 } as React.CSSProperties}
          >
            Hi, I&rsquo;m Joshua Bharathi, an engineer from Chennai. These
            days I build with LLMs, after a few years of keeping backend
            infrastructure alive.
          </p>

          <p
            className="rise-in mt-4 max-w-[44ch] leading-relaxed text-ink-soft"
            style={{ "--rise-index": 2 } as React.CSSProperties}
          >
            It&rsquo;s the same job underneath: something unreliable at the
            bottom of the stack, and people who need it to work anyway.
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

          {/* Proof strip */}
          <dl
            className="rise-in mt-16 border-t border-line-strong"
            style={{ "--rise-index": 4 } as React.CSSProperties}
          >
            {PROOF.map((row) => (
              <div
                key={row.detail}
                className="flex items-baseline gap-5 border-b border-line py-3.5"
              >
                <dt className="w-12 shrink-0 font-mono text-lg text-ink tabular-nums">
                  {row.figure}
                </dt>
                <dd className="text-sm leading-snug">{row.detail}</dd>
              </div>
            ))}
          </dl>

          {/* Work */}
          <section
            className="rise-in mt-16"
            style={{ "--rise-index": 5 } as React.CSSProperties}
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
              style={{ "--rise-index": 6 } as React.CSSProperties}
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
        </div>
      </div>

      {/* Right: full-height assistant pane */}
      <aside
        id="chat"
        className="h-[85dvh] border-t border-line lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-t-0 lg:border-l"
      >
        <ChatPanel conceptCount={concepts} />
      </aside>
    </main>
  );
}
