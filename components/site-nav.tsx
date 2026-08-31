import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex w-full max-w-5xl items-baseline justify-between px-6 py-5">
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight text-ink"
        >
          bharathi.fyi
        </Link>
        <div className="flex items-baseline gap-6 font-mono text-xs tracking-wide uppercase">
          <Link
            href="/blog"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            Writing
          </Link>
          <Link
            href="/#chat"
            className="text-ink-faint transition-colors hover:text-ink"
          >
            Ask
          </Link>
        </div>
      </nav>
    </header>
  );
}
