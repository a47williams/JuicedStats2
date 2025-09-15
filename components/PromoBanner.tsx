// components/PromoBanner.tsx
import Link from "next/link";

export default function PromoBanner() {
  return (
    <div className="w-full bg-amber-100 text-amber-900 dark:bg-amber-700/20 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800">
      <div className="mx-auto max-w-6xl px-4 py-2 text-center text-sm">
        <span className="font-medium">Pro features free until Oct 14.</span>{" "}
        Pricing then: $3 day · $7 week · $14.99 monthly · <span className="line-through">$99</span>{" "}
        <span className="font-semibold">season</span>.{" "}
        <span className="whitespace-nowrap font-semibold">
          25% off <u>SEASON</u> with code <code className="px-1">EARLYBIRD25</code> thru Oct 14.
        </span>
        <Link
          href="/account?upgrade=1"
          className="ml-3 inline-flex items-center rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
