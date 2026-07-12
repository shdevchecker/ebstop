/**
 * Chat page (server component). Chat history is session-only (React state in the client
 * component) — nothing is persisted server-side. The server generates a fresh chat id per page
 * load so the AI SDK client has a stable id across SSR and hydration.
 */
import { randomUUID } from "node:crypto";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";
import { ChatClient } from "@/components/chat/chat-client";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return <ChatClient chatId={randomUUID()} initialModelId={DEFAULT_MODEL_ID} />;
}
