/**
 * lib/media/types.ts — the MediaProvider contract.
 *
 * A MediaProvider is a THIN client over one media API: it submits a generation and reports
 * status. It does exactly that and nothing else — storage, timeouts, and orchestration live
 * outside the adapter. That separation is why adapters stay trivially testable against mocked
 * HTTP.
 *
 * Add a provider by implementing this interface (lib/media/fal.ts is the reference
 * implementation) and registering it in lib/media/providers.ts. Pure types only — safe to import
 * from client code (e.g. lib/ai/models.ts, which the studio model picker reads).
 */

/** The three media kinds the studio + gallery support. */
export type MediaKind = "image" | "video" | "audio";

/** A generation request handed to a provider. `model`/`params` are provider-specific pass-throughs. */
export interface MediaRequest {
  kind: MediaKind;
  /** The text prompt. For audio (TTS) this is the text to speak. */
  prompt: string;
  /** Provider-specific model id (a fal model id / a Replicate version). The adapter passes it through. */
  model?: string;
  /** Extra provider input fields (image_size, duration, voice, …), merged into the request body. */
  params?: Record<string, unknown>;
}

/** Lifecycle state of a generation, shared by JobStatus and the media_jobs row. */
export type JobState = "queued" | "running" | "done" | "failed";

/**
 * A serializable handle to a submitted generation. Returned by generate() and passed back to
 * poll(); the jobs layer persists it (as JSON) so a later request can resume polling. Fields
 * beyond `id` are provider-specific pointers the adapter needs to poll and fetch the result.
 */
export interface JobRef {
  /** The provider's own request/prediction id. */
  id: string;
  /** Which provider owns this ref (matches MediaProvider.id). */
  provider: string;
  /** The kind generated — poll() uses it to locate the output URL in the provider's result shape. */
  kind: MediaKind;
  /** Endpoint to poll for status (provider-specific). */
  statusUrl?: string;
  /** Endpoint that returns the final result payload (provider-specific). */
  resultUrl?: string;
  /** Endpoint to cancel the job (provider-specific). */
  cancelUrl?: string;
}

/** The result of polling a job. On `done` the jobs layer downloads outputUrl into app storage. */
export interface JobStatus {
  state: JobState;
  /** Provider output URL when done (downloaded into app storage immediately — provider URLs expire). */
  outputUrl?: string;
  /** Human-readable failure reason when failed. */
  error?: string;
}

/** FROZEN: the shape every media backend implements. Additive-only. */
export interface MediaProvider {
  id: string;
  generate(req: MediaRequest): Promise<JobRef>;
  poll(job: JobRef): Promise<JobStatus>;
}
