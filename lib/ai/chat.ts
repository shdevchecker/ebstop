/**
 * lib/ai/chat.ts — the streaming chat pipeline.
 *
 * One entry point, {@link streamChatTurn}, turns a chat request into a streaming HTTP Response:
 *
 *  1. Resolves the model from lib/ai/models.ts (single source of truth).
 *  2. Resolves the provider API key from env (see platformAiKeys) — when the key is absent the
 *     turn degrades to a clearly labeled dry-run reply instead of crashing.
 *  3. System prompt: the CHAT_SYSTEM_PROMPT env override, else a built-in default.
 *
 * Chat history is session-only (React state on the client); nothing is persisted server-side.
 *
 * Server-only: touches provider secrets.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { env, platformAiKeys } from "@/lib/env";
import {
  DEFAULT_MODEL_ID,
  getModel,
  type ChatModel,
} from "@/lib/ai/models";

/** Fallback system prompt when no CHAT_SYSTEM_PROMPT env is set. */
export const DEFAULT_SYSTEM_PROMPT =
  "You are EBS, a helpful, concise AI assistant. " +
  "Format answers with markdown when it improves clarity.";

/** Where the resolved API key came from — drives the dry-run decision. */
export type KeySource = "platform" | "none";

export interface ChatTurnInput {
  /** lib/ai/models.ts model id chosen in the picker. */
  modelId: string;
  /** Full UI message list from the client (history + the new user message). */
  uiMessages: UIMessage[];
}

/** Resolve the system prompt: the CHAT_SYSTEM_PROMPT env override, else the built-in default. */
export async function resolveSystemPrompt(): Promise<string> {
  return env.CHAT_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT;
}

/**
 * Resolve the provider API key for a model from env. A `none` result means we have no
 * credentials for this provider and must dry-run.
 */
export async function resolveModelKey(
  model: ChatModel,
): Promise<{ apiKey: string | null; source: KeySource }> {
  const platform = platformAiKeys[model.platformKeyEnv];
  if (platform) return { apiKey: platform, source: "platform" };

  return { apiKey: null, source: "none" };
}

/**
 * Instantiate the AI SDK language model for a resolved model + key. Exported so non-streaming
 * callers (lib/ai/completion.ts) build the SAME provider clients as the chat pipeline — one
 * place decides how each provider is constructed.
 */
export function buildLanguageModel(model: ChatModel, apiKey: string): LanguageModel {
  switch (model.provider) {
    case "openai":
      return createOpenAI({ apiKey })(model.modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(model.modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model.modelId);
    case "openai-compatible":
      return createOpenAICompatible({
        name: model.keyProvider,
        baseURL: model.baseURL ?? "",
        apiKey,
      })(model.modelId);
  }
}

/** Friendly, single-message response streamed as an assistant turn (the dry-run reply). */
function textResponse(text: string): Response {
  const id = randomUUID();
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function dryRunText(model: ChatModel): string {
  return (
    `**Dry-run reply** (no API key configured for ${model.displayName}).\n\n` +
    "This is a placeholder response so you can explore the app without provider keys. " +
    `Set the \`${model.platformKeyEnv}\` environment variable to get real streamed answers.`
  );
}

/**
 * Run one chat turn end to end and return a streaming Response suitable for the AI SDK client.
 * Never throws provider errors into the caller — those surface as an error chunk in the stream.
 */
export async function streamChatTurn(input: ChatTurnInput): Promise<Response> {
  const model = getModel(input.modelId) ?? getModel(DEFAULT_MODEL_ID)!;

  // Resolve the key FIRST so we know whether this is a dry-run or a real call.
  const { apiKey } = await resolveModelKey(model);

  // No credentials => labeled dry-run reply so the app works out of the box with zero keys.
  if (!apiKey) {
    return textResponse(dryRunText(model));
  }

  const modelMessages = await convertToModelMessages(input.uiMessages);
  const result$ = streamText({
    model: buildLanguageModel(model, apiKey),
    system: await resolveSystemPrompt(),
    messages: modelMessages,
    onError: (error) => {
      // Let the SDK surface an error chunk to the client; log for the operator.
      console.error("[chat] model call failed", error);
    },
  });

  return result$.toUIMessageStreamResponse();
}
