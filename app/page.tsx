import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    title: "Streaming AI chat",
    body: "Chat with OpenAI, Anthropic, or Google models. Bring your own API key via an env var — set it in .env and go. No account, no signup.",
  },
  {
    title: "Image demo",
    body: "A watermarked 512×512 image-generation demo powered by fal.ai. Set FAL_KEY to try it; without a key it runs in a labeled dry-run mode.",
  },
  {
    title: "Runs locally in minutes",
    body: "npm install, add a key to .env, npm run dev. One Next.js codebase, off-the-shelf stack (React, TypeScript, Tailwind, AI SDK). No database, no Docker.",
  },
  {
    title: "Honestly simple",
    body: "Single-user and local by design: chat history is session-only, there is no billing, no auth, no persistence. A taste of the architecture, not a business.",
  },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. EBS Community is free and open source. You pay only your own AI providers (OpenAI, Anthropic, Google, fal.ai) for the API calls you make with your keys.",
  },
  {
    q: "Can I run it with no keys to try it?",
    a: "Yes. With zero env keys the app still boots: chat returns labeled dry-run replies and the image demo shows a set-your-key notice. Add a key to turn a feature on.",
  },
  {
    q: "What's the catch?",
    a: "No catch — but know the ceiling. It's single-user and local: no accounts, no saved history, no billing, and the image demo is deliberately watermarked and low-res. The paid editions remove those limits.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          EBS Community
        </span>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link
            href="/chat"
            className="rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Open app
          </Link>
          <ThemeToggle />
        </nav>
      </header>

      <section className="py-20 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
          Free · open source · bring your own key
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight text-foreground">
          A free AI chat web app you can run locally in minutes.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Streaming chat with your own OpenAI, Anthropic, or Google API key, plus a watermarked
          image-generation demo. One small Next.js codebase you can read end to end.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Try the chat
          </Link>
          <Link
            href="/studio"
            className="rounded-md border border-border px-6 py-3 font-medium text-foreground hover:bg-surface-strong"
          >
            Try the image demo
          </Link>
        </div>
      </section>

      <section className="grid gap-6 py-16 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-2 text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="py-16">
        <h2 className="text-center text-3xl font-bold text-foreground">
          Need more than a demo?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Community is the free taste. The paid editions are the same architecture, grown up.
        </p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold text-foreground">EBS Developer</h3>
            <p className="mt-2 text-muted-foreground">
              Want the full boilerplate? Full media studio (image, video, audio), gallery,
              multi-model catalogue, auth, and a deploy-ready setup.
            </p>
            <a href="https://ebs.top" className="mt-4 inline-block font-medium text-accent hover:underline">
              Get EBS Developer →
            </a>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold text-foreground">EBS Business</h3>
            <p className="mt-2 text-muted-foreground">
              Want to launch and charge customers? Billing, a real prepaid credit ledger, payment
              rails, and multi-tenancy — everything Community deliberately leaves out.
            </p>
            <a href="https://ebs.top" className="mt-4 inline-block font-medium text-accent hover:underline">
              Get EBS Business →
            </a>
          </div>
        </div>
      </section>

      <section className="py-16">
        <h2 className="text-center text-3xl font-bold text-foreground">Honest FAQ</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <h3 className="font-semibold text-foreground">{item.q}</h3>
              <p className="mt-2 text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        EBS Community — free and open source. Bring your own keys.
      </footer>
    </main>
  );
}
