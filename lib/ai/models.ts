/**
 * lib/ai/models.ts — SINGLE SOURCE OF TRUTH for the chat model catalogue and the one demo
 * image model.
 *
 * Nothing else in the codebase hardcodes a model slug. The model picker (client) selects from
 * MODELS, and the chat pipeline (server) reads the chosen entry from here. There is no pricing,
 * no metering, and no database in this edition — customize the catalogue by editing MODELS
 * below: add a row, change a slug, done.
 *
 * This module is intentionally PURE DATA with no server-only imports, so it is safe to import
 * into client components (the model picker). Secrets are never here — only the NAME of the env
 * var each provider's platform key lives in (`platformKeyEnv`), resolved server-side.
 *
 * Model slugs were verified against the installed @ai-sdk provider types (ai v7). Entries where
 * the slug/baseURL could not be verified from types are flagged `⚠ VERIFY-AT-QA`.
 *
 * MEDIA: the single image model behind the Community media demo also lives here (see
 * DEMO_IMAGE_MODEL at the bottom) — the demo pipeline reads it from here.
 */

/** How the chat pipeline instantiates the model. */
export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "openai-compatible";

/**
 * BYOK "bucket" — which vendor account a model authenticates against. In this edition keys come
 * from env vars only (there is no database); OpenAI-compatible vendors (z.ai/DeepSeek/Qwen) each
 * get their own bucket because each needs its own key.
 */
export type KeyProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "zai"
  | "deepseek"
  | "qwen";

export interface ChatModel {
  /** Stable internal id used in the API body and the model picker. */
  id: string;
  /** Human-facing name shown in the picker. */
  displayName: string;
  /** One-line description for the picker. */
  description: string;
  /** Which SDK provider builds this model. */
  provider: ModelProvider;
  /** The provider's own model slug (what gets sent to the API). */
  modelId: string;
  /** Base URL for `openai-compatible` providers; omitted for first-party SDKs. */
  baseURL?: string;
  /** Name of the env var holding the PLATFORM api key (resolved server-side, never shipped to client). */
  platformKeyEnv: string;
  /** BYOK bucket this model authenticates against. */
  keyProvider: KeyProvider;
}

export const MODELS: readonly ChatModel[] = [
  {
    id: "gpt-5.5",
    displayName: "GPT-5.5",
    description: "OpenAI flagship — strongest general reasoning.",
    provider: "openai",
    modelId: "gpt-5.5",
    platformKeyEnv: "OPENAI_API_KEY",
    keyProvider: "openai",
  },
  {
    id: "claude-opus-4-8",
    displayName: "Claude Opus 4.8",
    description: "Anthropic flagship — deep reasoning and long context.",
    provider: "anthropic",
    modelId: "claude-opus-4-8",
    platformKeyEnv: "ANTHROPIC_API_KEY",
    keyProvider: "anthropic",
  },
  {
    id: "gemini-3.1-pro",
    displayName: "Gemini 3.1 Pro",
    description: "Google flagship — multimodal, very long context.",
    provider: "google",
    // Google's flagship pro slug in the installed provider types is a preview id.
    modelId: "gemini-3.1-pro-preview",
    platformKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
    keyProvider: "google",
  },
  {
    id: "glm-5.2",
    displayName: "GLM-5.2",
    description: "Zhipu GLM — strong bilingual (EN/中文) model.",
    provider: "openai-compatible",
    modelId: "glm-5.2",
    baseURL: "https://api.z.ai/api/paas/v4/",
    platformKeyEnv: "ZAI_API_KEY",
    keyProvider: "zai",
  },
  {
    id: "deepseek-chat",
    displayName: "DeepSeek V3",
    description: "DeepSeek chat — capable and cost-efficient.",
    provider: "openai-compatible",
    // ⚠ VERIFY-AT-QA: DeepSeek is OpenAI-compatible; confirm current baseURL + chat slug
    // against DeepSeek's live docs before go-live (not verifiable from installed types).
    modelId: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
    platformKeyEnv: "DEEPSEEK_API_KEY",
    keyProvider: "deepseek",
  },
  {
    id: "qwen-max",
    displayName: "Qwen Max",
    description: "Alibaba Qwen (global) — strong multilingual model.",
    provider: "openai-compatible",
    // ⚠ VERIFY-AT-QA: Qwen via DashScope's OpenAI-compatible endpoint (global/intl profile);
    // confirm current baseURL + model slug against Alibaba's live docs before go-live.
    modelId: "qwen-max",
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    platformKeyEnv: "DASHSCOPE_API_KEY",
    keyProvider: "qwen",
  },
] as const;

/** A BYOK bucket plus its human label, for the settings key manager. */
export interface KeyProviderInfo {
  id: KeyProvider;
  label: string;
}

/**
 * The distinct BYOK buckets the catalogue uses, with display labels. Order is stable for the
 * settings UI. Derived intent: one entry per vendor account a user can bring a key for.
 */
export const KEY_PROVIDERS: readonly KeyProviderInfo[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "google", label: "Google" },
  { id: "zai", label: "z.ai (GLM)" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "qwen", label: "Qwen (Alibaba)" },
] as const;

/** The model selected by default in the picker (first entry). */
export const DEFAULT_MODEL_ID: string = MODELS[0]!.id;

/** Look up a model by its internal id, or undefined if unknown. */
export function getModel(id: string): ChatModel | undefined {
  return MODELS.find((model) => model.id === id);
}

// ============================================================================
// MEDIA — the single image model behind the Community media demo.
// ============================================================================

/**
 * The one media model in the Community edition: a fast text-to-image model on fal.ai. The demo
 * pipeline (lib/media/generate.ts) reads the fal model id from here; swap the model by editing
 * this constant. Output is DELIBERATELY degraded (512×512 + a visible watermark) — the full
 * multi-model media studio is an EBS Developer feature.
 */
export const DEMO_IMAGE_MODEL = {
  id: "flux-schnell",
  displayName: "FLUX schnell",
  description: "Fast text-to-image (fal.ai).",
  /** The fal.ai model id submitted to the queue API. */
  falModelId: "fal-ai/flux/schnell",
} as const;
