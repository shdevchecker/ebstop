import type { ReactNode } from "react";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * App shell layout: the app area (chat / studio). Single-user and local — there is no auth,
 * no account, and no balance; API keys come from env vars only.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col justify-between border-r border-border bg-surface p-4">
        <div>
          <Link href="/" className="mb-6 block text-lg font-semibold text-foreground">
            EBS
          </Link>
          <AppNav />
        </div>
        <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Community edition</div>
          <div className="mt-1">Local, single-user</div>
        </div>
      </aside>
      <main className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-border px-8 py-3">
          <ThemeToggle />
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
