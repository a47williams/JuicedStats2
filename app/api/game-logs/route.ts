// ✅ add at top of the file
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

// Optional: allow header if you have a BallDontLie key
const BDL_KEY = process.env.BDL_API_KEY || "";

type Row = {
  date: string;            // yyyy-mm-dd
  opp: number | string;    // opponent team id (client renders abbr)
  ha: "H" | "A";
  min: number;
  pts: number;
  reb: number;
  ast: number;
  blk: number;
  stl: number;
  to: number;              // turnovers
  ["3ptm"]?: number;

  // server-computed combos
  pra?: number;
  pr?: number;
  pa?: number;
  ra?: number;
  stocks?: number;
};

type BDLStat = {
  id: number;
  game: {
    id: number;
    date: string; // ISO
    season: number;
    home_team_id: number;
    visitor_team_id: number;
  };
  team: { id: number };
  min: string | null; // "34:12" or null
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover?: number; // singular in v1
  fg3m?: number;
};

const OPP_ABBR_TO_ID: Record<string, number> = {
  ATL: 1, BOS: 2, BKN: 3, CHA: 4, CHI: 5, CLE: 6,
  DAL: 7, DEN: 8, DET: 9, GSW: 10, HOU: 11, IND: 12,
  LAC: 13, LAL: 14, MEM: 15, MIA: 16, MIL: 17, MIN: 18,
  NOP: 19, NYK: 20, OKC: 21, ORL: 22, PHI: 23, PHX: 24,
  POR: 25, SAC: 26, SAS: 27, TOR: 28, UTA: 29, WAS: 30,
};

function parseSeasonNum(seasonParam: string | null): number | null {
  if (!seasonParam) return null;
  // "2024-25" -> 2024
  const n = Number(seasonParam.split("-")[0]);
  return Number.isFinite(n) ? n : null;
}

function parseMinutes(min: string | null | undefined): number {
  if (!min) return 0;
  const [m, s] = min.split(":").map((x) => Number(x));
  if (!Number.isFinite(m)) return 0;
  return m + (Number.isFinite(s) ? s / 60 : 0);
}

function computeCombos(r: Row): Row {
  const pra = (r.pts ?? 0) + (r.reb ?? 0) + (r.ast ?? 0);
  const pr = (r.pts ?? 0) + (r.reb ?? 0);
  const pa = (r.pts ?? 0) + (r.ast ?? 0);
  const ra = (r.reb ?? 0) + (r.ast ?? 0);
  const stocks = (r.stl ?? 0) + (r.blk ?? 0);
  return { ...r, pra, pr, pa, ra, stocks };
}

async function fetchAllStats(playerId: string, seasonNum: number) {
  const perPage = 100;
  let page = 1;
  const out: BDLStat[] = [];

  while (true) {
    const url = new URL("https://api.balldontlie.io/v1/stats");
    url.searchParams.set("player_ids[]", playerId);
    url.searchParams.set("seasons[]", String(seasonNum));
    url.searchParams.set("postseason", "false");
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: BDL_KEY ? { Authorization: `Bearer ${BDL_KEY}` } : {},
      // we want fresh data during dev
      cache: "no-store",
    });

    if (res.status === 401) {
      throw new Error("BDL 401: Unauthorized");
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`BDL ${res.status}: ${t}`);
    }

    const j = await res.json();
    const data = Array.isArray(j?.data) ? (j.data as BDLStat[]) : [];
    out.push(...data);

    const meta = j?.meta;
    const totalPages = Number(meta?.total_pages || 1);
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
    page += 1;
  }

  return out;
}

