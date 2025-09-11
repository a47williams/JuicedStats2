"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/CSR mismatch: only show the label after mount
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-md border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {mounted ? (isDark ? "Light" : "Dark") : "…"}
    </button>
  );
}
