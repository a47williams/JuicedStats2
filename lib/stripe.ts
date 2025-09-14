// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Public/base URL for redirects (prod & preview & local)
export const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export type Plan = "day" | "week" | "monthly" | "season";

const PRICES: Record<Plan, string | undefined> = {
  day: process.env.STRIPE_PRICE_DAY,
  week: process.env.STRIPE_PRICE_WEEK,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  season: process.env.STRIPE_PRICE_SEASON,
};

export function priceForPlan(input?: string): { id: string; plan: Plan } {
  const plan = (input?.toLowerCase() as Plan) || "monthly";
  const id = PRICES[plan];
  if (!id) {
    const missing = Object.entries(PRICES)
      .filter(([, v]) => !v)
      .map(([k]) => k)
      .join(", ");
    throw new Error(
      `Missing Stripe price env for plan "${plan}". Ensure STRIPE_PRICE_DAY/WEEK/MONTHLY/SEASON are set. Missing: ${missing || "none"}`
    );
  }
  return { id, plan };
}
