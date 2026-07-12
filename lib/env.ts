/**
 * Environment configuration — zod-validated with GRACEFUL DEGRADATION.
 *
 * Doctrine: absent env keys must NEVER crash the app. A missing provider key puts that
 * capability into a labeled dry-run mode instead of throwing. Invalid values are reported as
 * issues and then ignored so the app still boots.
 *
 * NODE_ENV UNSET means PRODUCTION (fail-safe — see resolveNodeEnv): Node never sets NODE_ENV by
 * itself, so a bare `node` launch must get the production posture, not dev fallbacks. `next dev`
 * sets NODE_ENV=development and vitest sets NODE_ENV=test, so the keyless dev experience and the
 * test harness are unaffected.
 *
 * Set real values in `.env` (see `.env.example`). Everything here is optional.
 */
import { z } from "zod";

/**
 * The loud one-time boot notice printed when NODE_ENV is absent (fail-safe below).
 * Exported so tests can assert the exact message.
 */
export const NODE_ENV_ASSUMED_PRODUCTION_NOTICE =
  "[env] NODE_ENV is not set — assuming production; set NODE_ENV=development explicitly for local dev.";

/**
 * FAIL-SAFE: resolve NODE_ENV with UNSET treated as PRODUCTION.
 *
 * ONLY the unset/blank case is remapped. Explicit "development" and "test" behave exactly as
 * before (`next dev` and the vitest harness set them); explicit "production" is production. Any
 * OTHER explicit value flows through unchanged here — parseEnv reports it and the schema's
 * fail-safe default (production) applies. Pure + total so tests can drive every branch without
 * process.env.
 */
export function resolveNodeEnv(raw: string | undefined): {
  nodeEnv: string;
  assumedProduction: boolean;
} {
  const value = raw?.trim();
  if (!value) return { nodeEnv: "production", assumedProduction: true };
  return { nodeEnv: value, assumedProduction: false };
}

const EnvSchema = z.object({
  // The schema default is PRODUCTION (fail-safe). loadEnv resolves an absent NODE_ENV before
  // parsing (with the loud notice); this default also catches an INVALID value that zod drops —
  // an unrecognized environment never silently unlocks dev fallbacks.
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),

  // Optional override for the chat system prompt. Absent -> a sensible built-in default.
  CHAT_SYSTEM_PROMPT: z.string().min(1).optional(),

  // AI provider API keys (env-only BYOK). Absent for a provider -> the chat pipeline returns a
  // labeled dry-run reply for that provider's models.
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
  ZAI_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DASHSCOPE_API_KEY: z.string().min(1).optional(),

  // fal.ai key for the media demo. Absent -> media runs in a labeled dry-run.
  FAL_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

type RawEnv = Record<string, string | undefined>;

export interface ParsedEnv {
  env: Env;
  /** Human-readable validation problems; empty when everything is valid. */
  issues: string[];
}

/**
 * Parse + validate raw environment values. Pure and total: it never throws, so it is safe
 * to call at module load. Invalid fields are stripped and reported in `issues`.
 */
export function parseEnv(raw: RawEnv): ParsedEnv {
  const result = EnvSchema.safeParse(raw);
  if (result.success) {
    return { env: result.data, issues: [] };
  }

  const issues = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );

  // Graceful fallback: drop the offending keys and re-parse so the app still boots.
  const cleaned: RawEnv = { ...raw };
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      delete cleaned[key];
    }
  }

  const fallback = EnvSchema.safeParse(cleaned);
  return {
    // Last-resort fallback keeps the schema's fail-safe NODE_ENV default (production).
    env: fallback.success ? fallback.data : EnvSchema.parse({}),
    issues,
  };
}

/**
 * Full env resolution: resolve NODE_ENV (UNSET -> production, loudly), then validate. This is
 * what the module-load singleton and the tests both call. Total: never throws — the graceful-
 * degradation doctrine holds even under the assumed-production posture.
 */
export function loadEnv(raw: RawEnv): ParsedEnv & { assumedProduction: boolean } {
  const { nodeEnv, assumedProduction } = resolveNodeEnv(raw.NODE_ENV);
  if (assumedProduction) {
    console.warn(NODE_ENV_ASSUMED_PRODUCTION_NOTICE);
  }
  const normalized: RawEnv = { ...raw, NODE_ENV: nodeEnv };
  const { env, issues } = parseEnv(normalized);
  return { env, issues, assumedProduction };
}

const parsed = loadEnv(process.env as RawEnv);

export const env: Env = parsed.env;
export const envIssues: string[] = parsed.issues;

/** Capability flags derived from env — the app reads these instead of poking process.env. */
export const flags = {
  /** fal.ai key present -> media generation is live (else dry-run). */
  hasFal: Boolean(env.FAL_KEY),
} as const;

/**
 * AI provider keys, keyed by the env-var NAME each model declares in lib/ai/models.ts
 * (`platformKeyEnv`). The chat pipeline looks a model's key up here; values are server-only and
 * never sent to the client.
 */
export const platformAiKeys: Readonly<Record<string, string | undefined>> = {
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY,
  ZAI_API_KEY: env.ZAI_API_KEY,
  DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
  DASHSCOPE_API_KEY: env.DASHSCOPE_API_KEY,
};
