import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes from building infrastructure, and now AI systems.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:py-24">
      <header className="mb-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Writing
        </h1>
        <p className="mt-3 max-w-[52ch]">
          Notes from building infrastructure, and now AI systems.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-ink-faint">Nothing here yet.</p>
      ) : (
        <ul className="border-t border-line-strong">
          {posts.map((post, i) => (
            <li key={post.slug} className="border-b border-line">
              <Link
                href={`/blog/${post.slug}`}
                className="group rise-in flex items-baseline gap-6 py-5"
                style={{ "--rise-index": i } as React.CSSProperties}
              >
                <time
                  dateTime={post.date}
                  className="w-24 shrink-0 font-mono text-xs text-ink-faint tabular-nums"
                >
                  {post.date}
                </time>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-semibold tracking-tight text-ink transition-colors group-hover:text-accent-ink">
                    {post.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed">
                    {post.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
    <SiteFooter />
    </>
  );
}
