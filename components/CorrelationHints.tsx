type Row = { pts?: number; fg3m?: number; reb?: number; min?: number | string };
function num(x:any){return Number.isFinite(x)?Number(x):parseFloat(String(x??""))||0}
function toMin(x:any){if(typeof x==='number')return x;const s=String(x??'');if(/^\d+(\.\d+)?$/.test(s))return Number(s);const m=s.split(':').map(Number);return m.length===2?m[0]+m[1]/60:0}
function corr(xs:number[], ys:number[]){
  const n=xs.length; if(n!==ys.length||n===0) return 0;
  const mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let nume=0, dx=0, dy=0; for(let i=0;i<n;i++){const a=xs[i]-mx,b=ys[i]-my; nume+=a*b; dx+=a*a; dy+=b*b;}
  const denom=Math.sqrt(dx*dy)||1; return nume/denom;
}
function arrow(c:number){return c>0.35?'↑':c<-0.35?'↓':'↔'}
export default function CorrelationHints({ rows }:{ rows: Row[] }){
  const pts = rows.map(r=>num(r.pts));
  const threes = rows.map(r=>num(r.fg3m));
  const reb = rows.map(r=>num(r.reb));
  const mins = rows.map(r=>toMin(r.min));
  const c1 = corr(pts, threes);
  const c2 = corr(reb, mins);
  return (
    <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
      Correlations: PTS↔3PTM {arrow(c1)} ({(c1*100).toFixed(0)}%), REB↔MIN {arrow(c2)} ({(c2*100).toFixed(0)}%)
    </div>
  );
}