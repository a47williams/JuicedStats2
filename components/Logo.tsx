// components/Logo.tsx
import Link from "next/link";

export default function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-black/5 dark:hover:bg-neutral-800/40"
      aria-label="JuicedStats — go to home"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-400 font-bold text-neutral-900">
        JS
      </span>
      {withText && (
        <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          JuicedStats
        </span>
      )}
    </Link>
  );
}
