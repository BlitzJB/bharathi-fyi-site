import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const text = messageText(message);
  if (!text) return null;

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-ink px-3.5 py-2 text-sm leading-relaxed text-paper">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 shrink-0 font-mono text-xs text-accent-ink"
      >
        &#9642;
      </span>
      <div className="chat-markdown min-w-0 text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="u-link"
              >
                {children}
              </a>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
