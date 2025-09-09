'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SaveViewButton from '@/components/SaveViewButton';

/* ------------------------------ Types ------------------------------ */

type StatKey =
  | 'Points'
  | 'Rebounds'
  | 'Assists'
  | '3PTM'
  | 'PRA'
  | 'PR'
  | 'PA'
  | 'RA'
  | 'Stocks';

type GameRow = {
  date: string; // ISO
  opp?: string;
  ha?: 'H' | 'A';
  min?: number | string;
  pts?: number;
  reb?: number;
  ast?: number;
  fg3m?: number;
  ['3PTM']?: number;
  ['3pm']?: number;
  tpm?: number;
  blk?: number;
  stl?: number;
  tov?: number | null;
  turnover?: number | null;
  team?: string;
  teamScore?: number;
  oppScore?: number;
  result?: 'W' | 'L' | 'T';
};

type PlayerOption = { id: number; name: string; teamTri?: string };

/* --------------------------- Small helpers -------------------------- */

function n(x: any): number {
  const v = typeof x === 'number' ? x : parseFloat(String(x ?? ''));
  return Number.isFinite(v) ? v : 0;
}
function avg(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (let i = 0; i < xs.length; i++) s += xs[i];
  return s / xs.length;
}
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
    n((row as any)['3PTM']) ??
    n((row as any)['3pm']) ??
    n((row as any).tpm);

  switch (stat) {
    case 'Points': return pts;
    case 'Rebounds': return reb;
    case 'Assists': return ast;
    case '3PTM': return threes;
    case 'PRA': return pts + reb + ast;
    case 'PR': return pts + reb;
    case 'PA': return pts + ast;
    case 'RA': return reb + ast;
    case 'Stocks': return stl + blk;
    default: return 0;
  }
}

/* --------------------------- UI blurbs text -------------------------- */

const KPI_BLURBS: Record<string, string> = {
  'SEASON AVG': 'Average of the chosen stat across the games shown.',
  'HOME AVG': 'Average when the player was at home.',
  'AWAY AVG': 'Average when the player was away.',
  'WEIGHTED AVG': 'Recent games count more than older games.',
  'LAST 3 AVG': 'Average over the most recent 3 games.',
  'LAST 5 AVG': 'Average over the most recent 5 games.',
  'HIT RATE': 'How often the player met or beat your Prop Line here.',
  'GAMES / DISTRIB': 'How many games, plus min/median/max to show spread.',
  'BREAK-EVEN %': 'The success rate needed to break even at your odds.',
  'PROFIT IF WIN ($100)': 'Payout on a $100 winning bet (before fees/taxes).',
  'EV / $100': 'Expected profit or loss per $100 bet using Hit% and odds.',
};

/* ------------------------- Confidence helpers ------------------------ */

function americanToWinPayout(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 0;
  return odds > 0 ? odds : (100 / Math.abs(odds)) * 100;
}
function confidenceFromEV(ev100: number, sample: number) {
  const s = Math.max(0, Math.min(sample, 60));
  const loosen = s < 12 ? 12 - s : 0;
  const good = 8 + loosen;
  const ok = 2 + loosen;
  if (ev100 >= good) return { label: 'Good', color: 'bg-emerald-500', text: 'text-emerald-100' };
  if (ev100 >= ok) return { label: 'Okay', color: 'bg-amber-500', text: 'text-amber-100' };
  return { label: 'Risky', color: 'bg-rose-500', text: 'text-rose-100' };
}

/* ----------------------------- Component ----------------------------- */

