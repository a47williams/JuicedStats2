// lib/flags.ts
export type Plan = "FREE" | "PRO";

// Feature toggle: Pro is enabled only when plan is PRO
export function proFeaturesEnabled(plan: Plan): boolean {
  return plan === "PRO";
}

// (Optional) Keep any other helpers you had, but make sure they accept/return Plan.
