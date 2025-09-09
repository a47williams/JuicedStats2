// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import PlayerSearchBox, { PlayerOption } from "@/components/PlayerSearchBox";
import AffiliateBanner from "@/components/AffiliateBanner";

/* ----------------------------- Types & helpers ----------------------------- */

type StatKey =
  | "Points"
  | "Rebounds"
  | "Assists"
  | "3PTM"
  | "PRA"
  | "PR"
  | "PA"
  | "RA"
  | "Stocks";

type GameRow = {
  date: string; // ISO YYYY-MM-DD or ISO string
  opp?: string;
  ha?: "H" | "A";
  min?: number | string;
  pts?: number;
  reb?: number;
  ast?: number;
  fg3m?: number;
  ["3PTM"]?: number;
  ["3pm"]?: number;
  tpm?: number;
  blk?: number;
  stl?: number;
  tov?: number | null;
  turnover?: number | null;
  team?: string;
  teamScore?: number;
  oppScore?: number;
  result?: "W" | "L";
};

function n(x: any): number {
  const v = typeof x === "number" ? x : parseFloat(String(x ?? ""));
  return Number.isFinite(v) ? v : 0;
}
function sum(xs: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s;
}
function avg(xs: number[]): number {
  if (!xs.length) return 0;
  return sum(xs) / xs.length;
}
function median(xs: number[]): number {
  if (!xs.length) return 0;
  const a = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}
/** Recency weight: values are chronological oldest..newest. */
function recencyWeightedAvg(values: number[], weightPct: number): number {
  if (!values.length) return 0;
  if (weightPct <= 0) return avg(values);
  const base = 1 - Math.min(0.9, weightPct / 100) * 0.5; // 1..0.55
  let wsum = 0;
  let s = 0;
  for (let i = values.length - 1, age = 0; i >= 0; i--, age++) {
    const w = Math.pow(base, age);
    wsum += w;
    s += values[i] * w;
  }
  return s / wsum;
}

function valueForStat(row: GameRow, stat: StatKey): number {
  const pts = n(row.pts);
  const reb = n(row.reb);
  const ast = n(row.ast);
  const stl = n(row.stl);
  const blk = n(row.blk);
  const threes =
    n((row as any).fg3m) ??
    n((row as any)["3PTM"]) ??
    n((row as any)["3pm"]) ??
    n((row as any).tpm);

  switch (stat) {
    case "Points":
      return pts;
    case "Rebounds":
      return reb;
    case "Assists":
      return ast;
    case "3PTM":
      return threes;
    case "PRA":
      return pts + reb + ast;
    case "PR":
      return pts + reb;
    case "PA":
      return pts + ast;
    case "RA":
      return reb + ast;
    case "Stocks":
      return stl + blk;
    default:
      return 0;
  }
}

function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}
function profitIfWinPer100(american: number): number {
  if (!Number.isFinite(american) || american === 0) return 0;
  return american > 0 ? american : 100 * (100 / Math.abs(american));
}
/** Wilson 95% CI for a hit rate. */
function wilsonCI(hits: number, nGames: number, z = 1.96): [number, number] {
  if (nGames === 0) return [0, 0];
  const p = hits / nGames;
  const denom = 1 + (z * z) / nGames;
  const center = p + (z * z) / (2 * nGames);
  const margin = z * Math.sqrt((p * (1 - p)) / nGames + (z * z) / (4 * nGames * nGames));
  const low = Math.max(0, (center - margin) / denom);
  const high = Math.min(1, (center + margin) / denom);
  return [low, high];
}

/* -------------------------- Rest / B2B derivation -------------------------- */

type RestFilter = "ALL" | "B2B2" | "B2B_ANY" | "REST_1" | "REST_2PLUS";

type EnrichedGame = GameRow & {
  _prevGapDays: number | null; // days between this game and previous game date
  _nextGapDays: number | null; // days between next game and this game
  _isB2BSecond: boolean; // previous game was yesterday
  _isB2BEitherNight: boolean; // either prev or next gap == 1 day
};

function toDateOnly(d: string | undefined): Date | null {
  if (!d) return null;
  const s = d.slice(0, 10); // YYYY-MM-DD
  const t = Date.parse(s + "T00:00:00Z"); // treat as UTC date
  return Number.isFinite(t) ? new Date(t) : null;
}

function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/* -------------------------------- Confidence -------------------------------- */

