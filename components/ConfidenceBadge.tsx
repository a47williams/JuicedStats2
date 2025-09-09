"use client";

export function confidenceFromEV(ev100: number, sample: number) {
  // sample-aware thresholds so tiny samples don’t look “overconfident”
  // You can tweak these!
  const s = Math.max(0, Math.min(sample, 60));
  const loosen = s < 12 ? 12 - s : 0; // widen bands when sample is small
  const good = 8 + loosen;   // EV ≥ this -> Good
  const ok = 2 + loosen;     // EV ≥ this -> Okay  (else Risky)

  if (ev100 >= good) return { label: "Good", color: "bg-emerald-500", text: "text-emerald-100" };
  if (ev100 >= ok)   return { label: "Okay", color: "bg-amber-500",   text: "text-amber-100" };
  return { label: "Risky", color: "bg-rose-500", text: "text-rose-100" };
}

export default function ConfidenceBadge({ ev100, sample }: { ev100: number; sample: number }) {
  const c = confidenceFromEV(ev100, sample);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">CONFIDENCE</div>
      <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 ${c.color} ${c.text}`}>
        <span className="text-sm font-semibold">{c.label}</span>
      </div>
      <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        Based on EV per $100 and sample size. Larger samples tighten confidence.
      </div>
    </div>
  );
}
