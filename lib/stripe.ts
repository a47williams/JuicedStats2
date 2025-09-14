// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

// Single Pro subscription price ID (Stripe Dashboard → Price ID)
// Make sure this is set in your env (Vercel / .env.local)
export const STRIPE_PRICE_ID =
  process.env.STRIPE_PRICE_ID ??
  process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? // fallback if you accidentally used public var
  "";
