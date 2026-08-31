import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  draft: boolean;
  readingTime: string;
};

export type Post = PostMeta & {
  content: string;
};

function parsePostFile(filename: string): Post {
  const slug = filename.replace(/\.mdx$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, filename), "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? ""),
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: Boolean(data.draft),
    readingTime: readingTime(content).text,
    content,
  };
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map(parsePostFile)
    .filter((p) => process.env.NODE_ENV !== "production" || !p.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((post): PostMeta => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      tags: post.tags,
      draft: post.draft,
      readingTime: post.readingTime,
    }));
}

export function getPost(slug: string): Post | null {
  const filename = `${slug}.mdx`;
  if (!/^[\w-]+$/.test(slug) || !fs.existsSync(path.join(BLOG_DIR, filename))) {
    return null;
  }
  const post = parsePostFile(filename);
  if (process.env.NODE_ENV === "production" && post.draft) return null;
  return post;
}

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
