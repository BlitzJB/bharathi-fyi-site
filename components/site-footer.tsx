export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="flex w-full flex-wrap items-baseline justify-between gap-3 px-6 py-6 font-mono text-xs text-ink-faint lg:px-8">
        <p>&copy; {new Date().getFullYear()} Joshua Bharathi · Chennai</p>
        <div className="flex gap-6">
          <a
            href="https://github.com/BlitzJB"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-ink"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/joshuabharathi/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-ink"
          >
            LinkedIn
          </a>
          <a
            href="mailto:joshuabharathi2k4@gmail.com"
            className="transition-colors hover:text-accent-ink"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
