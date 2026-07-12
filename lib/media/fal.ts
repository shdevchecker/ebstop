/**
 * lib/media/fal.ts — the fal.ai MediaProvider (default provider).
 *
 * Coded ONLY against docs/apis/fal.md (the inference Queue API): submit → poll status → fetch
 * result. Two subtleties from the doc that this adapter is careful about:
 *   - A COMPLETED status with an `error` field is a FAILURE, not a success (doc §2). We check for
 *     `error` before treating a completed job as done.
 *   - Result URLs expire (doc §2 "Media URL expiration"), so we only RETURN the url here; the jobs
 *     layer downloads it into app storage immediately.
 *
 * The adapter is model-agnostic: the fal model id arrives via MediaRequest.model (defaults +
 * per-generation prices live in lib/ai/models.ts, the single source of truth). Buyers rarely edit
 * this file — change models/prices in lib/ai/models.ts, or add a sibling provider.
 *
 * Server-only: uses the FAL_KEY secret.
 */
import "server-only";
import type {
  JobRef,
  JobStatus,
  MediaKind,
  MediaProvider,
  MediaRequest,
} from "@/lib/media/types";

const FAL_QUEUE_BASE = "https://queue.fal.run";

/**
 * Hosts fal serves RESULT media from (docs/apis/fal.md §2: `fal.media` / `v3.fal.media` /
 * `v3b.fal.media`). Suffix-matched by the H12 download allowlist (lib/media/providers.ts) so the
 * jobs layer only fetches provider output from fal's own CDN — an SSRF defense on the output URL.
 */
export const FAL_MEDIA_HOSTS = ["fal.media"] as const;

type FetchLike = typeof fetch;

export interface FalProviderOptions {
  apiKey: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: FetchLike;
}

/** fal's input field name: audio/TTS uses `text`, image/video use `prompt` (doc §3–4). */
function inputField(kind: MediaKind): "text" | "prompt" {
  return kind === "audio" ? "text" : "prompt";
}

/** Locate the output URL in a fal result by kind (doc §4 adapter mapping). */
function extractOutputUrl(kind: MediaKind, result: unknown): string | undefined {
  if (typeof result !== "object" || result === null) return undefined;
  const record = result as Record<string, unknown>;

  if (kind === "image") {
    const images = record.images;
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0] as Record<string, unknown> | undefined;
      const url = first?.url;
      return typeof url === "string" ? url : undefined;
    }
    return undefined;
  }

  const container = kind === "video" ? record.video : record.audio;
  if (typeof container === "object" && container !== null) {
    const url = (container as Record<string, unknown>).url;
    return typeof url === "string" ? url : undefined;
  }
  return undefined;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/** Build a fal MediaProvider bound to an API key (and, for tests, an injected fetch). */
export function createFalProvider(options: FalProviderOptions): MediaProvider {
  const doFetch = options.fetchImpl ?? fetch;
  const authHeaders: Record<string, string> = {
    Authorization: `Key ${options.apiKey}`,
  };

  return {
    id: "fal",

    async generate(req: MediaRequest): Promise<JobRef> {
      const model = req.model;
      if (!model) throw new Error("fal: missing model id");

      const body: Record<string, unknown> = { ...(req.params ?? {}) };
      body[inputField(req.kind)] = req.prompt;

      const res = await doFetch(`${FAL_QUEUE_BASE}/${model}`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`fal submit failed: ${res.status} ${await safeText(res)}`);
      }

      const json = (await res.json()) as {
        request_id?: string;
        status_url?: string;
        response_url?: string;
        cancel_url?: string;
      };
      if (!json.request_id) {
        throw new Error("fal submit: no request_id in response");
      }
      return {
        id: json.request_id,
        provider: "fal",
        kind: req.kind,
        statusUrl: json.status_url,
        resultUrl: json.response_url,
        cancelUrl: json.cancel_url,
      };
    },

    async poll(job: JobRef): Promise<JobStatus> {
      if (!job.statusUrl) {
        return { state: "failed", error: "fal: missing status url" };
      }

      const statusRes = await doFetch(job.statusUrl, { headers: authHeaders });
      if (!statusRes.ok) {
        // Transient transport/HTTP error (429/5xx/…): THROW so the jobs layer's transient-retry
        // keeps the job in-flight and polls again (R10-M1). Returning failed here would refund a
        // generation the provider may still deliver — only an explicit provider-reported "failed"
        // below is terminal. Mirrors the gateway adapter's throw-on-non-ok shape.
        throw new Error(`fal status failed: ${statusRes.status}`);
      }
      const status = (await statusRes.json()) as {
        status?: string;
        error?: unknown;
      };

      if (status.status === "IN_QUEUE") return { state: "queued" };
      if (status.status === "IN_PROGRESS") return { state: "running" };
      // Any other non-terminal/unknown state: keep polling rather than failing prematurely.
      if (status.status !== "COMPLETED") return { state: "running" };

      // COMPLETED: an `error` at the status level is already a failure (doc §2).
      if (status.error) return { state: "failed", error: String(status.error) };

      const resultUrl = job.resultUrl ?? job.statusUrl.replace(/\/status$/, "");
      const resultRes = await doFetch(resultUrl, { headers: authHeaders });
      if (!resultRes.ok) {
        // Also transient (R10-M1): the generation COMPLETED, so a non-2xx on the result fetch is a
        // transport hiccup — throw and let the next poll re-fetch rather than refunding.
        throw new Error(`fal result failed: ${resultRes.status}`);
      }
      const result = (await resultRes.json()) as Record<string, unknown>;

      // A COMPLETED-with-error can also surface here (doc §2) — treat it as failure.
      if (result.error) return { state: "failed", error: String(result.error) };

      const outputUrl = extractOutputUrl(job.kind, result);
      if (!outputUrl) {
        return { state: "failed", error: "fal: no output url in result" };
      }
      return { state: "done", outputUrl };
    },
  };
}
