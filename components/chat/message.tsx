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
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm leading-relaxed text-paper">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="chat-markdown max-w-[92%] text-sm leading-relaxed text-ink-soft">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
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
