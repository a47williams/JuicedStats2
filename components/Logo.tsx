// components/Logo.tsx
import Link from "next/link";

export default function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-neutral-800/40 transition"
      aria-label="JuicedStats — go to home"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-amber-500 font-bold text-black">
        JS
      </span>
      {withText && (
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          JuicedStats
        </span>
      )}
    </Link>
  );
}
