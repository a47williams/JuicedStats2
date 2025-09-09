// app/api/game-logs/players/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PlayerHit = {
  id: number;
  name: string;
  teamTri: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreName(candidate: string, query: string): number {
  const q = norm(query);
  const c = norm(candidate);
  if (!q || !c) return 0;

  const qTokens = q.split(" ");
  const cTokens = c.split(" ");
  let s = 0;

  if (q === c) s += 3; // exact match bonus

  for (const qt of qTokens) {
    if (!qt) continue;
    if (c.includes(` ${qt} `) || c.startsWith(qt + " ") || c.endsWith(" " + qt)) s += 1;
    if (cTokens.some((t) => t.startsWith(qt))) s += 1;
  }
  return s;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ players: [] });

  try {
    const url = `https://api.balldontlie.io/v1/players?search=${encodeURIComponent(q)}&per_page=100`;
    const res = await fetch(url, {
      headers: { Authorization: process.env.BDL_API_KEY || "" },
      cache: "no-store",
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json(
        { players: [], error: `bdl:${res.status}:${t.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const json = (await res.json()) as { data?: any[] };
    const rows = Array.isArray(json?.data) ? json.data : [];

    const hits: PlayerHit[] = rows.map((r: any): PlayerHit => ({
      id: Number(r?.id),
      name: [r?.first_name, r?.last_name].filter(Boolean).join(" "),
      teamTri: String(r?.team?.abbreviation || ""),
    }));

    hits.sort((a: PlayerHit, b: PlayerHit) => scoreName(b.name, q) - scoreName(a.name, q));

    return NextResponse.json({ players: hits });
  } catch (err: any) {
    return NextResponse.json(
      { players: [], error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
