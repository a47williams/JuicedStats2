// lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export type PlanKey = "day" | "week" | "monthly" | "season";

export function getPriceId(plan: PlanKey): string {
  const priceByPlan: Record<PlanKey, string | undefined> = {
    day: process.env.STRIPE_PRICE_DAY,
    week: process.env.STRIPE_PRICE_WEEK,
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    season: process.env.STRIPE_PRICE_SEASON,
  };

  const price = priceByPlan[plan];
  if (!price) {
    const envName = `STRIPE_PRICE_${plan.toUpperCase()}`;
    throw new Error(`Missing ${envName} in environment`);
  }
  return price;
}
