import { NextRequest, NextResponse } from "next/server";
import { bdlGetJson, parseMinutes, toNum, teamAbbrevFromId } from "@/lib/bdl";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const playerId: number = Number(body.playerId);
    const season = Number(body.season || 2024);
    const postseason = Boolean(body.postseason);
    const includeZeroMin = Boolean(body.includeZeroMin);
    const oppFilter = (body.opponent || "").trim().toUpperCase();
    const haFilter = (body.homeAway || "").trim().toUpperCase();
    const lastX = body.lastX ? Number(body.lastX) : null;
    const startDate = (body.startDate || "").trim();
    const endDate = (body.endDate || "").trim();
    if(!Number.isFinite(playerId)) return NextResponse.json({ ok:false, error:"Missing playerId" }, { status:400 });
    const rows:any[]=[]; let cursor:string|null=null;
    for(let guard=0; guard<200; guard++){
      const params = [`player_ids[]=${encodeURIComponent(String(playerId))}`, `seasons[]=${encodeURIComponent(String(season))}`, `postseason=${postseason?'true':'false'}`, `per_page=100`];
      if(cursor!==null) params.push(`cursor=${encodeURIComponent(cursor)}`);
      const json = await bdlGetJson(`/stats?${params.join("&")}`);
      const data = Array.isArray(json?.data)?json.data:[]; if(!data.length) break;
      for(const s of data){
        const g=s.game||{}; const team=s.team||{};
        const homeId=g.home_team_id, awayId=g.visitor_team_id, playerTeamId=team.id;
        const isHome = playerTeamId===homeId; const oppId = isHome?awayId:homeId;
        const minStr = s.min || "";
        if(!includeZeroMin){ const m=parseMinutes(minStr); if(!m) continue; }
        const date = g.date? String(g.date).slice(0,10):"";
        if(startDate && date && date<startDate) continue;
        if(endDate && date && date>endDate) continue;
        const oppAbbr = teamAbbrevFromId(Number(oppId));
        const ha = isHome ? "H" : "A";
        if(oppFilter && oppAbbr!==oppFilter) continue;
        if(haFilter && ha!==haFilter) continue;
        const homePts=Number(g.home_team_score||0), awayPts=Number(g.visitor_team_score||0);
        const teamPts=isHome?homePts:awayPts, oppPts=isHome?awayPts:homePts;
        const result = teamPts>oppPts?'W':teamPts<oppPts?'L':'T';
        rows.push({ date, opp:oppAbbr, ha, min:minStr, pts:toNum(s.pts), reb:toNum(s.reb), ast:toNum(s.ast), fg3m:toNum(s.fg3m), blk:toNum(s.blk), stl:toNum(s.stl), tov:toNum(s.turnover), team:team?.abbreviation||"", teamScore:teamPts, oppScore:oppPts, result });
      }
      const nextCursor = json?.meta?.next_cursor; if(nextCursor===null||nextCursor===undefined) break; cursor=String(nextCursor);
    }
    rows.sort((a,b)=> (a.date<b.date?-1:a.date>b.date?1:0)); const trimmed=(lastX&&lastX>0)?rows.slice(-lastX):rows;
    return NextResponse.json({ ok:true, rows:trimmed, meta:{ source:"balldontlie", next_cursor:null } });
  }catch(e:any){ return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 }); }
}