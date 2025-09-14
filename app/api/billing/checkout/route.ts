// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, getPriceId, type PlanKey } from "@/lib/stripe";
// If you want to attach email/customer, wire up your session util here:
// import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const plan = (url.searchParams.get("plan") || "monthly") as PlanKey;

    const origin = req.nextUrl.origin;
    const returnUrl = url.searchParams.get("return_url") || `${origin}/account`;

    const price = getPriceId(plan);

    // const session = await auth();
    // const customer_email = session?.user?.email ?? undefined;

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      // customer_email,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/api/stripe/verify?session_id={CHECKOUT_SESSION_ID}&return_url=${encodeURIComponent(
        returnUrl
      )}`,
      cancel_url: returnUrl,
      metadata: { plan },
    });

    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (err: any) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Checkout failed" },
      { status: 500 }
    );
  }
}
