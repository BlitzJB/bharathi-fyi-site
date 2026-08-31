import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2
      className="mt-12 mb-4 font-display text-2xl font-semibold tracking-tight text-ink"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mt-8 mb-3 font-display text-xl font-semibold tracking-tight text-ink"
      {...props}
    />
  ),
  p: (props) => <p className="mb-5 leading-relaxed" {...props} />,
  a: ({ href = "", ...props }) => {
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return <Link href={href} className="u-link" {...props} />;
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="u-link"
        {...props}
      />
    );
  },
  ul: (props) => (
    <ul className="mb-5 list-disc space-y-2 pl-6 marker:text-line-strong" {...props} />
  ),
  ol: (props) => (
    <ol className="mb-5 list-decimal space-y-2 pl-6 marker:text-line-strong" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mb-5 border-l-2 border-accent/40 pl-5 text-ink-soft italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-line" />,
  code: (props) => <code className="font-mono text-[0.9em]" {...props} />,
  pre: (props) => (
    <pre
      className="mb-6 overflow-x-auto border border-line bg-surface p-4 text-sm leading-relaxed"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  table: (props) => (
    <div className="mb-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-line-strong px-3 py-2 text-left font-medium text-ink" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-line px-3 py-2" {...props} />
  ),
};