function toRows(stats: BDLStat[]): Row[] {
  // Map BDL payload → rows (newest → oldest; we’ll add rest filtering logic later)
  const rows = stats.map((s) => {
    const isHome = s.game.home_team_id === s.team.id;
    const opp = isHome ? s.game.visitor_team_id : s.game.home_team_id;
    const ha: "H" | "A" = isHome ? "H" : "A";

    const r: Row = {
      date: (s.game.date || "").slice(0, 10),
      opp,
      ha,
      min: parseMinutes(s.min),
      pts: s.pts ?? 0,
      reb: s.reb ?? 0,
      ast: s.ast ?? 0,
      blk: s.blk ?? 0,
      stl: s.stl ?? 0,
      to: (s as any).turnover ?? 0, // **turnover** in BDL v1
      ["3ptm"]: (s as any).fg3m ?? undefined,
    };
    return computeCombos(r);
  });

  // Sort newest → oldest for display; KPIs can reorder as needed
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

function addRestDays(rowsNewestFirst: Row[]) {
  // Compute rest (days since previous game) per chronological order
  const asc = [...rowsNewestFirst].sort((a, b) => a.date.localeCompare(b.date));
  const withRest: (Row & { restDays: number })[] = [];
  let prevDate: Date | null = null;

  for (const r of asc) {
    const d = new Date(r.date + "T00:00:00Z");
    let restDays = prevDate ? Math.round((+d - +prevDate) / (1000 * 60 * 60 * 24)) : NaN;
    if (!Number.isFinite(restDays) || restDays < 0) restDays = NaN;
    withRest.push({ ...r, restDays });
    prevDate = d;
  }

  // Back to newest → oldest
  withRest.sort((a, b) => b.date.localeCompare(a.date));
  return withRest;
}

function filterRows(
  rowsNewest: (Row & { restDays?: number })[],
  opts?: {
    lastX?: number | null;
    min?: number | null;
    ha?: "" | "H" | "A";
    opp?: string; // "BOS" or id string
    rest?: "" | "0" | "1" | "2" | "3+";
  }
) {
  const lastX = opts?.lastX ?? null;
  const min = opts?.min ?? 0;
  const ha = opts?.ha ?? "";
  const opp = (opts?.opp || "").toUpperCase();
  const rest = opts?.rest ?? "";

  let filtered = rowsNewest.filter((r) => r.min > 0); // always drop 0-minute games

  if (Number.isFinite(min) && (min as number) > 0) {
    filtered = filtered.filter((r) => r.min >= (min as number));
  }
  if (ha === "H" || ha === "A") {
    filtered = filtered.filter((r) => r.ha === ha);
  }
  if (opp) {
    // allow abbr or numeric id
    const oppId = /^\d+$/.test(opp) ? Number(opp) : OPP_ABBR_TO_ID[opp] ?? null;
    if (oppId) filtered = filtered.filter((r) => Number(r.opp) === oppId);
  }
  if (rest) {
    filtered = filtered.filter((r) => {
      const d = Number((r as any).restDays);
      if (!Number.isFinite(d)) return false; // first game has no prev; drop if rest filter requested
      if (rest === "0") return d === 1; // 2nd night of B2B
      if (rest === "1") return d === 2;
      if (rest === "2") return d === 3;
      // "3+" means 4+ days since previous
      if (rest === "3+") return d >= 4;
      return true;
    });
  }

  if (Number.isFinite(lastX) && lastX && lastX > 0) {
    // keep most recent N
    filtered = filtered.slice(0, lastX);
  }

  return filtered;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") || searchParams.get("id");
    const seasonStr = searchParams.get("season");
    const seasonNum = seasonStr ? Number(seasonStr) : parseSeasonNum(searchParams.get("seasonLabel") || null);

    if (!playerId) {
      return NextResponse.json({ ok: false, error: "Missing playerId" }, { status: 400 });
    }
    if (!Number.isFinite(seasonNum)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid season" }, { status: 400 });
    }

    const statKey = (searchParams.get("stat") || "pts").toLowerCase();
    const lastX = searchParams.get("lastX");
    const min = searchParams.get("min");
    const ha = (searchParams.get("ha") || "") as "" | "H" | "A";
    const opp = searchParams.get("opp") || "";
    const rest = (searchParams.get("rest") || "") as "" | "0" | "1" | "2" | "3+";

    const raw = await fetchAllStats(String(playerId), Number(seasonNum));
    const rowsNewest = toRows(raw);
    const withRest = addRestDays(rowsNewest);

    const filtered = filterRows(withRest, {
      lastX: lastX ? Number(lastX) : null,
      min: min ? Number(min) : 0,
      ha,
      opp,
      rest,
    });

    // Narrow payload to the fields client needs; statKey is used on client for KPIs
    return NextResponse.json({ ok: true, stat: statKey, logs: filtered }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/game-logs GET] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
