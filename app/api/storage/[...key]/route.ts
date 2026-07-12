/**
 * GET /api/storage/<key> — serve a file saved by the local-disk storage adapter
 * (lib/storage.ts). This is what the /api/storage/... URLs returned by the media demo resolve
 * to. Read-only; unknown keys (and traversal attempts, rejected by safeStorageKey) return 404.
 */
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

/** Content types for the extensions the demo writes (PNG today; a few extras for buyers). */
const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await params;
  const joined = key.join("/");

  let buffer: Buffer | null;
  try {
    buffer = await getStorage().get(joined);
  } catch {
    // safeStorageKey throws on path traversal — treat it exactly like a missing file.
    buffer = null;
  }
  if (!buffer) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const extension = joined.split(".").pop()?.toLowerCase() ?? "";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      // Keys are content-addressed (a fresh UUID per generation), so aggressive caching is safe.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
