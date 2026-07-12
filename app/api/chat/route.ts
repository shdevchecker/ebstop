/**
 * POST /api/chat — the streaming chat endpoint the AI SDK client (useChat) talks to.
 *
 * Thin by design: zod-validate the request, then hand off to the pipeline in lib/ai/chat.ts
 * which owns key resolution and the dry-run fallback. All business logic lives there so it
 * stays testable without HTTP.
 *
 * Customize models in lib/ai/models.ts and behavior in lib/ai/chat.ts.
 */
import { z } from "zod";
import type { UIMessage } from "ai";
import { streamChatTurn } from "@/lib/ai/chat";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";

// Uses provider SDKs with server-side secrets — force Node runtime, always dynamic.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Message schema: `passthrough` keeps unknown part fields the AI SDK also re-validates when
// converting to model messages. A text part MUST carry a string `text` (the pipeline reads it),
// so we refine that specifically rather than trusting the later cast.
const PartSchema = z
  .object({ type: z.string() })
  .passthrough()
  .refine(
    (part) =>
      part.type !== "text" ||
      typeof (part as { text?: unknown }).text === "string",
    { message: 'a "text" part must have a string "text" field' },
  );
const MessageSchema = z.object({
  id: z.string().optional(),
  // The client may NOT set the `system` role. The server always supplies the system prompt
  // itself (lib/ai/chat.ts resolveSystemPrompt), so a client-sent system turn has no legitimate
  // use and is a prompt-injection vector. Restricting to user|assistant rejects it at
  // validation (400) before it can ever reach convertToModelMessages / the model.
  role: z.enum(["user", "assistant"]),
  parts: z.array(PartSchema),
});
const BodySchema = z.object({
  /** useChat sends the chat id as the request `id`; accepted but unused (history is session-only). */
  id: z.string().optional(),
  model: z.string().optional(),
  messages: z.array(MessageSchema).min(1),
});

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }

  return streamChatTurn({
    modelId: parsed.data.model ?? DEFAULT_MODEL_ID,
    // Shape is Zod-validated above (role + parts, with text parts carrying a string `text`); this
    // bridge cast only reconciles the validated shape with the SDK's richer UIMessage union, which
    // convertToModelMessages re-validates downstream.
    uiMessages: parsed.data.messages as unknown as UIMessage[],
  });
}
