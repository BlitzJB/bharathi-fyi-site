import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getAllPosts, formatDate } from "@/lib/blog";

export default function HomePage() {
  const recentPosts = getAllPosts().slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 lg:py-24">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: positioning */}
        <div className="flex flex-col gap-10">
          <div className="rise-in" style={{ "--rise-index": 0 } as React.CSSProperties}>
            <p className="font-mono text-xs tracking-widest text-ink-faint uppercase">
              Platform engineer &rarr; AI engineer
            </p>
            <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              I build the systems
              <br />
              behind the <em className="italic">intelligence</em>.
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
              Hi, I&rsquo;m Bharathi. Years of platform engineering — paved
              roads, reliable infrastructure, developer experience — now aimed
              at AI systems: agents, evals, and the glue between models and
              production.
            </p>
          </div>

          <div
            className="rise-in flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs"
            style={{ "--rise-index": 1 } as React.CSSProperties}
          >
            {/* TODO(bharathi): point these at your real profiles */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
            >
              LinkedIn
            </a>
            <a
              href="mailto:pown.raj77@gmail.com"
              className="text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
            >
              Email
            </a>
          </div>

          {recentPosts.length > 0 && (
            <div
              className="rise-in border-t border-line pt-8"
              style={{ "--rise-index": 2 } as React.CSSProperties}
            >
              <h2 className="font-mono text-xs tracking-widest text-ink-faint uppercase">
                Recent writing
              </h2>
              <ul className="mt-4 space-y-4">
                {recentPosts.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="group block">
                      <span className="font-serif text-lg font-medium tracking-tight text-ink underline-offset-4 group-hover:underline">
                        {post.title}
                      </span>
                      <time
                        dateTime={post.date}
                        className="mt-0.5 block font-mono text-xs text-ink-faint"
                      >
                        {formatDate(post.date)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: grounded chat */}
        <div
          id="chat"
          className="rise-in lg:sticky lg:top-10"
          style={{ "--rise-index": 1 } as React.CSSProperties}
        >
          <ChatPanel />
          <p className="mt-3 px-1 font-mono text-[11px] leading-relaxed text-ink-faint">
            Answers come from a curated knowledgebase, not the open internet.
          </p>
        </div>
      </div>
    </main>
  );
}
