"use client";

import { useCallback, useMemo, useState } from "react";
import PlayerSearchBox from "@/components/PlayerSearchBox";
import SaveViewButton from "@/components/SaveViewButton";

/* ================= Utilities ================= */

const TEAM_ID_TO_ABBR: Record<number, string> = {
  1: "ATL", 2: "BOS", 3: "BKN", 4: "CHA", 5: "CHI", 6: "CLE", 7: "DAL", 8: "DEN",
  9: "DET", 10: "GSW", 11: "HOU", 12: "IND", 13: "LAC", 14: "LAL", 15: "MEM",
  16: "MIA", 17: "MIL", 18: "MIN", 19: "NOP", 20: "NYK", 21: "OKC", 22: "ORL",
  23: "PHI", 24: "PHX", 25: "POR", 26: "SAC", 27: "SAS", 28: "TOR", 29: "UTA",
  30: "WAS",
};

function breakevenProb(american: number): number {
  if (!isFinite(american) || american === 0) return NaN;
  return american > 0 ? 100 / (american + 100) : Math.abs(american) / (Math.abs(american) + 100);
}
function profitPer100(american: number): number {
  if (!isFinite(american) || american === 0) return 0;
  return american > 0 ? american : 100 * (100 / Math.abs(american));
}
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function fmtPct(x: number | null | undefined, digits = 0) {
  if (x == null || !isFinite(x)) return "—";
  return `${(100 * x).toFixed(digits)}%`;
}
function mean(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function wilsonUpperLower(pHat: number, n: number, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0 };
  const denom = 1 + (z ** 2) / n;
  const center = (pHat + (z ** 2) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((pHat * (1 - pHat)) / n + (z ** 2) / (4 * n ** 2))) / denom;
  return { lo: Math.max(0, center - margin), hi: Math.min(1, center + margin) };
}
function normalCDF(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-(x * x) / 2);
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - d * poly;
  return x >= 0 ? p : 1 - p;
}

/* ================= Stat mapping ================= */

type StatKey =
  | "pts" | "reb" | "ast" | "stl" | "blk" | "to"
  | "pra" | "pr" | "pa" | "ra" | "stocks";

const STAT_OPTIONS: { key: StatKey; label: string }[] = [
  { key: "pts", label: "Points" },
  { key: "reb", label: "Rebounds" },
  { key: "ast", label: "Assists" },
  { key: "stl", label: "Steals" },
  { key: "blk", label: "Blocks" },
  { key: "to",  label: "Turnovers" },
  { key: "pra", label: "PRA" },
  { key: "pr",  label: "PR"  },
  { key: "pa",  label: "PA"  },
  { key: "ra",  label: "RA"  },
  { key: "stocks", label: "Stocks" },
];

const REST_OPTIONS: { value: "" | "0" | "1" | "2" | "3+"; label: string }[] = [
  { value: "",   label: "Any" },
  { value: "0",  label: "0 days (2nd night of back-to-back)" },
  { value: "1",  label: "1 day rest" },
  { value: "2",  label: "2 days rest" },
  { value: "3+", label: "3+ days rest" },
];

type LogRow = {
  date: string;
  opp?: number | string;
  ha?: "H" | "A" | "";
  min?: number;
  gameId?: number;
  game_id?: number;
  game?: { id?: number };
  teammatePlayed?: boolean;
  teammateMin?: number;
  pts?: number; reb?: number; ast?: number; stl?: number; blk?: number; to?: number; "3ptm"?: number;
};

function computeStat(row: LogRow, stat: StatKey): number {
  const pts = row.pts ?? 0;
  const reb = row.reb ?? 0;
  const ast = row.ast ?? 0;
  const stl = row.stl ?? 0;
  const blk = row.blk ?? 0;
  const tov = row.to  ?? 0;
  switch (stat) {
    case "pts": return pts;
    case "reb": return reb;
    case "ast": return ast;
    case "stl": return stl;
    case "blk": return blk;
    case "to":  return tov;
    case "pra": return pts + reb + ast;
    case "pr":  return pts + reb;
    case "pa":  return pts + ast;
    case "ra":  return reb + ast;
    case "stocks": return stl + blk;
    default: return 0;
  }
}

