"use client";

import React, { useMemo } from "react";

type LogRow = {
  date: string;
  ha: "H" | "A";
  min: number;
  restDays?: number;
  pts?: number;
  reb?: number;
  ast?: number;
  blk?: number;
  stl?: number;
  tov?: number;
  pra?: number;
  [k: string]: any;
};

function mean(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function fmtNum(n?: number | null, d = 2) { return n == null || Number.isNaN(n) ? "—" : n.toFixed(d); }
function americanToImpliedProb(odds: number) { return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100); }
function profitIfWin100(odds: number) { return odds > 0 ? odds : 10000 / Math.abs(odds); } // profit for $100 stake

// --- Normal CDF (via erf approximation) ---
function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}
function normCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function tinyBar(pct: number | null) {
  const v = pct == null || !Number.isFinite(pct) ? 0 : Math.max(0, Math.min(1, pct));
  return (
    <div className="mt-2 h-1.5 w-full rounded bg-neutral-800">
      <div className="h-1.5 rounded" style={{ width: `${v * 100}%`, backgroundColor: "rgb(234 179 8)" }} />
    </div>
  );
}

const tones = {
  neutral: "border-neutral-800 bg-neutral-900/60",
  success: "border-green-600/50 bg-green-900/20",
  warning: "border-amber-600/50 bg-amber-900/20",
  danger: "border-red-600/50 bg-red-900/20",
};

function KpiCard({
  title, value, sub, barPct, money, tone = "neutral",
}: {
  title: string;
  value: string;
  sub?: string;
  barPct?: number | null;
  money?: boolean;
  tone?: keyof typeof tones;
}) {
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-neutral-300 mb-1">{title}</div>
      <div className="text-2xl font-semibold">{money ? `$${value}` : value}</div>
      {sub ? <div className="mt-1 text-xs text-neutral-300/80 whitespace-pre-line">{sub}</div> : null}
      {barPct != null ? tinyBar(barPct) : null}
    </div>
  );
}

