// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth"; // ✅ NextAuth v5 helper
import { stripe } from "@/lib/stripe"; // make sure this exports a configured Stripe client

// Where to send users back after Stripe
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.AUTH_URL ||
  "http://localhost:3000";

// Price ID for the Season pass (configure in Vercel env)
const PRICE_SEASON =
  process.env.STRIPE_PRICE_SEASON || // preferred
  process.env.STRIPE_PRICE_SEASON_PASS || // optional alias
  process.env.STRIPE_PRICE || // last-ditch fallback if you only have one price
  "";

export async function POST(req: Request) {
  try {
    // Must be signed in
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple body – { plan: "season" }
    const { plan } = (await req.json().catch(() => ({}))) as {
      plan?: string;
    };
    if (plan !== "season") {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    if (!PRICE_SEASON) {
      return NextResponse.json(
        { error: "Server misconfigured: missing STRIPE_PRICE_SEASON" },
        { status: 500 }
      );
    }

    // One-time season pass purchase. If you sell subscriptions, switch to mode: "subscription"
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_SEASON, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      metadata: {
        plan: "season",
        userEmail: email,
      },
      success_url: `${APP_URL}/account/plan?status=success`,
      cancel_url: `${APP_URL}/account/plan?status=cancelled`,
    });

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (e: any) {
    const msg =
      e?.message || e?.error?.message || "Unexpected error creating checkout session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Optional: explicitly reject GET so stray links don't hit this endpoint
export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
