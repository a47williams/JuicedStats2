// lib/teammate.ts
export type BdlLikeStat = {
  game: { id: number };
  player?: { id?: number };
};

type TeammateFilterOptions = {
  playerId: number;          // Player A
  teammateId?: number | null;
  maxMinutes?: number;       // default 0
  endpoint?: string;         // override for tests
};

export async function filterStatsByTeammateOut<T extends BdlLikeStat>(
  stats: T[],
  { playerId, teammateId, maxMinutes = 0, endpoint = "/api/game-logs/teammate-out" }: TeammateFilterOptions
): Promise<T[]> {
  if (!teammateId) return stats;
  if (stats.length === 0) return stats;

  const gameIds = stats.map((s) => s.game.id);
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, teammateId, maxMinutes, gameIds }),
  });

  if (!r.ok) {
    // If the helper fails, don’t break the page—just return original stats.
    return stats;
  }

  const { outGameIds } = (await r.json()) as { outGameIds: number[] };
  const keep = new Set(outGameIds);
  return stats.filter((s) => keep.has(s.game.id));
}