function computeBetSignal({
  hitPct,
  breakEvenPct,
  evPer100,
  nGames,
  ciWidth,
}: {
  hitPct: number; // 0..1
  breakEvenPct: number; // 0..1
  evPer100: number; // dollars
  nGames: number;
  ciWidth: number; // e.g. 0.18 = 18 pts wide
}): {
  score: number;
  label: "Avoid" | "Meh" | "Lean" | "Strong" | "Neutral";
  color: {
    border: string;
    bg: string;
    text: string;
    bar: string;
  };
  note: string;
} {
  if (!Number.isFinite(hitPct) || !Number.isFinite(breakEvenPct) || nGames <= 0) {
    return {
      score: 50,
      label: "Neutral",
      color: {
        border: "border-neutral-300 dark:border-neutral-700",
        bg: "bg-neutral-100 dark:bg-neutral-900",
        text: "text-neutral-700 dark:text-neutral-200",
        bar: "bg-neutral-400",
      },
      note: "Enter a prop line and odds, then fetch games to get a signal.",
    };
  }

  const edgePct = hitPct - breakEvenPct; // positive = advantage
  let score =
    50 +
    Math.max(-30, Math.min(30, edgePct * 600)) + // 5% edge ≈ +30
    Math.max(-30, Math.min(30, evPer100 / 2)); // $60 EV ≈ +30

  if (nGames < 12) score -= 15;
  else if (nGames < 25) score -= 5;

  if (ciWidth > 0.25) score -= 15;
  else if (ciWidth > 0.15) score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: "Avoid" | "Meh" | "Lean" | "Strong";
  if (score >= 75) label = "Strong";
  else if (score >= 60) label = "Lean";
  else if (score >= 40) label = "Meh";
  else label = "Avoid";

  const color =
    label === "Strong"
      ? {
          border: "border-emerald-400/60",
          bg: "bg-emerald-500/10",
          text: "text-emerald-600 dark:text-emerald-400",
          bar: "bg-emerald-500",
        }
      : label === "Lean"
      ? {
          border: "border-amber-400/60",
          bg: "bg-amber-500/10",
          text: "text-amber-600 dark:text-amber-400",
          bar: "bg-amber-500",
        }
      : label === "Meh"
      ? {
          border: "border-neutral-300 dark:border-neutral-600",
          bg: "bg-neutral-200/40 dark:bg-neutral-800/60",
          text: "text-neutral-700 dark:text-neutral-300",
          bar: "bg-neutral-500",
        }
      : {
          border: "border-rose-400/60",
          bg: "bg-rose-500/10",
          text: "text-rose-600 dark:text-rose-400",
          bar: "bg-rose-500",
        };

  const note =
    label === "Strong"
      ? "Green light: your numbers suggest a clear edge."
      : label === "Lean"
      ? "Leaning positive: small edge, consider other factors."
      : label === "Meh"
      ? "Mixed: not much of an edge either way."
      : "Red light: the numbers do not support this bet.";

  return { score, label, color, note };
}

/* ---------------------------------- Page ---------------------------------- */

