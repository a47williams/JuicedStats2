// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICES = {
  season: process.env.STRIPE_PRICE_SEASON!,
  monthly: process.env.STRIPE_PRICE_MONTHLY!, // optional
  week: process.env.STRIPE_PRICE_WEEK!,       // optional
  day: process.env.STRIPE_PRICE_DAY!,         // optional
};

export async function GET(req: NextRequest) {
  try {
    // Read session; if cookies are stale, treat as unauthenticated (don’t throw HTML)
    let session = null as Awaited<ReturnType<typeof auth>> | null;
    try {
      session = await auth();
    } catch {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }
    const email = session?.user?.email;
    if (!email) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plan = (searchParams.get("plan") ?? "season") as keyof typeof PRICES;
    const price = PRICES[plan];
    if (!price) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });

    const success_url = `${process.env.NEXTAUTH_URL}/account?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${process.env.NEXTAUTH_URL}/account?checkout=cancel`;

    const checkout = await stripe.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      customer_email: email,
      line_items: [{ price, quantity: 1 }],
      success_url,
      cancel_url,
      // 👇 This enables the “Add promotion code” box on the Checkout page
      allow_promotion_codes: true,
      // We’re not auto-applying any discount; users type their code on Checkout.
      discounts: [],
      metadata: { plan },
    });

    return NextResponse.json({ url: checkout.url }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/billing/checkout] error", err?.message || err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
