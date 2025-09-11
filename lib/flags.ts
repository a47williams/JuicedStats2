// lib/flags.ts
export type Plan = "FREE" | "SEASON" | "MONTHLY";

/** Beta window: Pro features are open to everyone until BETA_END. */
export function isBetaOpen(): boolean {
  const raw = process.env.BETA_END;
  if (!raw) return false;
  const end = new Date(raw);
  if (isNaN(end.getTime())) return false;
  return Date.now() < end.getTime();
}

/** Is the user allowed to USE Pro features right now? */
export function proFeaturesEnabled(plan: Plan): boolean {
  // During beta: open for all. After beta: Pro only.
  return isBetaOpen() || plan !== "FREE";
}

/** Should UI show locks? (only after beta ends AND plan is FREE) */
export function shouldLockForFree(plan: Plan): boolean {
  return !isBetaOpen() && plan === "FREE";
}
