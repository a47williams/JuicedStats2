"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Hydration-safe init: read saved theme or media query
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("theme") as "light" | "light" | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const t = (saved as "light" | "dark" | null) ?? (prefersDark ? "dark" : "light");
      setTheme(t);
      document.documentElement.classList.toggle("dark", t === "dark");
    } catch {
      document.documentElement.classList.add("dark");
    }
  }, []);

  if (!mounted) return null;

  function toggle() {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch {}
    document.documentElement.classList.toggle("dark", t === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-md border px-2 py-1 text-xs border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
