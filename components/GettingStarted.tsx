"use client";

type Props = {
  onLoadSample: () => void;
  onDismiss: () => void;
};

export default function GettingStarted({ onLoadSample, onDismiss }: Props) {
  return (
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">New here? Start with a sample.</div>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-neutral-700 dark:text-neutral-300">
            <li><span className="font-medium">Type a player’s name</span> and pick from the list.</li>
            <li>Choose a <span className="font-medium">season</span> and <span className="font-medium">stat</span> (e.g., Points).</li>
            <li>Click <span className="font-medium">Fetch Game Logs</span> to see the breakdown and KPIs.</li>
          </ol>
          <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
            Tip: Season uses the start year (e.g., <b>2024</b> = 2024–25). Prop Line and Odds help calculate hit% and EV.
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onLoadSample}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Load sample (Tatum / 2024 / Points)
          </button>
          <button
            onClick={onDismiss}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