export default function Home() {
  // Form state
  const [playerText, setPlayerText] = useState("Jayson Tatum");
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [season, setSeason] = useState<number>(2024);
  const [stat, setStat] = useState<StatKey>("Points");
  const [lastX, setLastX] = useState<string>("");
  const [homeAway, setHomeAway] = useState<"Any" | "H" | "A">("Any");
  const [opponent, setOpponent] = useState("Any");
  const [propLine, setPropLine] = useState<string>("20");
  const [americanOdds, setAmericanOdds] = useState<string>("-110");
  const [minMinutes, setMinMinutes] = useState<string>("");
  const [postseason, setPostseason] = useState(false);
  const [includeZero, setIncludeZero] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [recency, setRecency] = useState<number>(0);
  const [restFilter, setRestFilter] = useState<RestFilter>("ALL");

  // Data
  const [games, setGames] = useState<GameRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  // KPI explainer bubble
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  /* -------------------------- ID resolution helpers -------------------------- */
  async function ensurePlayerId(): Promise<number | null> {
    if (playerId) return playerId;
    const q = playerText.trim();
    if (!q) return null;
    try {
      const r = await fetch(`/api/game-logs/players?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const j = await r.json();
      const list: PlayerOption[] = Array.isArray(j?.players) ? j.players : [];
      return list[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  /* -------------------------------- Fetching -------------------------------- */
  async function fetchGameLogs() {
    setErr("");
    setBusy(true);
    setGames([]);
    try {
      const resolvedId = await ensurePlayerId();
      if (!resolvedId) {
        setErr("Player not found");
        return;
      }

      const payload = {
        playerId: resolvedId,
        player: playerText,
        season,
        stat,
        lastX: lastX.trim() ? Number(lastX.trim()) : undefined,
        ha: homeAway === "Any" ? undefined : homeAway,
        opp: opponent === "Any" ? undefined : opponent,
        propLine: propLine.trim() ? Number(propLine.trim()) : undefined,
        minMinutes: minMinutes.trim() ? Number(minMinutes.trim()) : undefined,
        postseason,
        includeZeroMin: includeZero,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await fetch("/api/game-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to fetch game logs (${res.status}): ${t}`);
      }

      const data = await res.json();
      const rows: GameRow[] = Array.isArray(data?.rows) ? data.rows : [];

      const normalized = rows.map((r) => ({
        ...r,
        pts: n(r.pts),
        reb: n(r.reb),
        ast: n(r.ast),
        stl: n(r.stl),
        blk: n(r.blk),
        min: typeof r.min === "string" ? r.min : n(r.min),
        fg3m:
          n((r as any).fg3m) ??
          n((r as any)["3PTM"]) ??
          n((r as any)["3pm"]) ??
          n((r as any).tpm),
      }));

      setGames(normalized);
      setSelectedKpi(null);
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  /* -------------------- Enrich with rest/B2B & apply filter ------------------- */

  const enriched = useMemo<EnrichedGame[]>(() => {
    if (!games.length) return [];
    const sorted = games
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const out: EnrichedGame[] = sorted.map((g, i) => {
      const d = toDateOnly(g.date);
      const prev = i > 0 ? toDateOnly(sorted[i - 1].date) : null;
      const next = i < sorted.length - 1 ? toDateOnly(sorted[i + 1].date) : null;
      const prevGap = daysBetween(d, prev); // how many days between prev and this
      const nextGap = daysBetween(next, d); // how many days between this and next
      const isB2BSecond = prevGap === 1; // played yesterday
      const isB2BEither = prevGap === 1 || nextGap === 1;
      return {
        ...g,
        _prevGapDays: prevGap,
        _nextGapDays: nextGap,
        _isB2BSecond: !!isB2BSecond,
        _isB2BEitherNight: !!isB2BEither,
      };
    });

    return out;
  }, [games]);

  const filteredGames = useMemo<EnrichedGame[]>(() => {
    if (!enriched.length) return [];
    switch (restFilter) {
      case "B2B2":
        return enriched.filter((g) => g._isB2BSecond);
      case "B2B_ANY":
        return enriched.filter((g) => g._isB2BEitherNight);
      case "REST_1":
        // 1-day rest means there was exactly 1 off-day between games => prev gap = 2
        return enriched.filter((g) => g._prevGapDays === 2);
      case "REST_2PLUS":
        return enriched.filter((g) => (g._prevGapDays ?? 0) >= 3);
      case "ALL":
      default:
        return enriched;
    }
  }, [enriched, restFilter]);

  /* ------------------------------- Computations ------------------------------ */

  const series = useMemo(() => filteredGames.map((g) => valueForStat(g, stat)), [filteredGames, stat]);
  const homeSeries = useMemo(
    () => filteredGames.filter((g) => g.ha === "H").map((g) => valueForStat(g, stat)),
    [filteredGames, stat]
  );
  const awaySeries = useMemo(
    () => filteredGames.filter((g) => g.ha === "A").map((g) => valueForStat(g, stat)),
    [filteredGames, stat]
  );

  const prop = propLine.trim() ? parseFloat(propLine) : NaN;
  const seasonAvg = useMemo(() => avg(series), [series]);
  const homeAvg = useMemo(() => avg(homeSeries), [homeSeries]);
  const awayAvg = useMemo(() => avg(awaySeries), [awaySeries]);
  const last3 = useMemo(() => avg(series.slice(-3)), [series]);
  const last5 = useMemo(() => avg(series.slice(-5)), [series]);
  const weighted = useMemo(() => recencyWeightedAvg(series, recency), [series, recency]);

  const distr = useMemo(() => {
    const minV = series.length ? Math.min(...series) : 0;
    const maxV = series.length ? Math.max(...series) : 0;
    const med = median(series);
    return { count: series.length, min: minV, med, max: maxV };
  }, [series]);

  const hits = useMemo(() => {
    if (!Number.isFinite(prop)) return 0;
    return series.filter((v) => v >= (prop as number)).length;
  }, [series, prop]);

  const hitPct = series.length ? hits / series.length : 0;

  const american = useMemo(() => parseFloat(americanOdds), [americanOdds]);
  const decOdds = americanToDecimal(american ?? NaN);
  const breakEvenPct = decOdds ? 1 / decOdds : 0;

  const profitWin100 = profitIfWinPer100(american ?? NaN);
  const evPer100 = hitPct * profitWin100 - (1 - hitPct) * 100;

  const [ciLo, ciHi] = wilsonCI(hits, series.length);
  const ciWidth = Math.max(0, ciHi - ciLo);
  const sampleWarn = series.length > 0 && series.length < 12;

  const betSignal = computeBetSignal({
    hitPct,
    breakEvenPct,
    evPer100,
    nGames: series.length,
    ciWidth,
  });

  /* ----------------------------- Simple explainers ----------------------------- */

  const explain: Record<string, string> = {
    "SEASON AVG":
      "How many the player usually gets per game with your filters. Good quick baseline.",
    "HOME AVG":
      "What the player averages at home. Helpful if splits matter for this player.",
    "AWAY AVG":
      "What the player averages on the road. Compare to home to spot splits.",
    "WEIGHTED AVG":
      "Like the season average, but it leans more on recent games if you move the slider right.",
    "LAST 3 AVG":
      "What the player has done in the most recent three games.",
    "LAST 5 AVG":
      "What the player has done in the most recent five games.",
    "HIT RATE":
      "Out of these games, how often the player met or beat your prop line.",
    "GAMES / DISTRIB":
      "How many games you’re using plus a quick feel for the range (min/median/max).",
    "HIT %":
      "Same as Hit Rate — the percent of games at or above your line.",
    "BREAK-EVEN %":
      "The win rate you need at these odds just to break even long-term.",
    "PROFIT IF WIN ($100)":
      "What you’d profit on a $100 bet if it hits (not counting your stake).",
    "EV / $100":
      "On average, how much you’d expect to win or lose per $100 bet if these numbers hold.",
    "BET SIGNAL":
      "One-glance read on value: it weighs your edge, EV, sample size, and uncertainty.",
  };

  /* ----------------------------------- UI ----------------------------------- */

  const chip = (key: RestFilter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setRestFilter(key)}
      className={[
        "rounded-full px-3 py-1 text-sm transition border",
        restFilter === key
          ? "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-400 dark:bg-amber-400/15 dark:text-amber-300"
          : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300 dark:hover:bg-amber-400/20",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-200/40 bg-white/70 backdrop-blur dark:border-neutral-700/60 dark:bg-neutral-900/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 font-semibold text-white">JS</div>
            <div>
              <div className="font-semibold">JuicedStats</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">NBA Prop Research</div>
            </div>
          </div>
          <nav className="text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">Matches: {series.length}</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        {/* Chips */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chip("ALL", "All games")}
          {chip("B2B2", "B2B (2nd night)")}
          {chip("B2B_ANY", "B2B (either night)")}
          {chip("REST_1", "1-day rest")}
          {chip("REST_2PLUS", "2+ days rest")}
          <span className="ml-auto text-sm text-neutral-500 dark:text-neutral-400">
            Matches: {series.length}
          </span>
        </div>

        {/* Form */}
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="col-span-1">
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Player</label>
            <PlayerSearchBox
              value={playerText}
              onChange={(v) => {
                setPlayerText(v);
                setPlayerId(null);
              }}
              onPick={(p) => {
                setPlayerText(p.name);
                setPlayerId(p.id);
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Season (YYYY)</label>
            <input
              type="number"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value || 0))}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Stat</label>
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={stat}
              onChange={(e) => setStat(e.target.value as StatKey)}
            >
              {(["Points", "Rebounds", "Assists", "3PTM", "PRA", "PR", "PA", "RA", "Stocks"] as StatKey[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Last X Games (blank = all)</label>
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              value={lastX}
              onChange={(e) => setLastX(e.target.value)}
              placeholder="e.g., 10"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Prop Line</label>
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              value={propLine}
              onChange={(e) => setPropLine(e.target.value)}
              placeholder="e.g., 26.5"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Odds (American)</label>
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              value={americanOdds}
              onChange={(e) => setAmericanOdds(e.target.value)}
              placeholder="-110"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Min Minutes</label>
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
              placeholder="e.g., 24"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Home/Away</label>
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={homeAway}
              onChange={(e) => setHomeAway(e.target.value as any)}
            >
              <option>Any</option>
              <option value="H">H</option>
              <option value="A">A</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Opponent</label>
            <select
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            >
              <option>Any</option>
              {[
                "ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW","HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WAS",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Start Date</label>
            <input
              type="date"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">End Date</label>
            <input
              type="date"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={fetchGameLogs}
            disabled={busy}
            className="rounded-md bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? "Fetching…" : "Fetch Game Logs"}
          </button>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Games: {series.length} • Stat: {stat}
          </div>
          {err && (
            <span className="rounded-md bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-400/15 dark:text-red-300">
              {err}
            </span>
          )}
        </div>

        {/* Affiliates */}
        <AffiliateBanner />

        {/* KPI grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <KpiCard title="SEASON AVG" value={seasonAvg} line={propLine} onClick={() => setSelectedKpi("SEASON AVG")} />
          <KpiCard title="HOME AVG" value={homeAvg} line={propLine} onClick={() => setSelectedKpi("HOME AVG")} />
          <KpiCard title="AWAY AVG" value={awayAvg} line={propLine} onClick={() => setSelectedKpi("AWAY AVG")} />
          <KpiCard title="WEIGHTED AVG" value={weighted} line={propLine} onClick={() => setSelectedKpi("WEIGHTED AVG")} />

          <KpiCard title="LAST 3 AVG" value={last3} line={propLine} onClick={() => setSelectedKpi("LAST 3 AVG")} />
          <KpiCard title="LAST 5 AVG" value={last5} line={propLine} onClick={() => setSelectedKpi("LAST 5 AVG")} />
          <KpiCard
            title="HIT RATE"
            value={hitPct * 100}
            suffix="%"
            line={Number.isFinite(prop) ? String(prop) : undefined}
            onClick={() => setSelectedKpi("HIT RATE")}
          />
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">GAMES / DISTRIB</div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="text-neutral-500 dark:text-neutral-400">Games:</div>
              <div className="tabular-nums">{distr.count}</div>
              <div className="text-neutral-500 dark:text-neutral-400">Min:</div>
              <div className="tabular-nums">{distr.min.toFixed(1)}</div>
              <div className="text-neutral-500 dark:text-neutral-400">Med:</div>
              <div className="tabular-nums">{distr.med.toFixed(1)}</div>
              <div className="text-neutral-500 dark:text-neutral-400">Max:</div>
              <div className="tabular-nums">{distr.max.toFixed(1)}</div>
            </div>
          </div>

          <KpiCard title="HIT %" value={hitPct * 100} suffix="%" onClick={() => setSelectedKpi("HIT %")} />
          <KpiCard title="BREAK-EVEN %" value={breakEvenPct * 100} suffix="%" onClick={() => setSelectedKpi("BREAK-EVEN %")} />
          <KpiCard title="PROFIT IF WIN ($100)" value={profitWin100} prefix="$" onClick={() => setSelectedKpi("PROFIT IF WIN ($100)")} />
          <KpiCard title="EV / $100" value={evPer100} prefix="$" highlightZero onClick={() => setSelectedKpi("EV / $100")} />

          {/* Bet Signal card */}
          <BetSignalCard
            score={betSignal.score}
            label={betSignal.label}
            note={betSignal.note}
            color={betSignal.color}
            onClick={() => setSelectedKpi("BET SIGNAL")}
          />
        </div>

        {/* Explainer bubble */}
        {selectedKpi && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900">
            <div className="mb-1 font-medium">{selectedKpi}</div>
            <div className="text-neutral-700 dark:text-neutral-300">{explain[selectedKpi] || ""}</div>

            {/* Confidence and context */}
            <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
              {selectedKpi === "BET SIGNAL" ? (
                <>
                  <span className="font-medium">{betSignal.label}</span> — score {betSignal.score}/100.{" "}
                  {betSignal.note}{" "}
                  {series.length > 0 && (
                    <>
                      • Sample: {series.length} games. 95% CI for Hit%: {(ciLo * 100).toFixed(1)}%–{(ciHi * 100).toFixed(1)}%.
                    </>
                  )}
                </>
              ) : (
                <>
                  {series.length > 0 && (
                    <>
                      95% CI for Hit%: {(ciLo * 100).toFixed(1)}%–{(ciHi * 100).toFixed(1)}% • Sample size: {series.length}
                    </>
                  )}
                  {sampleWarn && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                      Fewer than 12 games — treat carefully.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              <tr>
                {[
                  "Date","Opp","H/A","Min","Pts","Reb","Ast","3PTM","Blk","Stl","TO","PRA","PR","PA","RA","Stocks",
                ].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((g, i) => {
                const P = n(g.pts), R = n(g.reb), A = n(g.ast);
                const threes =
                  n((g as any).fg3m) ??
                  n((g as any)["3PTM"]) ??
                  n((g as any)["3pm"]) ??
                  n((g as any).tpm);
                return (
                  <tr key={`${g.date}-${g.opp}-${i}`} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-neutral-900 dark:even:bg-neutral-900/60">
                    <td className="px-3 py-2">
                      {g.date?.slice(0, 10) ?? ""}
                      {/* tiny badge to visualize B2B / rest */}
                      {g._isB2BSecond && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900 dark:bg-amber-400/15 dark:text-amber-300">
                          B2B2
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{g.opp ?? ""}</td>
                    <td className="px-3 py-2">{g.ha ?? ""}</td>
                    <td className="px-3 py-2">{typeof g.min === "string" ? g.min : n(g.min)}</td>
                    <td className="px-3 py-2">{P}</td>
                    <td className="px-3 py-2">{R}</td>
                    <td className="px-3 py-2">{A}</td>
                    <td className="px-3 py-2">{threes}</td>
                    <td className="px-3 py-2">{n(g.blk)}</td>
                    <td className="px-3 py-2">{n(g.stl)}</td>
                    <td className="px-3 py-2">{n((g as any).tov ?? (g as any).turnover)}</td>
                    <td className="px-3 py-2">{P + R + A}</td>
                    <td className="px-3 py-2">{P + R}</td>
                    <td className="px-3 py-2">{P + A}</td>
                    <td className="px-3 py-2">{R + A}</td>
                    <td className="px-3 py-2">{n(g.stl) + n(g.blk)}</td>
                  </tr>
                );
              })}
              {!filteredGames.length && (
                <tr>
                  <td className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400" colSpan={16}>
                    No games match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

/* -------------------------------- Components -------------------------------- */

function KpiCard({
  title,
  value,
  line,
  suffix,
  prefix,
  highlightZero,
  onClick,
}: {
  title: string;
  value: number;
  line?: string;
  suffix?: string;
  prefix?: string;
  highlightZero?: boolean;
  onClick?: () => void;
}) {
  const prop = line ? parseFloat(line) : undefined;
  const display = `${prefix ?? ""}${Number.isFinite(value) ? value.toFixed(2) : "0.00"}${suffix ?? ""}`;
  const diff =
    Number.isFinite(prop) && Number.isFinite(value)
      ? `${value - (prop as number) >= 0 ? "+" : ""}${(value - (prop as number)).toFixed(2)} vs ${prop}`
      : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left rounded-xl border p-4 transition",
        "border-neutral-200 bg-white hover:border-amber-300 hover:shadow-sm",
        "dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-amber-400/50",
      ].join(" ")}
    >
      <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
      <div
        className={[
          "mt-2 text-3xl font-semibold tabular-nums",
          highlightZero && Math.abs(value) < 1e-6 ? "text-neutral-400 dark:text-neutral-500" : "",
        ].join(" ")}
      >
        {display}
      </div>
      {diff && <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{diff}</div>}
      <div className="mt-3 h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className="h-1 w-2/3 rounded-full bg-amber-500" />
      </div>
    </button>
  );
}

function BetSignalCard({
  score,
  label,
  note,
  color,
  onClick,
}: {
  score: number;
  label: string;
  note: string;
  color: { border: string; bg: string; text: string; bar: string };
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-left rounded-xl border p-4 transition",
        color.border,
        color.bg,
        "hover:shadow-sm",
      ].join(" ")}
    >
      <div className={`text-xs tracking-wide ${color.text}`}>BET SIGNAL</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${color.text}`}>
        {score} / 100
      </div>
      <div className={`mt-1 text-xs ${color.text}`}>{label}</div>
      <div className="mt-3 h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className={`h-1 rounded-full ${color.bar}`}
          style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">{note}</div>
    </button>
  );
}
