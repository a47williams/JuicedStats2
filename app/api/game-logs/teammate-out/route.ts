import { NextRequest, NextResponse } from "next/server";

// Use the new host. Optional API key support.
const BDL_BASE = process.env.BDL_BASE || "https://api.balldontlie.io/v1";
const BDL_KEY = process.env.BDL_KEY || "";
const AUTH = BDL_KEY ? (BDL_KEY.startsWith("Bearer ") ? BDL_KEY : `Bearer ${BDL_KEY}`) : "";
const BDL_HEADERS: HeadersInit = AUTH ? { Authorization: AUTH } : {};

function parseMinutes(minStr: string | null | undefined): number {
  if (!minStr) return 0;
  // "34:12" or "28" → minutes as float (approx)
  if (minStr.includes(":")) {
    const [m, s] = minStr.split(":").map((x) => Number(x) || 0);
    return m + s / 60;
  }
  return Number(minStr) || 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const teammateId = Number(body?.teammateId);
    const season = Number(body?.season);
    const maxMinutes = Number(body?.maxMinutes) || 0;

    if (!teammateId || !season) {
      return NextResponse.json({ ok: false, error: "Missing teammateId or season" }, { status: 400 });
    }

    const outGameIds: number[] = [];
    const outDates: string[] = [];

    // Paginate through all stat lines for that teammate & season
    let page = 1;
    for (;;) {
      const qs = new URLSearchParams();
      qs.append("player_ids[]", String(teammateId));
      qs.append("seasons[]", String(season));
      qs.set("per_page", "100");
      qs.set("page", String(page));

      const url = `${BDL_BASE}/stats?${qs.toString()}`;
      const r = await fetch(url, { headers: BDL_HEADERS, cache: "no-store" });

      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        return NextResponse.json(
          { ok: false, error: `BDL ${r.status} for ${url}${msg ? ` :: ${msg}` : ""}` },
          { status: 502 }
        );
      }

      const j = await r.json();
      const data: any[] = j?.data ?? [];
      for (const s of data) {
        const mins = parseMinutes(s?.min ?? s?.minutes);
        if (mins <= maxMinutes) {
          const gid = Number(s?.game?.id);
          const date = String(s?.game?.date || "").slice(0, 10);
          if (Number.isFinite(gid)) outGameIds.push(gid);
          if (date) outDates.push(date);
        }
      }

      const meta = j?.meta;
      const totalPages = Number(meta?.total_pages || meta?.totalPages || 1);
      if (!data.length || page >= totalPages) break;
      page++;
    }

    return NextResponse.json({
      ok: true,
      outGameIds: Array.from(new Set(outGameIds)),
      outDates: Array.from(new Set(outDates)),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
