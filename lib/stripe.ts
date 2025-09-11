// lib/stripe.ts
import Stripe from "stripe";

/**
 * Use your account’s default Stripe API version in production.
 * If you really need to pin, set STRIPE_API_VERSION (e.g. "2024-06-20").
 */
const apiVersion = process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion, // undefined = use account default (recommended)
});

// Base app URL used in server routes (success/cancel, portal return, etc)
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Handy flag when you want to branch on live vs test
export const IS_LIVE = !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_");

/**
 * Centralized price IDs — fill these with **LIVE** price IDs on Vercel.
 * Only SEASON is required today; MONTHLY/WEEK/DAY are optional.
 */
export const PRICES = {
  SEASON: process.env.STRIPE_PRICE_SEASON || "",
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY || "",
  WEEK: process.env.STRIPE_PRICE_WEEK || "",
  DAY: process.env.STRIPE_PRICE_DAY || "",
} as const;

/**
 * Promotion config. We show a code on the site and let users type it at Checkout.
 * If you ever want to auto-apply: set COUPON_ID and add `discounts: [{ coupon: COUPON_ID }]`
 * in the Checkout params.
 */
export const PROMO = {
  CODE: process.env.EARLY_BIRD_CODE || "EARLYBIRD25", // user types this at checkout
  COUPON_ID: process.env.STRIPE_COUPON_EARLY_BIRD || "", // optional auto-apply path
  ENDS_AT: process.env.EARLY_BIRD_END ? new Date(process.env.EARLY_BIRD_END) : null,
} as const;

/** Guard to ensure required price IDs are present */
export function getPriceIdOrThrow(plan: keyof typeof PRICES): string {
  const id = PRICES[plan];
  if (!id) throw new Error(`Missing Stripe price ID for ${plan}. Set STRIPE_PRICE_${plan} in env.`);
  return id;
}

/** Reusable helper: find or create a Stripe Customer for an email */
export async function getOrCreateCustomerByEmail(email: string, name?: string) {
  const list = await stripe.customers.list({ email, limit: 1 });
  if (list.data.length) return list.data[0];
  return stripe.customers.create({ email, name });
}