/* ================= Page ================= */

export default function HomePage() {
  // form state
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");

  // teammate-out filter
  const [teammateQuery, setTeammateQuery] = useState("");
  const [teammateId, setTeammateId] = useState<string | null>(null);
  const [teammateName, setTeammateName] = useState("");
  const [teammateMaxMinutes, setTeammateMaxMinutes] = useState("0");

  const [season, setSeason] = useState("2024-25");
  const seasonNum = Number(season.split("-")[0]) || undefined;

  const [statKey, setStatKey] = useState<StatKey>("pts");
  const [lastX, setLastX] = useState("");
  const [minMinutes, setMinMinutes] = useState("");
  const [homeAway, setHomeAway] = useState<"" | "H" | "A">("");
  const [opp, setOpp] = useState("");
  const [rest, setRest] = useState<"" | "0" | "1" | "2" | "3+">("");

  const [propLine, setPropLine] = useState("");
  const [odds, setOdds] = useState("");

  // data state
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPlayerSelect = (p: { id: string | number; full_name?: string; name?: string } | null) => {
    if (!p) {
      setPlayerId(null);
      setPlayerName("");
      return;
    }
    const nm = p.full_name || p.name || "";
    setPlayerId(String(p.id));
    setPlayerName(nm);
    setPlayerQuery(nm);
  };

  const onTeammateSelect = (p: { id: string | number; full_name?: string; name?: string } | null) => {
    if (!p) {
      setTeammateId(null);
      setTeammateName("");
      setTeammateQuery("");
      return;
    }
    const nm = p.full_name || p.name || "";
    setTeammateId(String(p.id));
    setTeammateName(nm);
    setTeammateQuery(nm);
  };

  const toISODate = (s: string) => (s || "").slice(0, 10);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setLogs([]);

      if (!playerId || !seasonNum) {
        setError("Choose a player and season.");
        setLoading(false);
        return;
      }

      const url = new URL("/api/game-logs", window.location.origin);
      url.searchParams.set("playerId", playerId);
      url.searchParams.set("season", String(seasonNum));
      url.searchParams.set("stat", statKey);
      if (lastX.trim() !== "") url.searchParams.set("lastX", String(Number(lastX)));
      if (minMinutes.trim() !== "") url.searchParams.set("min", String(Number(minMinutes)));
      if (homeAway) url.searchParams.set("ha", homeAway);
      if (opp.trim() !== "") url.searchParams.set("opp", opp.trim().toUpperCase());
      if (rest) url.searchParams.set("rest", rest);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setError(j?.error || "Could not fetch logs.");
        setLoading(false);
        return;
      }
      let rows: LogRow[] = Array.isArray(j.logs) ? j.logs : [];

      if (teammateId) {
        try {
          const r = await fetch("/api/game-logs/teammate-out", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: Number(playerId),
              teammateId: Number(teammateId),
              season: seasonNum,
              maxMinutes: Number(teammateMaxMinutes) || 0,
            }),
          });

          if (!r.ok) {
            const txt = await r.text().catch(() => "");
            throw new Error(txt || "Teammate filter endpoint error");
          }

          const data = await r.json();

          const outIds = new Set<number>(
            Array.isArray(data.outGameIds) ? data.outGameIds.map((x: any) => Number(x)).filter(Number.isFinite) : []
          );
          let outDates = new Set<string>(
            Array.isArray(data.outDates) ? data.outDates.map((d: any) => String(d).slice(0, 10)) : []
          );

          // Map IDs -> dates if needed
          if (!outDates.size && outIds.size) {
            const BDL_BASE = process.env.NEXT_PUBLIC_BDL_BASE || "https://api.balldontlie.io/v1";
            const KEY = process.env.NEXT_PUBLIC_BDL_KEY || "";
            const AUTH = KEY ? (KEY.startsWith("Bearer ") ? KEY : `Bearer ${KEY}`) : "";
            const headers: HeadersInit = AUTH ? { Authorization: AUTH } : {};

            const ids = Array.from(outIds);
            const chunkSize = 90;
            const mappedDates: string[] = [];

            for (let i = 0; i < ids.length; i += chunkSize) {
              const chunk = ids.slice(i, i + chunkSize);
              const qs = new URLSearchParams();
              qs.append("player_ids[]", String(playerId));
              chunk.forEach((g) => qs.append("game_ids[]", String(g)));
              qs.set("per_page", "100");
              const rr = await fetch(`${BDL_BASE}/stats?${qs.toString()}`, { cache: "no-store", headers });
              if (rr.ok) {
                const jj = await rr.json();
                for (const s of (jj?.data ?? []) as any[]) {
                  const d = toISODate(s?.game?.date || "");
                  if (d) mappedDates.push(d);
                }
              }
            }
            outDates = new Set(mappedDates);
          }

          if (outIds.size || outDates.size) {
            rows = rows.filter((rw) => {
              const gid = (rw.gameId ?? rw.game_id ?? rw.game?.id) as number | undefined;
              if (gid != null && outIds.size) return outIds.has(Number(gid));
              if (outDates.size) return outDates.has(rw.date);
              return true;
            });
          } else {
            rows = rows.filter((rw) => {
              const played = rw.teammatePlayed ?? ((rw.teammateMin ?? 0) > 0);
              return played === false;
            });
          }
        } catch (err: any) {
          setError(`Could not apply teammate filter: ${err?.message || ""}`);
        }
      }

      setLogs(rows);
    } catch (e: any) {
      setError(e?.message || "Could not fetch logs.");
    } finally {
      setLoading(false);
    }
  }, [
    playerId, seasonNum, statKey, lastX, minMinutes, homeAway, opp, rest,
    teammateId, teammateMaxMinutes
  ]);

  const reset = () => {
    setPlayerQuery(""); setPlayerId(null); setPlayerName("");
    setTeammateQuery(""); setTeammateId(null); setTeammateName(""); setTeammateMaxMinutes("0");
    setSeason("2024-25");
    setStatKey("pts");
    setLastX("");
    setMinMinutes("");
    setHomeAway("");
    setOpp("");
    setRest("");
    setPropLine("");
    setOdds("");
    setLogs([]); setError(null);
  };

  /* ================= Derived lists & metrics ================= */

  const cleanLogs = useMemo(() => {
    const rows = (logs || []).filter(r => (r.min ?? 0) > 0);
    rows.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return rows;
  }, [logs]);

  const statSeries = useMemo(
    () => cleanLogs.map(r => computeStat(r, statKey)),
    [cleanLogs, statKey]
  );

  const gamesCount = statSeries.length;
  const seasonAvg = mean(statSeries);
  const homeAvg = mean(cleanLogs.filter(r => r.ha === "H").map(r => computeStat(r, statKey)));
  const awayAvg = mean(cleanLogs.filter(r => r.ha === "A").map(r => computeStat(r, statKey)));
  const weightedAvg = useMemo(() => {
    if (!statSeries.length) return 0;
    const n = statSeries.length;
    const weights = statSeries.map((_, i) => 0.5 + (1.0 * (n - i)) / n);
    const totalW = weights.reduce((a, b) => a + b, 0);
    return statSeries.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW;
  }, [statSeries]);

  const last3Avg = mean(statSeries.slice(0, 3));
  const last5Avg = mean(statSeries.slice(0, 5));
  const minVal = useMemo(() => (statSeries.length ? Math.min(...statSeries) : 0), [statSeries]);
  const maxVal = useMemo(() => (statSeries.length ? Math.max(...statSeries) : 0), [statSeries]);
  const medVal = useMemo(() => median(statSeries), [statSeries]);

  // EV & confidence
  const numericLine = Number(propLine);
  const numericOdds = Number(odds);
  const hasEdgeInputs = isFinite(numericLine) && isFinite(numericOdds) && propLine.trim() !== "" && odds.trim() !== "";

  const hitCount = useMemo(
    () => (hasEdgeInputs ? statSeries.filter(v => v >= numericLine).length : 0),
    [statSeries, numericLine, hasEdgeInputs]
  );
  const hitRate = hasEdgeInputs && gamesCount > 0 ? hitCount / gamesCount : NaN;
  const beProb = hasEdgeInputs ? breakevenProb(numericOdds) : NaN;
  const profit100 = hasEdgeInputs ? profitPer100(numericOdds) : 0;
  const pOver = hitRate;

  const evPer100 = useMemo(() => {
    if (!hasEdgeInputs || !isFinite(pOver)) return NaN;
    return pOver * profit100 - (1 - pOver) * 100;
  }, [pOver, profit100, hasEdgeInputs]);

  const confidencePct = useMemo(() => {
    if (!hasEdgeInputs || !gamesCount) return NaN;
    const pHat = clamp01(pOver);
    const { lo, hi } = wilsonUpperLower(pHat, gamesCount, 1.64);
    const center = (lo + hi) / 2;
    const se = Math.max(1e-6, Math.sqrt(center * (1 - center) / gamesCount));
    const z = (center - beProb) / se;
    const c = normalCDF(z);
    return clamp01(c);
  }, [hasEdgeInputs, gamesCount, pOver, beProb]);

  const confColor =
    !isFinite(confidencePct)
      ? "border-neutral-200 dark:border-neutral-800"
      : confidencePct >= 0.6
      ? "border-emerald-700 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200"
      : confidencePct >= 0.4
      ? "border-amber-700 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
      : "border-red-800 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-200";

  /* ================= CSV export ================= */

  const onExportCSV = () => {
    if (!cleanLogs.length) return;
    const cols = ["Date","Opp","H/A","Min","Pts","Reb","Ast","3PTM","Blk","Stl","TO","PRA","PR","PA","RA","Stocks"];
    const rows = cleanLogs.map(r => {
      const oppAbbr =
        typeof r.opp === "string" ? r.opp :
        typeof r.opp === "number" ? (TEAM_ID_TO_ABBR[r.opp] || String(r.opp)) : "";
      const pts = r.pts ?? 0, reb = r.reb ?? 0, ast = r.ast ?? 0, stl = r.stl ?? 0, blk = r.blk ?? 0, tov = r.to ?? 0;
      return [
        r.date, oppAbbr, r.ha ?? "", r.min ?? 0, pts, reb, ast, r["3ptm"] ?? "-",
        blk, stl, tov, pts+reb+ast, pts+reb, pts+ast, reb+ast, stl+blk,
      ].join(",");
    });
    const csv = [cols.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${playerName || "player"}-${statKey}-${season}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <h1 className="mt-8 text-2xl font-semibold">NBA Prop Research</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Search a player → hit “See Stats” → enter prop line & odds to compute EV & confidence.
      </p>

      {/* FORM */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* Player */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Player</label>
            <PlayerSearchBox value={playerQuery} onChange={setPlayerQuery} onSelect={onPlayerSelect} />
          </div>

          {/* Teammate OUT (optional) */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
              Filter to games when this teammate was OUT (optional)
            </label>
            <PlayerSearchBox value={teammateQuery} onChange={setTeammateQuery} onSelect={onTeammateSelect} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Count as OUT if minutes ≤</span>
              <input
                inputMode="numeric"
                className="w-20 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900
                           dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                value={teammateMaxMinutes}
                onChange={(e) => setTeammateMaxMinutes(e.target.value.replace(/[^0-9]/g, ""))}
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">min</span>
            </div>
            {teammateName ? (
              <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Applying filter for: <span className="font-medium">{teammateName}</span>
              </div>
            ) : null}
          </div>

          {/* Season */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Season</label>
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option value="2024-25">2024-25</option>
              <option value="2023-24">2023-24</option>
              <option value="2022-23">2022-23</option>
            </select>
          </div>

          {/* Stat */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Stat</label>
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={statKey}
              onChange={(e) => setStatKey(e.target.value as StatKey)}
            >
              {STAT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Last X */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Last X Games (blank = all)</label>
            <input
              inputMode="numeric"
              placeholder="All"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         placeholder:text-neutral-400
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              value={lastX}
              onChange={(e) => setLastX(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          {/* Min Minutes */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Min Minutes</label>
            <input
              inputMode="numeric"
              placeholder="e.g., 24"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         placeholder:text-neutral-400
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          {/* H/A */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Home/Away</label>
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={homeAway}
              onChange={(e) => setHomeAway(e.target.value as "" | "H" | "A")}
            >
              <option value="">Any</option>
              <option value="H">Home</option>
              <option value="A">Away</option>
            </select>
          </div>

          {/* Opp */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Opponent (abbr)</label>
            <input
              placeholder="e.g., BOS"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 uppercase
                         placeholder:text-neutral-400
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              value={opp}
              onChange={(e) => setOpp(e.target.value.toUpperCase().slice(0, 3))}
            />
          </div>

          {/* Rest */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Rest</label>
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={rest}
              onChange={(e) => setRest(e.target.value as "" | "0" | "1" | "2" | "3+")}
            >
              {REST_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Prop line */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Prop Line</label>
            <input
              inputMode="decimal"
              placeholder="e.g., 26.5"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         placeholder:text-neutral-400
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              value={propLine}
              onChange={(e) => setPropLine(e.target.value.replace(/[^0-9.\-]/g, ""))}
            />
          </div>

          {/* Odds */}
          <div>
            <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">Odds (American)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[-+]?[0-9]*"
              placeholder='e.g., "-115"'
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900
                         placeholder:text-neutral-400
                         dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              value={odds}
              onChange={(e) => setOdds(e.target.value.replace(/[^0-9+\-]/g, ""))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={!playerId || !seasonNum || loading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800
                       disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {loading ? "Loading…" : "See Stats"}
          </button>

          <button
            onClick={reset}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50
                       dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Reset
          </button>

          <SaveViewButton
            params={{
              playerId,
              playerName,
              season,
              stat: statKey,
              lastX: lastX.trim() === "" ? null : Number(lastX),
              min: minMinutes.trim() === "" ? null : Number(minMinutes),
              ha: homeAway || null,
              opp: opp || null,
              rest: rest || null,
              propLine: propLine.trim() === "" ? null : Number(propLine),
              odds: odds.trim() === "" ? null : Number(odds),
            }}
          />

          <button
            onClick={onExportCSV}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50
                       dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Export CSV
          </button>

          {error ? <span className="ml-2 text-sm text-red-600 dark:text-red-400">{error}</span> : null}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Kpi title="SEASON AVG" value={seasonAvg.toFixed(2)} hint="Average of the chosen stat across the games shown." />
        <Kpi title="HOME AVG" value={homeAvg.toFixed(2)} hint="Average when the player was at home." />
        <Kpi title="AWAY AVG" value={awayAvg.toFixed(2)} hint="Average when the player was away." />
        <Kpi title="WEIGHTED AVG" value={weightedAvg.toFixed(2)} hint="Recent games count a bit more than older games." />
        <Kpi title="LAST 3 AVG" value={last3Avg.toFixed(2)} hint="Average over the most recent 3 games." />
        <Kpi title="LAST 5 AVG" value={last5Avg.toFixed(2)} hint="Average over the most recent 5 games." />
        <Kpi
          title="GAMES / DISTRIB"
          value={String(gamesCount)}
          hint={`Games: ${gamesCount} • Min: ${minVal.toFixed(1)} • Med: ${medVal.toFixed(1)} • Max: ${maxVal.toFixed(1)}`}
        />
        <Kpi
          title="EV / $100"
          value={isFinite(evPer100) ? `$${evPer100.toFixed(2)}` : "—"}
          hint="Expected profit on a $100 stake if you bet the OVER at your odds. Positive = good; negative = long-term loss."
        />
        <Kpi
          title="CONFIDENCE"
          value={isFinite(confidencePct) ? fmtPct(confidencePct, 0) : "—"}
          hint="Probability your estimated edge is actually +EV. Higher is better; based on hit-rate vs. break-even and sample size."
          extraClass={confColor}
        />
      </div>

      {/* TABLE */}
      <div className="mt-8 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-neutral-100 text-neutral-600 dark:bg-neutral-950 dark:text-neutral-400">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="text-left">Date</th>
              <th>Opp</th>
              <th>H/A</th>
              <th>Min</th>
              <th>Pts</th>
              <th>Reb</th>
              <th>Ast</th>
              <th>3PTM</th>
              <th>Blk</th>
              <th>Stl</th>
              <th>TO</th>
              <th>PRA</th>
              <th>PR</th>
              <th>PA</th>
              <th>RA</th>
              <th>Stocks</th>
            </tr>
          </thead>
          <tbody>
            {cleanLogs.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-3 py-8 text-center text-neutral-500">
                  No games loaded yet.
                </td>
              </tr>
            ) : (
              cleanLogs.map((r, i) => {
                const oppAbbr =
                  typeof r.opp === "string" ? r.opp :
                  typeof r.opp === "number" ? (TEAM_ID_TO_ABBR[r.opp] || String(r.opp)) : "";
                const pts = r.pts ?? 0, reb = r.reb ?? 0, ast = r.ast ?? 0, stl = r.stl ?? 0, blk = r.blk ?? 0, tov = r.to ?? 0;
                return (
                  <tr key={`${r.date}-${i}`} className="border-t border-neutral-200 hover:bg-neutral-50 dark:border-neutral-900 dark:hover:bg-neutral-950">
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-300">{r.date}</td>
                    <td className="px-3 py-2 text-center">{oppAbbr}</td>
                    <td className="px-3 py-2 text-center">{r.ha ?? ""}</td>
                    <td className="px-3 py-2 text-center">{r.min ?? 0}</td>
                    <td className="px-3 py-2 text-center">{pts}</td>
                    <td className="px-3 py-2 text-center">{reb}</td>
                    <td className="px-3 py-2 text-center">{ast}</td>
                    <td className="px-3 py-2 text-center">{r["3ptm"] ?? "-"}</td>
                    <td className="px-3 py-2 text-center">{blk}</td>
                    <td className="px-3 py-2 text-center">{stl}</td>
                    <td className="px-3 py-2 text-center">{tov}</td>
                    <td className="px-3 py-2 text-center">{pts + reb + ast}</td>
                    <td className="px-3 py-2 text-center">{pts + reb}</td>
                    <td className="px-3 py-2 text-center">{pts + ast}</td>
                    <td className="px-3 py-2 text-center">{reb + ast}</td>
                    <td className="px-3 py-2 text-center">{stl + blk}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Simple KPI card ================= */

function Kpi({ title, value, hint, extraClass }: { title: string; value: string; hint?: string; extraClass?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${extraClass || "border-neutral-200 dark:border-neutral-800"}`}>
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
      <div className="mt-1 text-3xl font-semibold text-neutral-900 dark:text-neutral-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{hint}</div> : null}
    </div>
  );
}
