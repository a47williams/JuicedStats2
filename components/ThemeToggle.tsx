"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const isDark = theme === "dark";
  const cls = "rounded-md border px-3 py-1.5 text-sm border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700";
  return <button className={cls} onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? "Light" : "Dark"}</button>;
}