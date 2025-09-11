// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Base app URL (server-safe)
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Centralize product/discount ids from env
export const PRICES = {
  SEASON: process.env.STRIPE_PRICE_SEASON || "",
};

export const COUPONS = {
  EARLY_BIRD_PERCENT_25: process.env.STRIPE_COUPON_EARLY_BIRD || "",
};

// Optional early-bird window end (ISO string in env)
export const EARLY_BIRD_END = process.env.EARLY_BIRD_END
  ? new Date(process.env.EARLY_BIRD_END)
  : null;
