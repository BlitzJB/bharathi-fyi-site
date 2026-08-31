import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAllPosts } from "@/lib/blog";
import { countConcepts } from "@/lib/knowledge";

const PROOF: Array<{ figure: string; detail: string }> = [
  { figure: "2×", detail: "national hackathon wins — IIT Madras, NIT Trichy" },
  { figure: "0", detail: "downtime migrating MotorQ's customer-facing API" },
  { figure: "20+", detail: "clients shipped for as a freelance founder" },
];

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 3);
  const concepts = countConcepts();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-24 lg:pt-24">
      <div className="grid items-start gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        {/* Left: thesis */}
        <div>
          <h1
            className="rise-in font-display text-[2.6rem] leading-[1.04] font-semibold tracking-tight text-ink sm:text-6xl"
            style={{ "--rise-index": 0 } as React.CSSProperties}
          >
            I make unreliable things dependable.
          </h1>

          <p
            className="rise-in mt-7 max-w-[52ch] text-lg leading-relaxed"
            style={{ "--rise-index": 1 } as React.CSSProperties}
          >
            Event pipelines and zero&#8209;downtime migrations yesterday;
            agents, evals, and LLM systems today. I&rsquo;m Joshua Bharathi —
            a platform engineer turned AI engineer in Chennai. The substrate
            changed from cloud APIs to language models; the job didn&rsquo;t.
          </p>

          <div
            className="rise-in mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm"
            style={{ "--rise-index": 2 } as React.CSSProperties}
          >
            <a
              href="https://github.com/BlitzJB"
              target="_blank"
              rel="noopener noreferrer"
              className="u-link"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/joshuabharathi/"
              target="_blank"
              rel="noopener noreferrer"
              className="u-link"
            >
              LinkedIn
            </a>
            <a href="mailto:joshuabharathi2k4@gmail.com" className="u-link">
              joshuabharathi2k4@gmail.com
            </a>
          </div>

          {/* Proof strip — hairline ledger, not stat cards */}
          <dl
            className="rise-in mt-14 border-t border-line-strong"
            style={{ "--rise-index": 3 } as React.CSSProperties}
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

          {recentPosts.length > 0 && (
            <section
              className="rise-in mt-14"
              style={{ "--rise-index": 4 } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Writing
                </h2>
                <Link href="/blog" className="u-link text-sm">
                  All posts
                </Link>
              </div>
              <ul className="mt-4 border-t border-line-strong">
                {recentPosts.map((post) => (
                  <li key={post.slug} className="border-b border-line">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-baseline gap-5 py-3.5"
                    >
                      <time
                        dateTime={post.date}
                        className="w-24 shrink-0 font-mono text-xs text-ink-faint tabular-nums"
                      >
                        {post.date}
                      </time>
                      <span className="text-sm leading-snug text-ink transition-colors group-hover:text-accent-ink">
                        {post.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right: the grounded console — the signature element */}
        <div id="chat" className="rise-in lg:sticky lg:top-10" style={{ "--rise-index": 2 } as React.CSSProperties}>
          <ChatPanel conceptCount={concepts} />
        </div>
      </div>
    </main>
  );
}
