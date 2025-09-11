// lib/fairLine.ts

/** Breakeven probability for American odds. */
export function breakevenFromOdds(odds: number): number {
  if (Number.isNaN(odds)) return NaN;
  return odds > 0 ? 100 / (odds + 100) : -odds / (-odds + 100);
}

/**
 * Simple empirical "fair line" for OVER bets:
 * Choose the (1 - pBE) quantile of the observed distribution.
 */
export function fairLineFromEmpirical(values: number[], pBreakeven: number) {
  const v = values.filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
  if (v.length === 0 || !Number.isFinite(pBreakeven)) return null;
  const q = Math.max(0, Math.min(1, 1 - pBreakeven));
  const idx = Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))));
  return v[idx];
}
