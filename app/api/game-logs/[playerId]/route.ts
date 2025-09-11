import { NextRequest, NextResponse } from "next/server";
import { GET as RootGET } from "../route";

// Delegate to the same logic but read playerId from the dynamic segment.
export async function GET(req: NextRequest, ctx: { params: { playerId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const season = searchParams.get("season");
    const stat = searchParams.get("stat");
    const lastX = searchParams.get("lastX");
    const min = searchParams.get("min");
    const ha = searchParams.get("ha");
    const opp = searchParams.get("opp");
    const rest = searchParams.get("rest");

    const url = new URL(req.url);
    url.searchParams.set("playerId", ctx.params.playerId);
    if (season) url.searchParams.set("season", season);
    if (stat) url.searchParams.set("stat", stat);
    if (lastX !== null && lastX !== undefined) url.searchParams.set("lastX", String(lastX));
    if (min !== null && min !== undefined) url.searchParams.set("min", String(min));
    if (ha) url.searchParams.set("ha", ha);
    if (opp) url.searchParams.set("opp", opp);
    if (rest) url.searchParams.set("rest", rest);

    // Rebuild a NextRequest pointing at the root handler
    const proxied = new Request(url.toString(), { headers: req.headers, method: "GET" }) as any;
    return await (RootGET as any)(proxied);
  } catch (e: any) {
    console.error("[/api/game-logs/:id GET] error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
