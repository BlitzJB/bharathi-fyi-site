/** The model that serves every chat request. */
export const CHAT_MODEL =
  process.env.CHAT_MODEL?.trim() || "zai/glm-5.3-flash";
