export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-semibold text-white">JS</div>
      <div>
        <div className="font-semibold">JuicedStats</div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">NBA Prop Research</div>
      </div>
    </div>
  );
}