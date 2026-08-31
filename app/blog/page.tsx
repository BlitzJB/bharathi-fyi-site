import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Writing",
  description: "Notes on platform engineering, AI systems, and the space between.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:py-24">
      <header className="mb-14">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-ink">
          Writing
        </h1>
        <p className="mt-3 text-ink-soft">
          Notes on platform engineering, AI systems, and the space between.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-ink-soft">Nothing here yet.</p>
      ) : (
        <ul className="space-y-10">
          {posts.map((post) => (
            <li key={post.slug}>
              <article>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-serif text-xl font-medium tracking-tight text-ink transition-colors group-hover:text-accent">
                      {post.title}
                    </h2>
                    <time
                      dateTime={post.date}
                      className="shrink-0 font-mono text-xs text-ink-faint"
                    >
                      {formatDate(post.date)}
                    </time>
                  </div>
                  <p className="mt-2 leading-relaxed text-ink-soft">
                    {post.description}
                  </p>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
