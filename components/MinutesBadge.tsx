type Row = { min?: number | string };
function toMin(x: any): number {
  if (typeof x === "number") return x;
  const s = String(x ?? "");
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const m = s.split(":").map(Number);
  return m.length === 2 ? m[0] + m[1]/60 : 0;
}
export default function MinutesBadge({ rows }: { rows: Row[] }) {
  const last10 = rows.slice(-10).map(r => toMin(r.min));
  const avg = last10.length ? last10.reduce((a,b)=>a+b,0)/last10.length : 0;
  const sd = Math.sqrt(last10.reduce((s,x)=>s+Math.pow(x-avg,2),0)/(last10.length||1));
  const vol = sd <= 4 ? "Stable" : sd <= 7 ? "Mixed" : "Volatile";
  const color = vol === "Stable" ? "bg-emerald-500" : vol === "Mixed" ? "bg-amber-500" : "bg-rose-500";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs text-white ${color}`}>
      Minutes: {vol} <span className="opacity-80">(σ={sd.toFixed(1)})</span>
    </span>
  );
}