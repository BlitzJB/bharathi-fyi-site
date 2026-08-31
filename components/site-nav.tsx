import Link from "next/link";

export function SiteNav() {
  return (
    <header className="border-b border-line">
      <nav className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm text-ink transition-colors hover:text-accent-ink"
        >
          bharathi<span className="text-ink-faint">.fyi</span>
        </Link>
        <div className="flex items-baseline gap-7 text-sm">
          <Link href="/blog" className="u-link no-underline hover:underline">
            Writing
          </Link>
          <Link href="/#chat" className="u-link no-underline hover:underline">
            Ask the assistant
          </Link>
        </div>
      </nav>
    </header>
  );
}
