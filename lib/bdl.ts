const BDL_BASE = "https://api.balldontlie.io/v1";

function authHeader(): string {
  const key = process.env.BDL_API_KEY || "";
  if (!key) return "";
  return key.startsWith("Bearer ") ? key : `Bearer ${key}`;
}

export async function bdlGetJson(path: string): Promise<any> {
  const url = path.startsWith("http") ? path : `${BDL_BASE}${path}`;
  const res = await fetch(url, { headers: { Authorization: authHeader() }, cache: "no-store", next: { revalidate: 0 } as any });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`BDL ${res.status}: ${t.slice(0,200)}`); }
  return res.json();
}

export function parseMinutes(minStr: string): number {
  if (!minStr) return 0;
  if (/^\d+(\.\d+)?$/.test(minStr)) return Number(minStr);
  const m = minStr.split(":").map(Number);
  if (m.length === 2 && Number.isFinite(m[0]) && Number.isFinite(m[1])) return m[0] + m[1]/60;
  return 0;
}
export function toNum(x: any): number {
  const n = typeof x === "number" ? x : Number.parseFloat(String(x ?? ""));
  return Number.isFinite(n) ? n : 0;
}
const TEAM_CODE: Record<number, string> = {
  1: "ATL", 2: "BOS", 3: "BKN", 4: "CHA", 5: "CHI", 6: "CLE",
  7: "DAL", 8: "DEN", 9: "DET", 10: "GSW", 11: "HOU", 12: "IND",
  13: "LAC", 14: "LAL", 15: "MEM", 16: "MIA", 17: "MIL", 18: "MIN",
  19: "NOP", 20: "NYK", 21: "OKC", 22: "ORL", 23: "PHI", 24: "PHX",
  25: "POR", 26: "SAC", 27: "SAS", 28: "TOR", 29: "UTA", 30: "WAS",
};
export function teamAbbrevFromId(id: number | null | undefined): string {
  if (!id) return "";
  return TEAM_CODE[id] || "";
}