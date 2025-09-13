// app/api/billing/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map friendly plan -> expected env var name that holds the Price ID
const PRICE_ENV_BY_PLAN: Record<string, string> = {
  season: "STRIPE_PRICE_SEASON",
  month:  "STRIPE_PRICE_MONTH",
  week:   "STRIPE_PRICE_WEEK",
  day:    "STRIPE_PRICE_DAY",
};

// Create the checkout session (shared by GET and POST)
async function createSession(req: Request, planIn?: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Plan from request (POST body, or GET ?plan=), default to "season"
  let plan = (planIn || "season").toLowerCase();
  if (!PRICE_ENV_BY_PLAN[plan]) plan = "season";

  const priceId = process.env[PRICE_ENV_BY_PLAN[plan]];
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || !priceId) {
    return NextResponse.json(
      { ok: false, error: "Stripe configuration missing (price or secret key)." },
      { status: 500 }
    );
  }

  // Use default API version from the SDK to avoid TS apiVersion type mismatches
  const stripe = new Stripe(secretKey);

  // Derive origin for success/cancel URLs
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin;

  try {
    const cs = await stripe.checkout.sessions.create({
      // Season pass is typically a one-time payment; switch to "subscription" if yours is recurring
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${origin}/account/plan?checkout=success`,
      cancel_url: `${origin}/account/plan?checkout=cancel`,
      metadata: { plan, email },
    });

    if (!cs.url) {
      return NextResponse.json({ ok: false, error: "No checkout URL returned." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: cs.url });
  } catch (e: any) {
    const msg = e?.message || "Unexpected error creating checkout session";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// POST /api/billing/checkout  (returns JSON { url })
export async function POST(req: Request) {
  let plan: string | undefined;
  try {
    const body = await req.json().catch(() => null);
    plan = body?.plan as string | undefined;
  } catch {
    /* ignore body parse errors */
  }
  return createSession(req, plan);
}

// GET /api/billing/checkout?plan=season  (redirects to Stripe)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") || undefined;

  const json = await createSession(req, plan);
  const data = await json.json();
  if (json.ok && data?.url) {
    // 303 so the browser follows with GET
    return NextResponse.redirect(data.url as string, { status: 303 });
  }
  return json; // bubble up the JSON error
}
