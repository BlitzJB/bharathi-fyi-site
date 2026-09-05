// Ingest the OKF knowledgebase into Upstash Vector (hybrid dense+BM25).
// Chunks each concept by top-level section so retrieval returns passages,
// not whole files. Idempotent: resets the namespace, then upserts.
//
// Run: node --env-file=.env.local scripts/ingest-kb.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Index } from "@upstash/vector";

const OKF_DIR = path.join(process.cwd(), ".okf");
const RESERVED = new Set(["index.md", "log.md"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!entry.name.endsWith(".md") || RESERVED.has(entry.name)) return [];
    return [full];
  });
}

function chunkConcept(id, frontmatter, body) {
  const sections = body.split(/^# /m).filter((s) => s.trim().length > 0);
  return sections.map((section, i) => {
    const [headingLine, ...rest] = section.split("\n");
    const heading = headingLine.trim();
    const text = rest.join("\n").trim();
    return {
      id: `${id}#${i}`,
      data: `${frontmatter.title ?? id} — ${heading}\n\n${text}`,
      metadata: {
        conceptId: id,
        title: frontmatter.title ?? id,
        heading,
        status: frontmatter.status ?? "stable",
      },
    };
  });
}

const index = Index.fromEnv();

const files = walk(OKF_DIR);
const chunks = [];
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const { data: fm, content } = matter(raw);
  if (fm.status === "deprecated") continue;
  const id = path.relative(OKF_DIR, file).replace(/\.md$/, "");
  chunks.push(...chunkConcept(id, fm, content));
}

console.log(`ingesting ${chunks.length} chunks from ${files.length} concepts`);
await index.reset();
for (let i = 0; i < chunks.length; i += 50) {
  await index.upsert(chunks.slice(i, i + 50));
}
const info = await index.info();
console.log(
  `done: ${info.vectorCount} vectors (+${info.pendingVectorCount} pending)`,
);