export default function Home() {
  // Form state
  const [playerText, setPlayerText] = useState(''); // placeholder only
  const [season, setSeason] = useState<number>(new Date().getMonth() >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1); // start year
  const [stat, setStat] = useState<StatKey>('Points');
  const [lastX, setLastX] = useState<string>(''); // blank = all
  const [homeAway, setHomeAway] = useState<'Any' | 'H' | 'A'>('Any');
  const [opponent, setOpponent] = useState('Any');
  const [propLine, setPropLine] = useState<string>(''); // placeholder only
  const [odds, setOdds] = useState<string>('');         // placeholder only
  const [minMinutes, setMinMinutes] = useState<string>('');
  const [postseason, setPostseason] = useState(false);
  const [includeZero, setIncludeZero] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [recency, setRecency] = useState<number>(0);

  // Data
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [showStart, setShowStart] = useState(true);
  const [games, setGames] = useState<GameRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>('');

  const suggestRef = useRef<HTMLDivElement>(null);

  /* ------------------------ Player autocomplete ------------------------ */

  useEffect(() => {
    const q = playerText.trim();
    setSelectedPlayerId(null); // typing resets selection
    if (!q) { setPlayers([]); return; }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/game-logs/players?q=${encodeURIComponent(q)}`, { signal: ctrl.signal, cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();

        // Accept either {players:[{id,name,teamTri}]} or {hits:[{id,full_name,team}]}
        const list: PlayerOption[] = Array.isArray(j?.players)
          ? j.players
          : Array.isArray(j?.hits)
            ? j.hits.map((h: any) => ({ id: h.id, name: h.full_name, teamTri: (h.team || '').slice(0,3) }))
            : [];

        setPlayers(list);
      } catch {}
    }, 200);

    return () => { clearTimeout(t); ctrl.abort(); };
  }, [playerText]);

  function resolvePlayerId(): number | null {
    if (selectedPlayerId) return selectedPlayerId;
    const name = playerText.trim().toLowerCase();
    if (!name || !players.length) return null;
    const exact =
      players.find((p) => p.name.toLowerCase() === name) ??
      players.find((p) => name.includes(p.name.toLowerCase())) ??
      players.find((p) => p.name.toLowerCase().includes(name));
    return exact?.id ?? null;
  }

  /* ----------------------------- Fetch logs ---------------------------- */

  async function fetchGameLogs() {
    setErr('');
    setBusy(true);
    setGames([]);
    try {
      const playerId = resolvePlayerId();
      if (!playerId) {
        setErr('Player not found');
        return;
      }

      const payload = {
        playerId,
        season,
        stat,
        lastX: lastX.trim() ? Number(lastX.trim()) : undefined,
        homeAway: homeAway === 'Any' ? undefined : homeAway,
        opponent: opponent === 'Any' ? undefined : opponent,
        propLine: propLine.trim() ? Number(propLine.trim()) : undefined,
        minMinutes: minMinutes.trim() ? Number(minMinutes.trim()) : undefined,
        postseason,
        includeZeroMin: includeZero,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await fetch('/api/game-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to fetch game logs (${res.status}): ${t}`);
      }

      const data = await res.json();

      // Accept either object rows or array rows (normalize).
      const rawRows = Array.isArray(data?.rows) ? data.rows : [];
      const rows: GameRow[] = rawRows.map((r: any) => {
        if (Array.isArray(r)) {
          // index mapping from server array shape
          const [
            date, opp, ha, minStr, pts, reb, ast, fg3m, blk, stl, turnovers,
            teamPts, oppPts, result, /*gameId*/, teamAbbr,
          ] = r;
          return {
            date: String(date),
            opp: opp,
            ha: ha,
            min: minStr,
            pts: n(pts),
            reb: n(reb),
            ast: n(ast),
            fg3m: n(fg3m),
            blk: n(blk),
            stl: n(stl),
            tov: n(turnovers),
            team: teamAbbr,
            teamScore: n(teamPts),
            oppScore: n(oppPts),
            result: result,
          } as GameRow;
        }
        // object shape passthrough + defensive numeric mapping
        return {
          ...r,
          pts: n(r.pts),
          reb: n(r.reb),
          ast: n(r.ast),
          stl: n(r.stl),
          blk: n(r.blk),
          min: typeof r.min === 'string' ? r.min : n(r.min),
          fg3m:
            n((r as any).fg3m) ??
            n((r as any)['3PTM']) ??
            n((r as any)['3pm']) ??
            n((r as any).tpm),
        } as GameRow;
      });

      setGames(rows);
      setShowStart(false);
    } catch (e: any) {
      setErr(e?.message || 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  /* ----------------------------- KPIs/EV ------------------------------ */

  const series = useMemo(() => games.map((g) => valueForStat(g, stat)), [games, stat]);
  const kpis = useMemo(() => {
    if (!series.length) {
      return {
        seasonAvg: 0, homeAvg: 0, awayAvg: 0,
        last3: 0, last5: 0, weighted: 0,
        gamesCount: 0, min: 0, med: 0, max: 0
      };
    }
    const seasonAvg = avg(series);
    const last3 = avg(series.slice(-3));
    const last5 = avg(series.slice(-5));
    const weighted = recencyWeightedAvg(series, recency);

    const homeVals = games.filter(g => g.ha === 'H').map(g => valueForStat(g, stat));
    const awayVals = games.filter(g => g.ha === 'A').map(g => valueForStat(g, stat));
    const homeAvg = avg(homeVals);
    const awayAvg = avg(awayVals);

    const sorted = [...series].sort((a,b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length/2)] : 0;

    return {
      seasonAvg, homeAvg, awayAvg, last3, last5, weighted,
      gamesCount: series.length,
      min: sorted[0] ?? 0,
      med, max: sorted[sorted.length - 1] ?? 0
    };
  }, [series, games, stat, recency]);

  // Hit rate (needs prop line)
  const propNum = propLine.trim() ? Number(propLine.trim()) : NaN;
  const hitRate = useMemo(() => {
    if (!series.length || !Number.isFinite(propNum)) return 0;
    const hits = series.filter(v => v >= propNum).length;
    return (hits / series.length) * 100;
  }, [series, propNum]);

  // EV math
  const oddsNum = Number(odds.trim() || NaN);
  const breakEvenPct = Number.isFinite(oddsNum)
    ? (oddsNum > 0 ? 100 / (oddsNum + 100) : Math.abs(oddsNum) / (Math.abs(oddsNum) + 100)) * 100
    : 0;
  const winPayout = Number.isFinite(oddsNum) ? americanToWinPayout(oddsNum) : 0;
  const ev100 = (hitRate / 100) * winPayout - (1 - hitRate / 100) * 100;
  const confidence = confidenceFromEV(ev100, games.length);

  /* --------------------------- UI components -------------------------- */

  const defaultViewName = [
    playerText || 'Player',
    stat,
    propLine ? `@ ${propLine}` : '',
    season,
    homeAway !== 'Any' ? homeAway : '',
    opponent !== 'Any' ? opponent : '',
    lastX ? `L${lastX}` : '',
  ].filter(Boolean).join(' • ');

  const viewParams = {
    playerText, playerId: resolvePlayerId(), stat, season, propLine, odds,
    lastX, homeAway, opponent, minMinutes, postseason, includeZero,
    startDate, endDate, recency
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-6">
      {/* Getting started helper */}
      {showStart && !games.length && (
        <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">New here? Start with a sample.</div>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-neutral-700 dark:text-neutral-300">
                <li><span className="font-medium">Type a player’s name</span> and pick from the list.</li>
                <li>Choose a <span className="font-medium">season</span> and <span className="font-medium">stat</span>.</li>
                <li>Click <span className="font-medium">Fetch Game Logs</span> to see the KPIs.</li>
              </ol>
              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Tip: Season uses the start year (e.g., <b>2024</b> = 2024–25). Prop Line and Odds power Hit% and EV.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => {
                  setPlayerText('Jayson Tatum');
                  setSeason(season); // leave as computed default
                  setStat('Points');
                  setPropLine('22.5');
                  setOdds('-110');
                  setShowStart(false);
                }}
                className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Load sample (Tatum / Points)
              </button>
              <button
                onClick={() => setShowStart(false)}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="col-span-1">
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Player (start typing)</label>
          <div className="relative">
            <input
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
              value={playerText}
              onChange={(e) => setPlayerText(e.target.value)}
              placeholder="Jayson Tatum"
              autoComplete="off"
            />
            {/* Suggestions */}
            {players.length > 0 && playerText.trim() && (
              <div
                ref={suggestRef}
                className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
              >
                {players.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPlayerText(p.name); setSelectedPlayerId(p.id); setPlayers([]); }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <span>{p.name}</span>
                    {p.teamTri && <span className="text-xs text-neutral-500">{p.teamTri}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Season (YYYY)</label>
          <input
            type="number"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value || 0))}
          />
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">e.g., 2024 = 2024–25</div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Stat</label>
          <select
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            value={stat}
            onChange={(e) => setStat(e.target.value as StatKey)}
          >
            {(['Points', 'Rebounds', 'Assists', '3PTM', 'PRA', 'PR', 'PA', 'RA', 'Stocks'] as StatKey[]).map(
              (s) => <option key={s} value={s}>{s}</option>
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Last X Games (blank = all)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            value={lastX}
            onChange={(e) => setLastX(e.target.value)}
            placeholder="10"
          />
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Leave blank to use all games.</div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Prop Line</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            value={propLine}
            onChange={(e) => setPropLine(e.target.value)}
            placeholder="22.5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Odds (American)</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            placeholder="-110"
          />
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Used for Break-even% and EV.</div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">Min Minutes</label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
            value={minMinutes}
            onChange={(e) => setMinMinutes(e.target.value)}
            placeholder="24"
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
              'ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS',
            ].map((t) => (
              <option key={t} value={t}>{t}</option>
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

        <div className="col-span-1 flex items-end gap-4 md:col-span-3">
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={postseason} onChange={(e) => setPostseason(e.target.checked)} />
            Postseason
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)} />
            Include 0-min games
          </label>
          <div className="ml-auto flex-1">
            <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
              Recency weight <span className="font-medium">{recency}%</span>{' '}
              <span className="opacity-75">= equal, higher = newer count more</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={recency}
              onChange={(e) => setRecency(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={fetchGameLogs}
          disabled={busy || !resolvePlayerId()}
          className="rounded-md bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-60"
          title={!resolvePlayerId() ? 'Type a player and select from the list' : 'Fetch game logs'}
        >
          {busy ? 'Fetching…' : 'Fetch Game Logs'}
        </button>

        <SaveViewButton defaultName={defaultViewName} params={viewParams} />

        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Games: {games.length} • Stat: {stat}
        </div>
        {err && (
          <span className="rounded-md bg-red-100 px-2 py-1 text-sm text-red-700 dark:bg-red-400/15 dark:text-red-300">
            {err}
          </span>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard title="SEASON AVG" value={kpis.seasonAvg} line={propLine} blurb={KPI_BLURBS['SEASON AVG']} />
        <KpiCard title="HOME AVG" value={kpis.homeAvg} line={propLine} blurb={KPI_BLURBS['HOME AVG']} />
        <KpiCard title="AWAY AVG" value={kpis.awayAvg} line={propLine} blurb={KPI_BLURBS['AWAY AVG']} />
        <ConfidenceCard label={confidence.label} color={confidence.color} text={confidence.text} />

        <KpiCard title="WEIGHTED AVG" value={kpis.weighted} line={propLine} blurb={KPI_BLURBS['WEIGHTED AVG']} />
        <KpiCard title="LAST 3 AVG" value={kpis.last3} line={propLine} blurb={KPI_BLURBS['LAST 3 AVG']} />
        <KpiCard title="LAST 5 AVG" value={kpis.last5} line={propLine} blurb={KPI_BLURBS['LAST 5 AVG']} />
        <KpiCard
          title="GAMES / DISTRIB"
          value={kpis.gamesCount}
          blurb={KPI_BLURBS['GAMES / DISTRIB']}
          foot={`Games: ${kpis.gamesCount}\nMin: ${kpis.min.toFixed(1)}  Med: ${kpis.med.toFixed(1)}  Max: ${kpis.max.toFixed(1)}`}
          pureCount
        />

        <KpiCard title="HIT RATE" value={hitRate} pct line={propLine} blurb={KPI_BLURBS['HIT RATE']} />
        <KpiCard title="BREAK-EVEN %" value={breakEvenPct} pct blurb={KPI_BLURBS['BREAK-EVEN %']} />
        <KpiCard title="PROFIT IF WIN ($100)" value={americanToWinPayout(Number(odds || NaN))} money blurb={KPI_BLURBS['PROFIT IF WIN ($100)']} />
        <KpiCard title="EV / $100" value={ev100} money blurb={KPI_BLURBS['EV / $100']} highlightEV />
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <tr>
              {[
                'Date', 'Opp', 'H/A', 'Min', 'Pts', 'Reb', 'Ast', '3PTM',
                'Blk', 'Stl', 'TO', 'PRA', 'PR', 'PA', 'RA', 'Stocks',
              ].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const threes =
                n((g as any).fg3m) ??
                n((g as any)['3PTM']) ??
                n((g as any)['3pm']) ??
                n((g as any).tpm);
              const P = n(g.pts), R = n(g.reb), A = n(g.ast);
              return (
                <tr key={`${g.date}-${g.opp}-${g.team}-${P}-${R}-${A}`} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-neutral-900 dark:even:bg-neutral-900/60">
                  <td className="px-3 py-2">{g.date?.slice(0, 10) ?? ''}</td>
                  <td className="px-3 py-2">{g.opp ?? ''}</td>
                  <td className="px-3 py-2">{g.ha ?? ''}</td>
                  <td className="px-3 py-2">{typeof g.min === 'string' ? g.min : n(g.min)}</td>
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

            {!games.length && (
              <tr>
                <td className="px-3 py-6 text-center text-neutral-500 dark:text-neutral-400" colSpan={16}>
                  No games loaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ------------------------------- Cards ------------------------------- */

function KpiCard({
  title,
  value,
  line,
  blurb,
  pct = false,
  money = false,
  highlightEV = false,
  pureCount = false,
  foot,
}: {
  title: string;
  value: number;
  line?: string;
  blurb?: string;
  pct?: boolean;
  money?: boolean;
  highlightEV?: boolean;
  pureCount?: boolean;
  foot?: string;
}) {
  const prop = line ? parseFloat(line) : undefined;
  const display = pureCount
    ? String(value)
    : pct
      ? `${value.toFixed(1)}%`
      : money
        ? (value >= 0 ? `$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`)
        : value.toFixed(2);

  const diff = Number.isFinite(prop) && !pureCount ? (value - (prop as number)) : null;

  const barStyle = highlightEV
    ? value >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
    : 'bg-amber-500';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">{title}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{display}</div>

      {diff !== null && (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {(diff >= 0 ? '+' : '') + (diff).toFixed(2)} vs {prop}
        </div>
      )}

      {blurb && (
        <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{blurb}</div>
      )}

      <div className="mt-3 h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div className={`h-1 w-2/3 rounded-full ${barStyle}`} />
      </div>

      {foot && (
        <div className="mt-2 whitespace-pre-line text-xs text-neutral-500 dark:text-neutral-400">{foot}</div>
      )}
    </div>
  );
}

function ConfidenceCard({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400">CONFIDENCE</div>
      <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 ${color} ${text}`}>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        Based on EV per $100 and sample size. Larger samples tighten confidence.
      </div>
    </div>
  );
}
