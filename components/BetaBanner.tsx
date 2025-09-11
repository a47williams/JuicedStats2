// components/BetaBanner.tsx
"use client";

type Props = {
  code?: string; // promo code to show on the right
};

export default function BetaBanner({ code }: Props) {
  return (
    <div className="w-full bg-amber-900/20 text-amber-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2 text-xs md:text-sm">
        <div className="truncate">
          {/* Mobile-short + Desktop-long copy */}
          <span className="md:hidden">
            🔓 Open Beta: Pro free until Oct 1.
          </span>
          <span className="hidden md:inline">
            Pro features free until Oct 1. Pricing then: Day $3 · Week $7 · Monthly $14.99 · Season $99.
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {code ? (
            <span className="hidden rounded-md bg-emerald-600/20 px-2 py-1 text-emerald-300 md:inline">
              25% off season until Oct 1 (code: <strong>{code}</strong>)
            </span>
          ) : null}
          <a
            href="/account?upgrade=1"
            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-500"
          >
            Upgrade
          </a>
        </div>
      </div>
    </div>
  );
}
