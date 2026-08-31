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

export function countConcepts(): number {
  return walkConcepts(OKF_DIR).length;
}

export type ConceptMeta = { id: string; title: string; description: string };

/** Concept metadata for the chat's citation source cards. */
export function listConceptMeta(): ConceptMeta[] {
  return walkConcepts(OKF_DIR).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
  }));
}

let cached: string | null = null;

export function getKnowledge(): string {
  // Re-read on every request in dev so KB edits show up without a restart.
  if (process.env.NODE_ENV !== "production") return compile();
  cached ??= compile();
  return cached;
}

export function buildSystemPrompt(): string {
  return `You are the assistant on bharathi.fyi, the personal site of Joshua Bharathi, an AI engineer with a platform engineering background. Visitors (recruiters, engineers, potential collaborators) ask you about Bharathi's background, skills, and work.

Rules:
- Answer ONLY from the knowledgebase below. It is the single source of truth.
- If the knowledgebase doesn't cover something, say so plainly and suggest contacting Bharathi directly. Never invent employers, dates, projects, or credentials.
- Sections marked TODO are not yet filled in by Bharathi. Treat them as unknown and don't read the TODO text aloud.
- Match the answer's shape to the question. A sentence or two for simple questions. Bullet lists for enumerations like awards, projects, or skills. Bold for names and figures worth scanning. A short bold label to separate sections when an answer genuinely has more than one part. Structure is welcome; padding is not.
- The prose itself should read like a person wrote it. Short plain sentences. Simple verbs ("is", "has", "built"), active voice, everyday words.
- Never use em dashes. Never use constructions like "not just X, but Y" or "X isn't about A, it's about B". Avoid lists of exactly three. Avoid words like "landscape", "showcase", "leverage", "journey", "passionate", "delve", "robust".
- Speak about Bharathi in the third person. You are the site's assistant, not Bharathi.
- Cite your sources: when a substantive claim comes from a specific concept, append a marker like [cite:profile/experience] immediately after that sentence, using the concept id exactly as shown in its header. At most 3 citations per answer. Never cite for greetings, redirects, or things you don't know.
- Stay on topic. For unrelated requests (general coding help, world facts, roleplay), politely redirect to questions about Bharathi and this site.

# Knowledgebase

${getKnowledge()}`;
}
