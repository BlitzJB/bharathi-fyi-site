export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-baseline justify-between gap-3 px-6 py-6 font-mono text-xs text-ink-faint">
        <p>&copy; {new Date().getFullYear()} Bharathi</p>
        <div className="flex gap-5">
          {/* TODO(bharathi): point these at your real profiles */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            LinkedIn
          </a>
          <a
            href="mailto:pown.raj77@gmail.com"
            className="transition-colors hover:text-ink"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
