import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const OKF_DIR = path.join(process.cwd(), ".okf");
const RESERVED = new Set(["index.md", "log.md"]);

type Concept = {
  id: string;
  type: string;
  title: string;
  description: string;
  body: string;
};

function walkConcepts(dir: string, prefix = ""): Concept[] {
  if (!fs.existsSync(dir)) return [];
  const concepts: Concept[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      concepts.push(...walkConcepts(path.join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.name.endsWith(".md") && !RESERVED.has(entry.name)) {
      const raw = fs.readFileSync(path.join(dir, entry.name), "utf8");
      const { data, content } = matter(raw);
      if (data.status === "deprecated") continue;
      concepts.push({
        id: `${prefix}${entry.name.replace(/\.md$/, "")}`,
        type: String(data.type ?? "Concept"),
        title: String(data.title ?? entry.name),
        description: String(data.description ?? ""),
        body: content.trim(),
      });
    }
  }
  return concepts;
}

function compile(): string {
  const concepts = walkConcepts(OKF_DIR);
  const sections = concepts.map((c) => {
    const header = `### ${c.title} [${c.type}] (id: ${c.id})`;
    const desc = c.description ? `_${c.description}_\n` : "";
    return `${header}\n${desc}\n${c.body}`;
  });
  return sections.join("\n\n---\n\n");
}

let cached: string | null = null;

export function getKnowledge(): string {
  // Re-read on every request in dev so KB edits show up without a restart.
  if (process.env.NODE_ENV !== "production") return compile();
  cached ??= compile();
  return cached;
}

export function buildSystemPrompt(): string {
  return `You are the assistant on bharathi.fyi, the personal site of Bharathi — a platform engineer turned AI engineer. Visitors (recruiters, engineers, potential collaborators) ask you about Bharathi's background, skills, and work.

Rules:
- Answer ONLY from the knowledgebase below. It is the single source of truth.
- If the knowledgebase doesn't cover something, say so plainly and suggest contacting Bharathi directly. Never invent employers, dates, projects, or credentials.
- Sections marked TODO are not yet filled in by Bharathi — treat them as unknown, don't read the TODO text aloud.
- Keep answers short and conversational: a few sentences, occasionally a short list. No headings.
- Speak about Bharathi in the third person. You are the site's assistant, not Bharathi.
- Stay on topic. For unrelated requests (general coding help, world facts, roleplay), politely redirect to questions about Bharathi and this site.

# Knowledgebase

${getKnowledge()}`;
}
