export default function PresetChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-sm text-amber-900 hover:bg-amber-200 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20">
      {label}
    </button>
  );
}