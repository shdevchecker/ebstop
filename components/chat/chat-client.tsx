"use client";

/**
 * Chat experience (client): model picker, streaming message list with markdown rendering, and
 * the composer. Talks to POST /api/chat via the AI SDK's useChat.
 *
 * Chat history is SESSION-ONLY: it lives in React state and is gone on reload. There is no
 * conversation list and no server-side persistence in the Community edition.
 */
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MODELS, type ChatModel } from "@/lib/ai/models";
import { Markdown } from "@/components/chat/markdown";

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatClient({
  chatId,
  initialModelId,
}: {
  chatId: string;
  initialModelId: string;
}) {
  const [input, setInput] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(initialModelId);
  const modelRef = useRef(initialModelId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: { id, messages, model: modelRef.current },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";
  const selectedModel: ChatModel =
    MODELS.find((model) => model.id === selectedModelId) ?? MODELS[0]!;

  function onSelectModel(id: string) {
    setSelectedModelId(id);
    modelRef.current = id;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] gap-4">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center gap-3">
          <select
            value={selectedModelId}
            onChange={(event) => onSelectModel(event.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {selectedModel.description}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto rounded-md border border-border bg-surface p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Ask anything on {selectedModel.displayName}. History is session-only.
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      isUser
                        ? "bg-accent text-accent-foreground"
                        : "border border-border bg-surface"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm text-accent-foreground">
                        {messageText(message)}
                      </p>
                    ) : (
                      <Markdown content={messageText(message)} />
                    )}
                  </div>
                </div>
              );
            })
          )}
          {status === "submitted" && (
            <div className="text-sm text-muted-foreground">Thinking…</div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-danger">
            Something went wrong: {error.message}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Message ${selectedModel.displayName}…`}
            className="flex-1 rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || input.trim() === ""}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "…" : "Send"}
          </button>
        </form>
      </section>
    </div>
  );
}
