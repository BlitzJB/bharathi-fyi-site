import Link from "next/link";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="font-mono text-sm text-ink transition-colors hover:text-accent-ink"
        >
          bharathi<span className="text-ink-faint">.fyi</span>
        </Link>
        <div className="flex items-center gap-7 text-sm">
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
