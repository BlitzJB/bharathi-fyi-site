type Level = "info" | "warn" | "error";
type Fields = Record<string, unknown>;

/**
 * Structured JSON logs, one object per line. Vercel's log drain and the
 * dashboard both parse these into queryable fields.
 */
export function log(event: string, fields: Fields = {}, level: Level = "info") {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
