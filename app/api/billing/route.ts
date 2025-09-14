import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
if (!stripeSecret) {
  console.warn("[/api/billing] Missing STRIPE_SECRET_KEY/STRIPE_SECRET");
}

// Use the API version your installed SDK expects, or omit apiVersion entirely
const stripe = new Stripe(stripeSecret || "", { apiVersion: "2023-10-16" });

function resolvePriceId(kind: string): string | null {
  switch (kind) {
    case "season":
      return process.env.STRIPE_PRICE_SEASON || null;
    case "monthly":
      return process.env.STRIPE_PRICE_MONTH || null;
    case "week":
      return process.env.STRIPE_PRICE_WEEK || null;
    case "day":
      return process.env.STRIPE_PRICE_DAY || null;
    default:
      return null;
  }
}

function appBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    new URL(req.url).origin
  );
}

export async function POST(req: Request) {
  try {
    const session = await auth?.();
    const email = session?.user?.email;
    const userId = (session?.user as any)?.id || null;

    if (!email) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      kind?: "season" | "monthly" | "week" | "day";
    };
    const kind = body.kind || "season";

    const priceId = resolvePriceId(kind);
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for "${kind}". Set STRIPE_PRICE_${kind.toUpperCase()}.` },
        { status: 400 }
      );
    }

    if (!stripeSecret) {
      return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
    }

    const base = appBaseUrl(req);

    const price = await stripe.prices.retrieve(priceId);
    const isRecurring = Boolean(price.recurring);

    const checkout = await stripe.checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/account/plan?success=1`,
      cancel_url: `${base}/account/plan?canceled=1`,
      customer_email: email,
      allow_promotion_codes: true,
      metadata: {
        kind,
        userId: userId ? String(userId) : "",
        app: "juicedstats",
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (e: any) {
    console.error("[/api/billing] error:", e);
    const msg =
      typeof e?.message === "string"
        ? e.message
        : "Unexpected error creating checkout session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
