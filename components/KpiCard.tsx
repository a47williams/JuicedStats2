export default function KpiCard({
  title, value, line, onClick
}: { title: string; value: number; line?: string; onClick?: () => void }) {
  const prop = line ? parseFloat(line) : undefined;
  return (
    <button type="button" onClick={onClick}
      className="text-left rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-500/60">
      <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value.toFixed(2)}</div>
      {Number.isFinite(prop) && (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {(value - (prop as number) >= 0 ? "+" : "") + (value - (prop as number)).toFixed(2)} vs {prop}
        </div>
      )}
      <div className="mt-3 h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className="h-1 w-2/3 rounded-full bg-amber-500" />
      </div>
    </button>
  );
}