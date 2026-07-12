"use client";

/**
 * Media demo (client): a prompt box that POSTs to /api/media and shows the returned image.
 *
 * The Community demo is DELIBERATELY degraded: one image model, 512×512, and a visible
 * "EBS Free — Demo" watermark (all enforced server-side in lib/media/generate.ts). The
 * request is synchronous — one fetch returns the finished image URL — so there is no job
 * polling here. Missing FAL_KEY surfaces as a labeled notice, never an error.
 */
import { useState, type FormEvent } from "react";
import { DEMO_IMAGE_MODEL } from "@/lib/ai/models";

/** Shape of the /api/media response (success, dry-run, or failure). */
interface MediaResponse {
  url?: string;
  dryRun?: boolean;
  message?: string;
  error?: string;
}

const DEMO_NOTICE =
  "Demo output: watermarked & low-res (512×512). Full media studio is in EBS Developer.";

export function StudioClient({ dryRun }: { dryRun: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;

    setBusy(true);
    setNotice(null);
    setImageUrl(null);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = (await res.json().catch(() => ({}))) as MediaResponse;

      if (res.ok && data.url) {
        setImageUrl(data.url);
        setPrompt("");
      } else if (data.dryRun) {
        setNotice(data.message ?? "Set FAL_KEY in .env to try the media demo");
      } else {
        setNotice(data.message ?? data.error ?? "Generation failed — please try again.");
      }
    } catch {
      setNotice("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Studio</h1>
        {dryRun && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            Dry-run mode
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Generate an image with {DEMO_IMAGE_MODEL.displayName}.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{DEMO_NOTICE}</p>

      {dryRun && (
        <div className="mt-4 rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
          Set <code>FAL_KEY</code> in <code>.env</code> to try the media demo.
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe an image…"
          rows={4}
          className="w-full resize-y rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || prompt.trim() === ""}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
          {busy && (
            <span className="text-xs text-muted-foreground">
              This can take up to a minute or two…
            </span>
          )}
        </div>
      </form>

      {notice && (
        <div className="mt-4 rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          {notice}
        </div>
      )}

      {imageUrl && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Generated demo image (watermarked, 512×512)"
            width={512}
            height={512}
            className="rounded-md"
          />
          <p className="mt-3 text-xs text-muted-foreground">{DEMO_NOTICE}</p>
        </div>
      )}
    </div>
  );
}
