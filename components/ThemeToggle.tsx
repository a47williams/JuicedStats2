"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Avoid hydration mismatch
    return (
      <button
        aria-label="Toggle theme"
        className="rounded-md border px-3 py-1.5 text-sm border-neutral-800 bg-neutral-900/40"
        disabled
      >
        …
      </button>
    );
  }

  const isDark = theme !== "light";
  const next = isDark ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label="Toggle theme"
      className="
        rounded-md px-3 py-1.5 text-sm font-medium
        border bg-white/70 text-neutral-900 hover:bg-white
        dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:bg-neutral-900
      "
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
