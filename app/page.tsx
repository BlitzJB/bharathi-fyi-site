import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAllPosts } from "@/lib/blog";
import { countConcepts } from "@/lib/knowledge";

const PROOF: Array<{ figure: string; detail: string }> = [
  { figure: "2×", detail: "national hackathon wins, at IIT Madras and NIT Trichy" },
  { figure: "0", detail: "downtime migrating MotorQ's customer-facing API to a new event queue" },
  { figure: "20+", detail: "freelance clients before I turned 20" },
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
            {[
              { label: "github", href: "https://github.com/BlitzJB" },
              {
                label: "linkedin",
                href: "https://www.linkedin.com/in/joshuabharathi/",
              },
              { label: "email", href: "mailto:joshuabharathi2k4@gmail.com" },
            ].map((link) => (
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
            className="rise-in mt-14 border-t border-line-strong"
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

          {recentPosts.length > 0 && (
            <section
              className="rise-in mt-14"
              style={{ "--rise-index": 5 } as React.CSSProperties}
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

        {/* Right: the grounded console */}
        <div id="chat" className="rise-in lg:sticky lg:top-10" style={{ "--rise-index": 2 } as React.CSSProperties}>
          <ChatPanel conceptCount={concepts} />
        </div>
      </div>
    </main>
  );
}
