/**
 * POST /api/media — the Community media demo: generate ONE watermarked 512×512 image.
 *
 * Thin by design: zod-validate the body, then hand off to lib/media/generate.ts which owns the
 * fal call, the inline polling, the watermark, and local-disk storage. Synchronous — the
 * response carries the finished image URL (or an honest failure), no job queue, no polling
 * endpoint, no credits.
 *
 * Missing FAL_KEY never crashes: it returns a labeled `dryRun` message instead.
 */
import { z } from "zod";
import { generateDemoImage } from "@/lib/media/generate";

// Long-running provider fetches with a server-side secret — Node runtime, always dynamic.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  prompt: z.string().min(1).max(2_000),
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

  const result = await generateDemoImage(parsed.data.prompt);

  if (result.ok) {
    return Response.json({ url: result.url });
  }
  if (result.reason === "no_key") {
    return Response.json({
      dryRun: true,
      message: "Set FAL_KEY in .env to try the media demo",
    });
  }
  return Response.json(
    { error: "generation_failed", message: result.message },
    { status: 502 },
  );
}
