/**
 * Studio page (server component). Resolves whether the active media provider has a key (drives
 * the dry-run label), then hands off to the client studio UI. All generation logic lives behind
 * /api/media.
 */
import { activeProviderId, isProviderConfigured } from "@/lib/media/providers";
import { StudioClient } from "@/components/studio/studio-client";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  const dryRun = !isProviderConfigured(activeProviderId());
  return <StudioClient dryRun={dryRun} />;
}
