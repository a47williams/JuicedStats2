// app/api/game-logs/teammate-out/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE =
  process.env.BDL_BASE ||
  process.env.NEXT_PUBLIC_BDL_BASE ||
  "https://api.balldontlie.io/v1";

// Optional: if you have a BallDontLie API key, set BDL_API_KEY in Vercel env.
const API_KEY =
  process.env.BDL_API_KEY || process.env.NEXT_PUBLIC_BDL_API_KEY || "";

function authHeaders(): HeadersInit {
  const h: Record<string, string> = {};
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

type BdlStat = {
  game?: { id: number; date: string };
  min?: string | null; // "MM:SS" or null
};

// "MM:SS" -> minutes as float
function minutesStrToFloat(min?: string | null): number {
  if (!min) return 0;
  const [mm, ss] = String(min).split(":").map((x) => Number(x));
  if (!isFinite(mm)) return 0;
  return mm + (isFinite(ss) ? ss / 60 : 0);
}

async function fetchAllStats(qs: URLSearchParams) {
  // Paginates /stats for given query
  const out: BdlStat[] = [];
  let page = 1;
  // Guard Rails: hard cap pages to avoid abuse
  const MAX_PAGES = 50;

  while (page <= MAX_PAGES) {
    qs.set("page", String(page));
    const url = `${API_BASE}/stats?${qs.toString()}`;

    const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`BDL ${res.status} for ${url}${txt ? ` — ${txt}` : ""}`);
    }

    const j = await res.json();
    const data: BdlStat[] = j?.data ?? [];
    out.push(...data);

    const nextPage = j?.meta?.next_page;
    const totalPages = j?.meta?.total_pages;
    const curr = j?.meta?.current_page ?? page;

    if (!nextPage && (!totalPages || curr >= totalPages)) break;
    page = nextPage || curr + 1;
  }

  return out;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const playerId = Number(body?.playerId);
    const teammateId = Number(body?.teammateId);
    const season = Number(body?.season);
    const maxMinutes = Math.max(0, Number(body?.maxMinutes ?? 1));

    if (!playerId || !teammateId || !season) {
      return NextResponse.json(
        { ok: false, error: "Missing playerId, teammateId, or season." },
        { status: 400 }
      );
    }

    // 1) Get ALL teammate game stats for the season
    const teamQs = new URLSearchParams();
    teamQs.append("player_ids[]", String(teammateId));
    teamQs.append("seasons[]", String(season));
    teamQs.set("per_page", "100");

    const teammateStats = await fetchAllStats(teamQs);

    // 2) Games where teammate minutes <= threshold (including DNP/null)
    const outGameIdsSet = new Set<number>();
    for (const s of teammateStats) {
      const gid = Number(s?.game?.id);
      if (!gid) continue;
      const m = minutesStrToFloat(s?.min);
      if (m <= maxMinutes) outGameIdsSet.add(gid);
    }

    // If teammate never played this season (or every row is null), we may still have an empty set.
    const outGameIds = Array.from(outGameIdsSet);

    // 3) Map those gameIds to the target player's dates (so UI can intersect quickly)
    let outDates: string[] = [];
    if (outGameIds.length) {
      const CHUNK = 90;
      const dates: string[] = [];

      for (let i = 0; i < outGameIds.length; i += CHUNK) {
        const chunk = outGameIds.slice(i, i + CHUNK);

        const qs = new URLSearchParams();
        qs.append("player_ids[]", String(playerId));
        for (const gid of chunk) qs.append("game_ids[]", String(gid));
        qs.set("per_page", "100");

        const url = `${API_BASE}/stats?${qs.toString()}`;
        const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
        if (!res.ok) {
          // Don't hard fail here—return IDs at least.
          // eslint-disable-next-line no-continue
          continue;
        }
        const j = await res.json();
        const data: BdlStat[] = j?.data ?? [];
        for (const s of data) {
          const d = String(s?.game?.date || "").slice(0, 10);
          if (d) dates.push(d);
        }
      }
      outDates = Array.from(new Set(dates));
    }

    return NextResponse.json({
      ok: true,
      outGameIds,
      outDates,
      count: outGameIds.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