export default function KpiGrid({
  logs, stat, propLine, odds,
}: {
  logs: LogRow[];
  stat: string;
  propLine?: number | "";
  odds?: number | "";
}) {
  const {
    n, values, avg, avgHome, avgAway, weightedAvg, last3Avg, last5Avg,
    minVal, medVal, maxVal, hitRate, breakeven, profit100, ev100, confidence,
  } = useMemo(() => {
    const vals = (logs || [])
      .map((r) => Number(r?.[stat] ?? r?.pts ?? 0))
      .filter((v) => Number.isFinite(v));
    const n = vals.length;

    const homeVals = (logs || [])
      .filter((r) => r.ha === "H")
      .map((r) => Number(r?.[stat] ?? r?.pts ?? 0))
      .filter((v) => Number.isFinite(v));

    const awayVals = (logs || [])
      .filter((r) => r.ha === "A")
      .map((r) => Number(r?.[stat] ?? r?.pts ?? 0))
      .filter((v) => Number.isFinite(v));

    const avg = mean(vals);
    const avgHome = mean(homeVals);
    const avgAway = mean(awayVals);

    // Weighted avg (newest heavier). Assume logs are newest-first.
    let weightedAvg = 0;
    if (n > 0) {
      const weights = vals.map((_, i) => n - i);
      const wsum = weights.reduce((a, b) => a + b, 0);
      weightedAvg = vals.reduce((a, v, i) => a + v * weights[i], 0) / wsum;
    }

    const last3Avg = mean(vals.slice(0, 3));
    const last5Avg = mean(vals.slice(0, 5));

    const minVal = vals.length ? Math.min(...vals) : 0;
    const maxVal = vals.length ? Math.max(...vals) : 0;
    const medVal = median(vals);

    // --- Hit rate against the OVER (>= propLine) ---
    let hits = 0;
    if (typeof propLine === "number" && Number.isFinite(propLine))
      hits = vals.filter((v) => v >= propLine).length;

    let hitRate: number | null = null;
    if (typeof propLine === "number" && Number.isFinite(propLine)) {
      hitRate = n ? hits / n : 0;
    }

    // --- Break-even and profit if win ---
    let breakeven: number | null = null;
    let profit100: number | null = null;
    if (typeof odds === "number" && Number.isFinite(odds)) {
      breakeven = americanToImpliedProb(odds);
      profit100 = profitIfWin100(odds);
    }

    // --- EV on $100 stake using hitRate ---
    let ev100: number | null = null;
    if (
      hitRate != null &&
      typeof odds === "number" &&
      Number.isFinite(odds) &&
      typeof profit100 === "number"
    ) {
      ev100 = hitRate * profit100 - (1 - hitRate) * 100;
    }

    // --- Confidence: probability the bet is positive-EV (uses z-score vs. breakeven) ---
    // Laplace-smoothed p-hat and variance; treat breakeven as fixed.
    let confidence: number | null = null;
    if (
      typeof propLine === "number" &&
      Number.isFinite(propLine) &&
      typeof odds === "number" &&
      Number.isFinite(odds) &&
      n > 0
    ) {
      const pHat = (hits + 1) / (n + 2); // Laplace smoothing
      const pBE = americanToImpliedProb(odds);
      const sigma = Math.sqrt(pHat * (1 - pHat) / (n + 2));
      if (sigma === 0) {
        confidence = pHat > pBE ? 1 : 0;
      } else {
        const z = (pHat - pBE) / sigma;
        confidence = Math.max(0, Math.min(1, normCdf(z)));
      }
    }

    return {
      n, values: vals, avg, avgHome, avgAway, weightedAvg, last3Avg, last5Avg,
      minVal, medVal, maxVal, hitRate, breakeven, profit100: profit100 ?? null, ev100, confidence,
    };
  }, [logs, stat, propLine, odds]);

  const showEV = typeof propLine === "number" && typeof odds === "number";

  // Confidence tone mapping (now centered at 50%)
  const confTone: "danger" | "warning" | "success" | "neutral" =
    confidence == null ? "neutral" : confidence < 0.55 ? "danger" : confidence < 0.70 ? "warning" : "success";

  return (
    <div className="space-y-3">
      <div className="text-xs text-neutral-400">Games: {n} • Stat: {stat.toUpperCase()}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <KpiCard title="Season Avg" value={fmtNum(avg)} sub="Average of the chosen stat across the games shown."
                 barPct={n ? Math.min(1, avg / Math.max(1, Math.max(...values))) : 0} />
        <KpiCard title="Home Avg" value={fmtNum(avgHome)} sub="Average when the player was at home."
                 barPct={n ? Math.min(1, (avgHome || 0) / Math.max(1, Math.max(...values))) : 0} />
        <KpiCard title="Away Avg" value={fmtNum(avgAway)} sub="Average when the player was away."
                 barPct={n ? Math.min(1, (avgAway || 0) / Math.max(1, Math.max(...values))) : 0} />

        {/* CONFIDENCE with improved calculation and color-changing tone */}
        <KpiCard
          title="Confidence"
          value={confidence == null ? "—" : `${(confidence * 100).toFixed(0)}%`}
          sub={
            confidence == null
              ? "Add Prop Line + Odds to see this."
              : "Probability your bet is positive-EV based on games shown and your odds."
          }
          barPct={confidence == null ? 0 : confidence}
          tone={confTone}
        />

        <KpiCard title="Weighted Avg" value={fmtNum(weightedAvg)} sub="Recent games count more than older games."
                 barPct={n ? Math.min(1, weightedAvg / Math.max(1, Math.max(...values))) : 0} />
        <KpiCard title="Last 3 Avg" value={fmtNum(last3Avg)} sub="Average over the most recent 3 games."
                 barPct={n ? Math.min(1, last3Avg / Math.max(1, Math.max(...values))) : 0} />
        <KpiCard title="Last 5 Avg" value={fmtNum(last5Avg)} sub="Average over the most recent 5 games."
                 barPct={n ? Math.min(1, last5Avg / Math.max(1, Math.max(...values))) : 0} />

        <KpiCard
          title="Games / Distrib"
          value={String(n)}
          sub={`Games: ${n}\nMin: ${fmtNum(minVal, 1)}  Med: ${fmtNum(medVal, 1)}  Max: ${fmtNum(maxVal, 1)}`}
        />

        <KpiCard
          title="Hit Rate"
          value={
            typeof propLine === "number" && Number.isFinite(propLine) && n
              ? `${(values.filter((v) => v >= (propLine as number)).length / n * 100).toFixed(1)}%`
              : "0.0%"
          }
          sub="How often the player met or beat your Prop Line here."
          barPct={
            typeof propLine === "number" && Number.isFinite(propLine) && n
              ? values.filter((v) => v >= (propLine as number)).length / n
              : 0
          }
        />

        <KpiCard
          title="Break-even %"
          value={
            typeof odds === "number" && Number.isFinite(odds)
              ? `${(americanToImpliedProb(odds) * 100).toFixed(1)}%`
              : "0.0%"
          }
          sub="Win rate needed to break even at your odds."
          barPct={typeof odds === "number" ? americanToImpliedProb(odds) : 0}
        />

        <KpiCard
          title="Profit if Win ($100)"
          value={
            typeof odds === "number" && Number.isFinite(odds)
              ? profitIfWin100(odds).toFixed(2)
              : "0.00"
          }
          sub="Profit (not payout) on a $100 winning bet."
          money
          barPct={null}
        />

        <KpiCard
          title="EV / $100"
          value={showEV && !Number.isNaN(ev100 ?? NaN) ? (ev100 as number).toFixed(2) : "—"}
          sub={"Expected profit per $100 bet using the hit rate above and your odds.\nPositive is good; $0 is breakeven; negative means an expected loss."}
          money
          barPct={null}
        />
      </div>
    </div>
  );
}
