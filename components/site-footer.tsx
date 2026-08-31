import { SocialLinks } from "@/components/social-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-baseline justify-between gap-3 px-6 py-6 font-mono text-xs text-ink-faint lg:px-8">
        <p>&copy; {new Date().getFullYear()} Joshua Bharathi &middot; Chennai</p>
        <SocialLinks className="gap-6 text-xs" />
      </div>
    </footer>
  );
}
