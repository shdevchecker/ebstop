/**
 * lib/media/generate.ts — the Community media demo pipeline: ONE watermarked, low-res image.
 *
 * Deliberately simple and deliberately degraded (this is the free edition):
 *
 *  - IMAGE ONLY, one model (lib/ai/models.ts DEMO_IMAGE_MODEL), 512×512 hardcoded — the size is
 *    forced in the fal request AND re-enforced with sharp, so a larger output can never ship.
 *  - A visible "EBS Free — Demo" watermark is composited onto every result. Do NOT remove
 *    the watermark or raise the resolution cap — the full studio is an EBS Developer feature.
 *  - SYNCHRONOUS: submit to fal's queue, poll inline until done (hard 120s timeout), download,
 *    watermark, save to local disk (lib/storage.ts), return our /api/storage/<key> URL.
 *    No job queue, no database, no credits.
 *  - Missing FAL_KEY never crashes: {@link generateDemoImage} returns a "no_key" result the API
 *    route turns into a labeled message.
 *
 * The download step keeps two defenses from the original pipeline, because the output URL is
 * provider-controlled and therefore untrusted: an SSRF allowlist (only documented fal media
 * hosts are fetched) and a streaming size cap (abort oversized bodies mid-flight).
 *
 * Server-only: reads the FAL_KEY secret and touches the filesystem.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";
import type { JobStatus } from "@/lib/media/types";
import { getActiveProvider, isAllowedMediaDownloadUrl } from "@/lib/media/providers";
import { getStorage } from "@/lib/storage";
import { DEMO_IMAGE_MODEL } from "@/lib/ai/models";

/** Hard cap on the demo output size (pixels per side). Do not raise — see the file header. */
export const DEMO_IMAGE_SIZE = 512;

/** The visible watermark text composited onto every demo image. Do not remove. */
export const WATERMARK_TEXT = "EBS Free — Demo";

/** Hard timeout for one generation (submit → done), matching the original image budget. */
export const IMAGE_TIMEOUT_MS = 120_000;

/** How often we re-poll fal's queue while the generation is in flight. */
const POLL_INTERVAL_MS = 2_000;

/**
 * Streaming download size cap (defense-in-depth). Bounds the memory one download can consume —
 * a hostile/oversized provider body can't exhaust the process.
 */
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MB — generous for one 512×512 image

/**
 * Read a response body into a Buffer, ABORTING once the accumulated bytes exceed `maxBytes`:
 * we cancel the underlying stream and throw, so an over-cap download STOPS mid-flight instead of
 * being buffered in full. Exported for unit tests.
 */
export async function readCappedBody(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel(`exceeded ${maxBytes} bytes`); // abort the in-flight download
      throw new Error(`download too large: exceeded ${maxBytes} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetch a provider output URL into memory. Two defenses on the output URL, which is
 * provider-controlled and therefore untrusted:
 *   (a) SSRF allowlist — only fetch documented provider media hosts (isAllowedMediaDownloadUrl),
 *       rejected WITHOUT a request otherwise, so a hostile/echoed URL can't reach an internal address;
 *   (b) streaming size cap — abort past MAX_MEDIA_BYTES rather than buffering an unbounded body.
 * Exported for unit tests.
 */
export async function downloadOutput(url: string): Promise<Buffer> {
  if (!isAllowedMediaDownloadUrl(url)) {
    throw new Error("download refused: output host not on the media provider allowlist");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  // Reject an advertised over-cap length early, before reading any bytes.
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_MEDIA_BYTES) {
    throw new Error(`download too large: ${declared} bytes exceeds cap`);
  }
  return res.body
    ? await readCappedBody(res.body, MAX_MEDIA_BYTES)
    : Buffer.from(await res.arrayBuffer());
}

/** The semi-transparent watermark label, rendered as an SVG sharp can composite. */
function watermarkSvg(): Buffer {
  const width = 210;
  const height = 32;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" rx="6" fill="black" fill-opacity="0.45"/>` +
    `<text x="${width / 2}" y="21" text-anchor="middle" ` +
    `font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="600" ` +
    `fill="white" fill-opacity="0.9">${WATERMARK_TEXT}</text>` +
    `</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Enforce the demo constraints on a generated image: crop/resize to exactly 512×512 (even if the
 * provider ignored the requested size) and composite the visible watermark into the bottom-right
 * corner. Returns a PNG. Exported for unit tests.
 */
export async function watermarkImage(input: Buffer): Promise<Buffer> {
  const margin = 12;
  const label = watermarkSvg();
  return sharp(input)
    .resize(DEMO_IMAGE_SIZE, DEMO_IMAGE_SIZE, { fit: "cover" })
    .composite([
      {
        input: label,
        top: DEMO_IMAGE_SIZE - 32 - margin,
        left: DEMO_IMAGE_SIZE - 210 - margin,
      },
    ])
    .png()
    .toBuffer();
}

export type DemoImageResult =
  | { ok: true; url: string }
  | { ok: false; reason: "no_key" }
  | { ok: false; reason: "failed"; message: string };

/**
 * Generate one watermarked 512×512 demo image for `prompt`. Never throws: every failure mode
 * (missing key, provider error, timeout, bad output) comes back as a typed result the API route
 * maps to an honest response.
 */
export async function generateDemoImage(prompt: string): Promise<DemoImageResult> {
  const provider = getActiveProvider();
  if (!provider) return { ok: false, reason: "no_key" };

  try {
    const ref = await provider.generate({
      kind: "image",
      prompt,
      model: DEMO_IMAGE_MODEL.falModelId,
      // Force the degraded demo size at the fal API level (fal's `image_size` input field).
      // Nothing client-supplied reaches this request, so the cap cannot be overridden.
      params: { image_size: { width: DEMO_IMAGE_SIZE, height: DEMO_IMAGE_SIZE } },
    });

    // Poll inline until the generation is terminal or the hard timeout passes. A transient poll
    // error just retries on the next tick — only a provider-reported failure is terminal.
    const deadline = Date.now() + IMAGE_TIMEOUT_MS;
    let status: JobStatus = { state: "queued" };
    for (;;) {
      try {
        status = await provider.poll(ref);
      } catch {
        // transient transport error — retry on the next tick
      }
      if (status.state === "done" || status.state === "failed") break;
      if (Date.now() >= deadline) {
        return {
          ok: false,
          reason: "failed",
          message: `timed out after ${Math.round(IMAGE_TIMEOUT_MS / 1000)}s`,
        };
      }
      await sleep(POLL_INTERVAL_MS);
    }

    if (status.state === "failed") {
      return { ok: false, reason: "failed", message: status.error ?? "generation failed" };
    }
    if (!status.outputUrl) {
      return {
        ok: false,
        reason: "failed",
        message: "provider reported done without an output url",
      };
    }

    const original = await downloadOutput(status.outputUrl);
    const watermarked = await watermarkImage(original);
    const key = `media/demo/${randomUUID()}.png`;
    const url = await getStorage().put(watermarked, key, "image/png");
    return { ok: true, url };
  } catch (err) {
    return {
      ok: false,
      reason: "failed",
      message: err instanceof Error ? err.message : "generation failed",
    };
  }
}
