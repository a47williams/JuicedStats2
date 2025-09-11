// components/LockedCard.tsx
"use client";

export default function LockedCard({
  title,
  blurb = "Upgrade to Pro to unlock.",
}: {
  title: string;
  blurb?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <span className="text-[10px] rounded-full border border-neutral-700 px-1.5 py-0.5 text-neutral-400">
          Locked
        </span>
      </div>
      <div className="mt-2 h-8 w-full rounded bg-neutral-800/60" />
      <p className="mt-2 text-xs text-neutral-400">{blurb}</p>
      <a
        href="/account"
        className="mt-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 hover:opacity-90"
      >
        Upgrade
      </a>
    </div>
  );
}
