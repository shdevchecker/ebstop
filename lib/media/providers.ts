/**
 * lib/media/providers.ts — resolves the active MediaProvider (fal.ai) from env.
 *
 * getActiveProvider() returns null when no FAL_KEY is configured. The media layer treats null
 * as the labeled DRY-RUN path: no provider call, a placeholder result instead.
 *
 * Server-only: reads provider secrets.
 */
import "server-only";
import { env, flags } from "@/lib/env";
import type { MediaProvider } from "@/lib/media/types";
import { createFalProvider, FAL_MEDIA_HOSTS } from "@/lib/media/fal";

export type MediaProviderId = "fal";

/**
 * SSRF allowlist: the host suffixes the media download step (lib/media/generate.ts
 * downloadOutput) is allowed to fetch provider output from. Derived from the provider's OWN documented output
 * hosts, so adding a provider means adding its documented output host here. Suffix-matched so
 * provider CDN subdomains (v3.fal.media, v3b.fal.media, …) are covered without listing each one.
 */
export const MEDIA_DOWNLOAD_HOST_SUFFIXES: readonly string[] = [...FAL_MEDIA_HOSTS];

/**
 * True when `rawUrl` is an https URL whose host is (or is a subdomain of) an allowlisted media
 * output host. Everything else is rejected: a non-https scheme, an internal/link-local/metadata
 * address, an unknown host, or a lookalike like `fal.media.evil.com`. The download step calls this
 * BEFORE fetching so a hostile/echoed URL never triggers a request.
 */
export function isAllowedMediaDownloadUrl(rawUrl: string): boolean {
  let host: string;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    host = url.hostname.toLowerCase();
  } catch {
    return false;
  }
  return MEDIA_DOWNLOAD_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** The configured provider id. */
export function activeProviderId(): MediaProviderId {
  return "fal";
}

/** Whether the given provider is fully configured (drives the dry-run decision). */
export function isProviderConfigured(_id: MediaProviderId): boolean {
  return flags.hasFal;
}

/** Build the active provider, or null when it isn't configured (dry-run). */
export function getActiveProvider(): MediaProvider | null {
  return env.FAL_KEY ? createFalProvider({ apiKey: env.FAL_KEY }) : null;
}
