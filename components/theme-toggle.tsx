"use client";

import { useEffect, useState } from "react";

/**
 * Presentational light/dark theme toggle.
 *
 * It flips the `.dark` class on <html>, updates `color-scheme`, and persists the choice to
 * localStorage under the "theme" key. The first-paint theme (system preference or the stored
 * choice) is applied by the tiny inline script in app/layout.tsx before React hydrates, so this
 * component only *reflects* and *changes* that state — it never fetches data or touches app logic.
 *
 * Buyers can restyle the button freely; the only contract is the `.dark` class + "theme" key.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeToggle() {
  // Start light and reconcile after mount to avoid a hydration mismatch — the pre-paint script
  // has already set the real theme on <html>, so there is no visible flash.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can be unavailable (private mode / SSR guards) — theme still applies live.
    }
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Icon swaps by theme; suppress until mounted so SSR and client agree. */}
      <span aria-hidden="true" className="text-base leading-none">
        {mounted ? (isDark ? "\u2600\uFE0F" : "\u{1F319}") : "\u25CB"}
      </span>
    </button>
  );
}
