// components/BetaBanner.tsx
import Link from "next/link";

export default function BetaBanner({
  code = "EARLYBIRD25",
  showUpgrade = true,
}: {
  code?: string;
  showUpgrade?: boolean;
}) {
  return (
    <div className="
      border-t border-b
      bg-amber-100 text-amber-900 border-amber-200
      dark:bg-amber-900/25 dark:text-amber-100 dark:border-amber-800
    ">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
        <div className="text-xs sm:text-sm">
          <span className="font-medium">Pro features free until Oct 1.</span>{" "}
          Pricing then: Day $3 · Week $7 · Monthly $14.99 · Season $99.
          <span className="
            ml-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold
            bg-emerald-600 text-white
          ">
            25% off season with code: {code}
          </span>
        </div>

        {showUpgrade && (
          <Link
            href="/account?upgrade=1"
            className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  );
}
