// Pure module (no Node imports): safe to reference from workflow context.
export const REFUSALS: Record<"off_topic" | "abuse", string> = {
  off_topic:
    "I only cover Joshua's work, background, and this site. For anything else you'll want a general-purpose assistant. Is there something about his work I can help with?",
  abuse:
    "I can't help with that. I answer questions about Joshua's work and background, and I'd be glad to do that instead.",
};
